# Perfect Cell — AI Placement Accelerator & Skills Intelligence

A college placement-cell platform: a clean dashboard of student skill levels,
company job postings, and **Gemini AI** that automatically recommends the best
candidates for any job — with human-readable reasons — and analyzes each
student's skills from their real achievements.

## 👥 Team SSD

**Parul University, Goa** — competing at **Avinovate Hackathon, Don Bosco College of Engineering**

| Member | Role |
|---|---|
| **Swain Skylarr Fernandes** | Team Lead |
| Dean Desmond D'silva | Developer |
| Shravann Naik | Developer |

## 💡 The problem

College placement cells struggle to track student skills accurately and waste
hours manually matching students against company job postings. Perfect Cell
automates both: skills are visualized on a live dashboard, and an AI matches
every student profile against any job description in seconds — explaining
*why* each candidate fits or doesn't.

## ⚙️ How it functions

- **Dashboard** — batch-level stats (total students, placement-ready count,
  average skill levels, branch distribution) plus the top candidates table.
- **Students** — searchable, filterable student cards. Clicking a student opens
  their profile (skills, CGPA, achievements) and can trigger a **Gemini skill
  analysis**: the AI reads the student's actual achievements, estimates skill
  levels, gives a readiness score out of 100, and lists strengths, gaps,
  recommendations, and suggested roles.
- **Companies** — job postings with requirements (skills, min CGPA, branches).
  One click runs **AI candidate matching**: Gemini scores every eligible
  student against the posting and returns the top 10 with a match %, verdict
  (Strong / Good / Moderate fit), matched skills, gaps, and a reason citing
  specific achievements. Placement officers can also **paste any custom job
  description** and match the batch against it.
- **Smart results** — every AI result is cached to disk, so repeat views are
  instant and survive server restarts. The server auto-retries on Google
  traffic spikes and falls back across multiple Gemini models.

## 🛠️ What is used

- **Front-end** — plain HTML/CSS/JavaScript (no frameworks), dark dashboard theme
- **Back-end** — Node.js (zero npm dependencies; built-in `fetch`), one small server file
- **AI** — Google Gemini API (`gemini-3.5-flash` with fallbacks to
  `gemini-3.8-flash` / `gemini-3.1-flash-lite`), structured JSON output
- **Data** — local JSON files (28 demo students + 8 demo companies), editable without any database
- **Storage** — the Gemini key lives only in `.env` on the server, never in the browser

> **⏳ A note on speed:** the project currently runs on a **free-tier Gemini API
> key** because the paid tier is unaffordable for us at the moment. Free-tier
> keys are rate-limited, so the **first AI call per item takes ~10–40 seconds**
> (Gemini reads every student profile). Results are cached, so every view after
> that is instant. With a paid key the same calls would run noticeably faster.

## 🚀 Run it

1. Get a free Gemini API key: https://aistudio.google.com → **Get API key**
2. `cp .env.example .env`, then edit `.env` and paste your key
3. `node server.js` (needs Node.js 18+, no npm install needed)
4. Open **http://localhost:3000**

**Windows:** double-click `start.bat` (it checks Node is installed for you).

## 📁 Structure

```
Perfect-Cell/
├── server.js            # Node server: pages + Gemini API calls (retry, fallback, caching)
├── .env                 # Your API key (never committed)
├── .env.example         # Template to copy
├── data/students.json   # Demo students + companies (edit freely)
├── data/ai-cache.json   # Saved AI results (auto-created)
├── public/              # The website (index, students, companies, styles)
├── start.sh / start.bat # Launchers for Linux/macOS and Windows
└── README.md
```
