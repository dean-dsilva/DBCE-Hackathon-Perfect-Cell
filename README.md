# Perfect Cell — AI Placement Accelerator & Skills Intelligence

A college placement-cell platform: dashboard, student skill profiles, company
job postings, and **Gemini AI** that ranks the best candidates for any job
(with reasons) and analyzes each student's skills from their real achievements.

Built for the DBCE Hackathon.

## Quick start

```bash
git clone https://github.com/dean-dsilva/DBCE-Hackathon-Perfect-Cell.git
cd DBCE-Hackathon-Perfect-Cell
```

1. Get a free Gemini API key: https://aistudio.google.com → **Get API key** (2 minutes)
2. Copy the env template and add your key:
   ```bash
   cp .env.example .env
   # now edit .env and paste your key after GEMINI_API_KEY=
   ```
3. Run (needs Node.js 18+, zero npm installs):
   ```bash
   node server.js
   ```
4. Open **http://localhost:3000**

**Windows:** after step 2, just double-click `start.bat` (it even checks Node
is installed for you).

## What it does

- **Dashboard** — batch stats, average skill bars, branch distribution, top candidates.
- **Students** — searchable/filterable profiles; one click runs a **Gemini skill
  analysis**: AI-estimated skill levels, readiness score /100, strengths, gaps,
  recommendations, and suggested roles — all judged from real achievements.
- **Companies** — 8 demo job postings; **Find Best Candidates** ranks the top 10
  students with match %, verdict, matched skills, gaps and human-readable reasons.
  You can also **paste any custom job description** and match against it.

## How it works

| Piece | What it is |
|---|---|
| `server.js` | Zero-dependency Node server (no npm install). Serves the site, holds the key, calls Gemini with **retry + model fallback + hard timeouts** |
| `data/students.json` | 28 demo students + 8 demo companies — edit freely, same JSON shape |
| `data/ai-cache.json` | Saved AI results (created on first use). Same request = instant answer, survives restarts |
| `public/` | Plain HTML/CSS/JS dark dashboard, no frameworks |
| `.env` | Your API key — never committed (see `.gitignore`), never sent to the browser |

## Notes for presenters

- First AI call per item takes ~10–40 s (Gemini reads every profile); after that
  it's instant from cache. Delete `data/ai-cache.json` to clear the cache.
- If Google is busy (503 spikes) the server auto-retries and falls back across
  `gemini-3.5-flash → gemini-3.8-flash → gemini-3.1-flash-lite`.
- To use your own data, edit `data/students.json` and restart.
