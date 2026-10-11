# footwork
Footwork is a mobile-first outdoor music studio that transforms a real walk or run into a polished instrumental song and an interactive Soundprint showing exactly how the person’s movement shaped the music.

## Development toolchain

These tools are set up in Phase 0. They support review, checks, diagrams, and write-ups. They are not part of the running application. The locked detail is in `Docs/HANDOFF_1.md`.

| Tool | Role |
|---|---|
| CodeRabbit | Code review on pull requests |
| Entire | Agent session sharing, linked to commits |
| DevRelay | DEV write-ups |
| GitHub Actions | Automated checks |
| Excalidraw | Architecture diagrams |

## Public experience

The application has two public pages. `/` is the landing page and the practice walk. `/studio` is the Soundprint. `/about` opens How it works on `/`. A finished Soundprint can also be opened at `/w` by someone who has the link.

Sponsor roles and technical provenance stay in `Docs/HANDOFF_1.md`, `Docs/FRONTEND_EXPERIENCE.md`, and `Docs/PRODUCT_CONCEPT.md`. They are not sections in the application. The public service is https://footwork-m6g0.onrender.com/. A finished walk asks the Gemma Space for a plan, and a validated plan is sent to Eleven Music. Later turns, pace changes, pauses, and loops change both the sketch and that plan. A ready result shows a copyable link. Anyone with that link can open the Soundprint for about an hour. The link does not contain a location, and it cannot delete the walk. Under the player, an example says it was made in the browser, a Route Sketch says it is the simpler version from the walk, and a studio recording says it was recorded from the walk. The movement ribbon has a time scale and a written list of each stretch, break, gap, and moment. On October 12, 2026 the outdoor walk was saved in sanitized form and the studio recording made from it was reviewed. Raw coordinates stay out of the repository. The labeled example does not call either service.

The Phase 1 UI/UX extension is specified in [`Docs/PHASE_1_UI_UX_PLAN.md`](Docs/PHASE_1_UI_UX_PLAN.md). Pause and resume, Nocturne Pulse, the Daylight light theme, the movement summary, the visual journey recap, and the walker are on this branch. The plan remains the spec.

The final product polish is on `main` in `19476ff`. The landing has no raw-coordinate download. A recording shows the 1 minute 30 second active-time line, and ending announces saving before generation. One anonymous browser installation can be admitted for eight jobs a day when the shared provider budget allows it. The theme control is a sun or moon icon whose accessible name is still Light theme or Dark theme. Three movement cards explain a turn, a pause, and a pace change, and each preview plays only when asked. The Soundprint is one album-style result on one audio element and one clock. Automated backend and frontend checks passed on October 12, 2026. Feature freeze is restored for further product changes. A real-phone review and a deploy of this tree remain before the public smoke checklist in `Docs/HANDOFF_2.md`. The public service at https://footwork-m6g0.onrender.com/ is the earlier deployed build. `deploy/render.yaml` lists `GENERATION_ENABLED` as `false` and shared caps of 40 Gemma attempts, 2400 GPU seconds, and 40 music attempts. The spec remains [`Docs/PHASE_5_FINAL_POLISH_PLAN.md`](Docs/PHASE_5_FINAL_POLISH_PLAN.md).

## How to record a walk

Open the public app or the local landing page and choose **Start walking**. Allow location, keep the tab open, and walk outside. End the walk when you are ready. The draft stays on the phone until you end it. A finished walk is sent to the API, which asks Gemma for a plan and sends a validated plan to Eleven Music. **Hear an example** opens a prepared piece. That piece does not call either provider.

## Movement and music

A sharp turn is meant to change the melody's direction. A pause is meant to hold or break the sound. A pace change is meant to make the sound brighter. A loop is meant to bring the opening line back. The example labels these as planned. A Route Sketch is the simpler version made from the walk. A studio recording says it was recorded from the walk.

## Architecture

The browser records and plays. Render serves the app and the Python API. Gemma on Hugging Face ZeroGPU arranges an anonymous timeline. Eleven Music renders a validated plan. The diagram source is [`Docs/diagrams/architecture.excalidraw`](Docs/diagrams/architecture.excalidraw). The written view is [`Docs/architecture.md`](Docs/architecture.md).

On this tree the shared daily ceilings are 40 Gemma attempts, 2400 GPU seconds, and 40 music attempts when those environment variables are set. Empty variables stay at 4, 240, and 6. Values above the ceilings are ignored. One browser installation is also clamped at 8 admitted jobs a day. One generation can be active at a time.

## Local setup

Use Node 22.12 or newer and Python 3.12.12.

```bash
npm ci --prefix frontend
npm run dev --prefix frontend
uv sync --directory backend
backend/.venv/bin/uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port 8000
```

Copy `backend/.env.example` to `backend/.env` and fill the provider values locally. Do not commit that file. `GENERATION_ENABLED` must be `true` before a local process calls Eleven. The daily cap variables are read from the process environment when the API starts.

## Tests and evidence

```bash
uv run --directory backend pytest
uv run --directory backend ruff check .
npm run typecheck --prefix frontend
npm run lint --prefix frontend
npm test --prefix frontend
```

Provider proofs are in `Docs/evidence/`. The listening sheet for the outdoor studio file is still empty.

## Privacy and retention

The raw walk stays on the phone until it is submitted. Providers receive event summaries, not coordinates. The ledger stores hashes. A result link lasts about an hour, does not contain a location, and cannot delete the piece. Ready audio is removed about 60 minutes after it is ready. Ledger rows stay for 48 hours. Spent quota is not refunded when a piece is deleted.

## AI-assisted development

Cursor agents helped implement and document this repository. Gemma is the in-product arranger. The explanation draft in `Docs/write-ups/footwork-challenge-draft.md` was drafted with agent assistance and is unpublished. The running app does not call the writing tools.

## Licensing

Application code is MIT, copyright Kshitij Jain, in `LICENSE`. The Gemma checkpoint `google/gemma-4-E2B-it` is Apache-2.0. Audio rendered by Eleven Music is not covered by the MIT license; it follows the Eleven Music terms. The in-browser example is part of the application and is labeled as an example, not a studio recording.

## Demo and submission

The judge path is [`Docs/demo-runbook.md`](Docs/demo-runbook.md). The checklist is [`Docs/submission.md`](Docs/submission.md). The video, screenshots, and diagram PNG are not in the repository yet.
