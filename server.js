// Perfect Cell — zero-dependency Node server
// Serves the website from /public and talks to Gemini on behalf of the browser.
// The API key never leaves this file's process (loaded from .env).

const http = require("http");
const fs = require("fs");
const path = require("path");

// ---------- config ----------
const ROOT = __dirname;
const PUBLIC = path.join(ROOT, "public");
const DATA = path.join(ROOT, "data");
const CACHE_FILE = path.join(DATA, "ai-cache.json");

// load .env manually (no dotenv dependency needed)
const env = {};
for (const line of fs.readFileSync(path.join(ROOT, ".env"), "utf8").split("\n")) {
  const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.+)\s*$/);
  if (m) env[m[1]] = m[2].trim();
}
const API_KEY = process.env.GEMINI_API_KEY || env.GEMINI_API_KEY;
const PORT = Number(process.env.PORT || env.PORT || 3000);
if (!API_KEY) { console.error("FATAL: GEMINI_API_KEY missing in .env"); process.exit(1); }

// models to try, in order (fallback chain)
const MODELS = ["gemini-3.5-flash", "gemini-3.8-flash", "gemini-3.1-flash-lite"];
const GEMINI_URL = (model) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

// ---------- data ----------
const db = JSON.parse(fs.readFileSync(path.join(DATA, "students.json"), "utf8"));
const students = db.students;
const companies = db.companies;
const byId = Object.fromEntries(students.map((s) => [s.id, s]));

// ---------- AI cache (survives restarts) ----------
let cache = {};
try { cache = JSON.parse(fs.readFileSync(CACHE_FILE, "utf8")); } catch {}
function cacheSave() {
  try { fs.writeFileSync(CACHE_FILE, JSON.stringify(cache)); } catch (e) { console.error("cache save failed", e.message); }
}

// ---------- Gemini helper (with retry + model fallback) ----------
async function geminiJSON(prompt, { cacheKey, maxOutputTokens = 4096 } = {}) {
  if (cacheKey && cache[cacheKey]) return { ...cache[cacheKey], cached: true };

  const body = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      responseMimeType: "application/json",
      maxOutputTokens,
    },
  };

  const delays = [0, 5000];
  let lastErr = "";
  for (const model of MODELS) {
    for (const wait of delays) {
      if (wait) await new Promise((r) => setTimeout(r, wait));
      try {
        const res = await fetch(GEMINI_URL(model), {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-goog-api-key": API_KEY },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(45000), // hard cap per attempt: fail fast, try next
        });
        if (res.status === 429 || res.status >= 500) { lastErr = `HTTP ${res.status}`; continue; }
        if (!res.ok) {
          const t = await res.text();
          throw new Error(`Gemini HTTP ${res.status}: ${t.slice(0, 300)}`);
        }
        const data = await res.json();
        const text = data?.candidates?.[0]?.content?.parts?.map((p) => p.text || "").join("") || "";
        let parsed;
        try { parsed = JSON.parse(text); }
        catch { const m = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/); if (!m) throw new Error("Gemini returned non-JSON"); parsed = JSON.parse(m[0]); }
        if (cacheKey) { cache[cacheKey] = parsed; cacheSave(); }
        return parsed;
      } catch (e) {
        console.error(`[gemini] ${model} attempt failed: ${e.message}`);
        if (String(e.message).startsWith("Gemini HTTP")) throw e; // auth/bad request: don't retry
        lastErr = e.message;
      }
    }
  }
  throw new Error(`Gemini unavailable after retries (${lastErr})`);
}

// ---------- prompts ----------
const SKILL_KEYS = ["coding", "dsa", "webDev", "dbms", "cloud", "communication", "aptitude", "teamwork"];

function studentCompact(s) {
  return {
    id: s.id, name: s.name, branch: s.branch, year: s.year, cgpa: s.cgpa,
    skills: s.skills, achievements: s.achievements,
  };
}

function buildAnalysisPrompt(s) {
  return `You are a placement-cell skill analyst at an Indian engineering college.
Analyze this student's profile and return ONLY a JSON object, no markdown.

STUDENT PROFILE:
${JSON.stringify(studentCompact(s), null, 2)}

Skill keys and what they measure:
coding=programming proficiency, dsa=data structures & algorithms, webDev=web/full-stack,
dbms=databases & SQL, cloud=cloud/devops exposure, communication=spoken/written skills,
aptitude=quant & logical reasoning, teamwork=collaboration/leadership.

Return JSON with EXACTLY this shape:
{
  "skillLevels": { ${SKILL_KEYS.map((k) => `"${k}": <0-10 int>`).join(", ")} },
  "readinessScore": <0-100 int, overall placement readiness>,
  "verdict": "<one crisp line, e.g. 'Strong hire for product companies' or 'Needs DSA practice before serious drives'>",
  "strengths": ["<2-4 short bullets citing specific achievements>"],
  "gaps": ["<2-3 short bullets, be honest about weaknesses>"],
  "recommendations": ["<2-4 concrete next actions, e.g. 'Solve 100 more DP problems on LeetCode'>"],
  "suggestedRoles": ["<3 role types that fit, e.g. 'Backend Engineer', 'Data Analyst'>"]
}
Judge holistically from the achievements, not just the numbers. Be specific and honest.`;
}

