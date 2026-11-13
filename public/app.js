// shared helpers for all Perfect Cell pages
async function api(path, opts = {}) {
  const res = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...opts,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

function el(id) { return document.getElementById(id); }
function esc(s) { const d = document.createElement("div"); d.textContent = s ?? ""; return d.innerHTML; }

const PRETTY = {
  coding: "Coding", dsa: "DSA", webDev: "Web Dev", dbms: "Databases", cloud: "Cloud",
  communication: "Communication", aptitude: "Aptitude", teamwork: "Teamwork",
};
function pretty(k) { return PRETTY[k] || k; }

function skillRow(name, val, max = 10) {
  const cls = val / max >= 0.7 ? "hi" : val / max >= 0.5 ? "mid" : "lo";
  return `<div class="skill-row">
    <div class="name">${name}</div>
    <div class="bar"><div class="${cls}" style="width:${(val / max) * 100}%"></div></div>
    <div class="val">${val}</div>
  </div>`;
}

function stat(label, value, sub, accent) {
  return `<div class="stat ${accent ? "accent" : ""}">
    <div class="label">${label}</div>
    <div class="value">${value}</div>
    <div class="sub">${sub}</div>
  </div>`;
}