function buildMatchPrompt(job, customText) {
  const eligible = students
    .filter((s) => (job ? job.eligibleBranches.includes(s.branch) : true))
    .map(studentCompact);
  const jobInfo = job
    ? `COMPANY: ${job.name}\nROLE: ${job.role}\nPACKAGE: ${job.package}\nLOCATION: ${job.location}\nMIN CGPA: ${job.minCGPA}\nELIGIBLE BRANCHES: ${job.eligibleBranches.join(", ")}\nKEY SKILLS WANTED: ${job.requiredSkills.join(", ")}\nDESCRIPTION: ${job.description}`
    : `CUSTOM JOB POSTING (pasted by placement officer):\n${customText}`;
  return `You are an AI placement officer. Rank the best candidates for this job from the student pool below.

JOB:
${jobInfo}

STUDENT POOL (${eligible.length} students, all eligible by branch):
${JSON.stringify(eligible)}

Rules:
- Consider required skills, CGPA cutoff, and judge students HOLISTICALLY from their achievements (a student with real internship + hackathon experience may beat a higher-CGPA student without them).
- Respect the min CGPA cutoff strictly (a student below it cannot be "Strong fit").
- Return ONLY JSON, no markdown, exactly:
{
  "results": [
    {
      "studentId": "<id>",
      "matchScore": <0-100 int>,
      "verdict": "<'Strong fit' | 'Good fit' | 'Moderate fit' | 'Weak fit'>",
      "matchedSkills": ["<skill names the student has that the job wants>"],
      "gaps": ["<short skill/experience gaps vs this job>"],
      "reason": "<1-2 sentence human explanation citing specific achievements>"
    }
  ]
}
- Return the TOP 10 students, best first, sorted by matchScore descending.`;
}

// ---------- stats for dashboard ----------
function computeStats() {
  const avg = (o) => SKILL_KEYS.reduce((a, k) => a + o.skills[k], 0) / SKILL_KEYS.length;
  const scored = students.map((s) => ({ ...s, avgSkill: +avg(s).toFixed(2) }));
  const avgSkill = scored.reduce((a, s) => a + s.avgSkill, 0) / scored.length;
  const branchDist = {};
  for (const s of students) branchDist[s.branch] = (branchDist[s.branch] || 0) + 1;
  const skillAvg = {};
  for (const k of SKILL_KEYS) skillAvg[k] = +(students.reduce((a, s) => a + s.skills[k], 0) / students.length).toFixed(1);
  return {
    totalStudents: students.length,
    totalCompanies: companies.length,
    placementReady: scored.filter((s) => s.avgSkill >= 7.5).length,
    avgSkill: +avgSkill.toFixed(2),
    topStudents: [...scored].sort((a, b) => b.avgSkill - a.avgSkill).slice(0, 5)
      .map((s) => ({ id: s.id, name: s.name, branch: s.branch, cgpa: s.cgpa, avgSkill: s.avgSkill })),
    branchDist, skillAvg,
  };
}

// ---------- static file serving ----------
const MIME = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png" };
function serve(res, file) {
  fs.readFile(file, (err, buf) => {
    if (err) { res.writeHead(404); res.end("Not found"); return; }
    res.writeHead(200, { "Content-Type": MIME[path.extname(file)] || "text/plain" });
    res.end(buf);
  });
}

// ---------- server ----------
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://x");
  const p = url.pathname;
  const send = (code, obj) => { res.writeHead(code, { "Content-Type": "application/json" }); res.end(JSON.stringify(obj)); };

  try {
    if (p === "/api/stats") return send(200, computeStats());
    if (p === "/api/students") return send(200, students);
    if (p === "/api/companies") return send(200, companies);

    if (p.startsWith("/api/ai/analyze-student")) {
      const id = url.searchParams.get("id");
      const s = byId[id];
      if (!s) return send(404, { error: "Unknown student id" });
      try { return send(200, await geminiJSON(buildAnalysisPrompt(s), { cacheKey: `analyze:${id}` })); }
      catch (e) { console.error(e.message); return send(502, { error: e.message }); }
    }

    if (p === "/api/ai/match" && req.method === "POST") {
      let raw = "";
      for await (const ch of req) raw += ch;
      let body = {};
      try { body = JSON.parse(raw || "{}"); } catch {}
      const job = body.companyId ? companies.find((c) => c.id === body.companyId) : null;
      if (body.companyId && !job) return send(404, { error: "Unknown company id" });
      if (!job && !body.jobText) return send(400, { error: "Send companyId or jobText" });
      const cacheKey = job ? `match:${job.id}` : `match:custom:${Buffer.from(body.jobText).toString("base64").slice(0, 60)}`;
      try { return send(200, await geminiJSON(buildMatchPrompt(job, body.jobText), { cacheKey, maxOutputTokens: 8192 })); }
      catch (e) { console.error(e.message); return send(502, { error: e.message }); }
    }

    // static files
    let file = p === "/" ? "/index.html" : p;
    file = path.normalize(file).replace(/^(\.\.[/\\])+/, "");
    serve(res, path.join(PUBLIC, file));
  } catch (e) {
    console.error(e);
    send(500, { error: "Server error" });
  }
});

server.listen(PORT, () => {
  console.log(`Perfect Cell running  ->  http://localhost:${PORT}`);
  console.log(`Students: ${students.length} | Companies: ${companies.length} | Cached AI results: ${Object.keys(cache).length}`);
});
