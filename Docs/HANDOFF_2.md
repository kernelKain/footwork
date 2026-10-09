# Footwork execution notes

Step-by-step record of what actually happened. The locked plan stays in `Docs/HANDOFF_1.md`. This file is the place to read after a step is finished.

**Status:** P1 continues locally. The public Render deploy is the first activity of P2. CodeRabbit GitHub App install is still unconfirmed.  
**Next step:** Accept the fixture journey at 390 px and 1280 px. Public deploy stays P2.0.  
**Last completed step:** P1.6 mobile layout committed as `4d3e9d1`, awaiting acceptance. Public deploy is P2.0.  
**Active build time:** 0 of 20 hours recorded. This session was not measured.

Execution notes stay in this file. The diagram and write-up path are under `Docs/`. Each **Notes** section is filled only after that step is finished.

## How to update this file

After a step is implemented, edit only that step and its phase summary:

1. Set the step status to **Done**, **Blocked**, or **Partial**.
2. Replace **Notes** with what changed, what was verified, the commit hash, and anything left open.
3. Update the phase summary once every step in that phase has a finished note.
4. Update the status lines at the top of this file.

Write notes in plain sentences. Include evidence. Do not mark a step done before its commit exists.

A finished note looks like this:

> **Notes.** Added the health endpoint and Render config. `GET /health` returned 200 on the public URL. Commit `abc1234`. CodeRabbit review is still waiting on the GitHub App install.

---

## P0 — Stack and access foundation

**Branch:** `build/foundation`  
**Window:** Build hours 0–2 (120 minutes)  
**Outcome:** Tools, model access, music API access, and hosting are configured or an explicit fallback is recorded.  
**Phase note:** Toolchain, Gemma gate, music proof, and hosting choice are recorded on `main`. The user stated the Render balance is $50 on October 9, 2026. The hosting choice is one paid `1c-2g` service. No Footwork service was created. The CodeRabbit GitHub App install is still unconfirmed. The planned `build/foundation` branch was not used.

### P0.1 — Verify baseline and initialize execution record

**Status:** Done  
**Kind:** Proof · 30 minutes · AC-14, AC-16  
**Commit subject:** Document the implementation contract and repository baseline

Inspect the repository baseline, preserve `Docs/`, and initialize the execution record. The user creates the `build/foundation` branch.

**Done when.** Repository facts and contest eligibility are recorded, and existing work is left in place.

**Notes.** Inspected `main` at `dca4c40` (`add Product Concept and Implementation Plan`), parent `22df0e7` (`Initial commit`). The public repository is https://github.com/kernelKain/footwork, created `2026-10-07T22:05:09Z`, inside the Week 1 entry window. No application code, `.env`, or deployment exists. Local Node is v22.14.0 and local Python is 3.14.4; the locked API runtime stays 3.12.12 for P0.2. Contest rules were checked against DevRelay `dev-challenges`, `hacktoberfest`, and challenge id 79. Personal prize eligibility is unconfirmed. The lowercase `docs/` handoff was removed at the user's request; this file is the execution record. Uncommitted toolchain edits in `Docs/` and `README.md` were left out of the commit. Commit `31ec759` on `main`. The planned `build/foundation` branch was not created because the commit was requested on `main`. No active time was measured.

### P0.2 — Configure the application toolchain and quality checks

**Status:** Partial  
**Kind:** Edit · 30 minutes · AC-07, AC-14, AC-18  
**Commit subject:** Configure the application toolchain and quality checks

Configure the frontend, API, and Hugging Face environments, plus GitHub Actions, CodeRabbit, Entire, the DevRelay write-up path, and the Excalidraw architecture diagram.

**Done when.** The build succeeds, versions are recorded, and the toolchain files are committed. The user installs the CodeRabbit GitHub App, runs `entire enable --agent cursor`, and confirms DevRelay authentication.

**Notes.** Frontend and API checks passed locally on October 8, 2026. Python 3.12.12 was installed with uv 0.12.5. `uv run --directory backend ruff check .` passed. `uv run --directory backend pytest` passed, 3 tests. Frontend typecheck, lint, Prettier, production build, and two Playwright shell tests passed on Node v22.14.0. Direct pins: React 19.3.0, Vite 8.3.4, TypeScript 5.9.3, ESLint 9.39.5, Prettier 3.9.9, Playwright 1.64.0, axe-core Playwright 4.13.0, FastAPI 0.143.0, Uvicorn 0.54.0, Pydantic 2.13.5, HTTPX 0.28.1, NumPy 2.5.3, gradio-client 2.7.2, pytest 8.4.2, Ruff 0.16.10. Hugging Face requirements pin Gradio 6.29.1, Transformers 5.19.0, and PyTorch 2.12.1; those packages were confirmed on PyPI and were not installed locally. ESLint 9.39.5 printed an upstream end-of-support warning; it stays because the lock is the 9.x line. DevRelay authentication was confirmed for DEV user `kernelkain`. No article was published. `.env.example` has empty values. The diagram is `Docs/diagrams/architecture.excalidraw`. The write-up path is `Docs/write-ups/README.md`. Commit `51038eb` on `main` includes the toolchain, `.coderabbit.yaml`, `.cursor/hooks.json`, and `.entire/settings.json`. `.opencode/` was left untracked because the locked agent is Cursor. The CodeRabbit GitHub App install is still unconfirmed. No active time was measured.

### P0.3 — Add the Gemma access proof and provider configuration

**Status:** Done  
**Kind:** Proof · 30 minutes · AC-04  
**Commit subject:** Add the Gemma access proof and provider configuration

Add the minimal Hugging Face arrangement endpoint and prove `google/gemma-4-E2B-it`.

**Done when.** One valid arrangement is recorded with model identity, latency, and quota, or the blocked gate and its fallback are recorded.

**Notes.** Local `backend/.env` has `HF_TOKEN`, `GEMMA_MODEL_ID=google/gemma-4-E2B-it`, `GEMMA_MODEL_REVISION=3e22461f65e89153144f8adb70e3b8c2cc9845a7`, `HF_SPACE_URL=https://kernelkain-footwork.hf.space`, `APP_ENV=local`, and `PUBLIC_BASE_URL=http://127.0.0.1:8000`. The token value is not recorded. The public Space `kernelKain/footwork` is Gradio on requested ZeroGPU hardware `zero-a10g`, but its runtime stage is `NO_APP_FILE` and a request returned 503. No arrangement was generated, and latency and quota were not measured. No second arrangement provider is configured. The fallback is Route Sketch plus a separately labeled cached Studio example. `/arrange` still returns `arrangement: null` when generation has not run. `uv run --directory backend pytest tests/unit/test_arrange_gate.py` passed, 3 tests. Evidence is in `Docs/evidence/gemma-access.md`. AC-04 remains blocked. Commit `4332c72` on `main`. No active time was measured.

### P0.4 — Record music API and hosting access checks

**Status:** Done  
**Kind:** Proof · 30 minutes · AC-05, AC-07, AC-14  
**Commit subject:** Record music API and hosting access checks

Check the ElevenLabs key, model, balance, and usage rights, and confirm Render credit covers the chosen service.

**Done when.** One affordable audio proof is recorded where permitted, and the hosting choice is confirmed. No new spending.

**Notes.** On October 9, 2026 the ElevenLabs key in `backend/.env` composed one `music_v2_5` chunk of 3000 ms. The response was HTTP 200, `audio/mpeg`, 48528 bytes, and `ffprobe` measured 3.030188 seconds. Request SHA-256 is `7658928e848e246b59b2ac87d02667c283d476f3051d1145cfcdb47bc7cf1e77`. Provider song id is `OKldGOIYKQQ3rmFF7OXM`. The audio file is `artifacts/eleven-proof.mp3` and is gitignored. `GET /v1/user` returned 401 because the key lacks `user_read`, so tier and balance were not read. No second music request was made. Render CLI v2.28.0 is authenticated for workspace `My Workspace` (`tea-da16h79t0dsc73b4d4hg`). That workspace already has one unsuspended web service on plan `1c-2g` and one static site. No Footwork service was created. The CLI and public API do not expose credit balance. The user stated the balance is $50 on October 9, 2026, so the hosting choice is one paid `1c-2g` service. No new purchase was made. Evidence is in `Docs/evidence/music-hosting.md`. AC-05 has a short access proof, not the 45–60 second demonstration track. AC-07 remains unmet until the public deployment in P1.2. Proof commit `acf03ad` and credit confirmation `8c11719` are on `main`. No active time was measured.

---

## P1 — Complete frontend experience

**Branch:** `build/experience`  
**Window:** Build hours 2–7 (300 minutes)  
**Outcome:** A full fixture journey, synchronized player, responsive states, and the first public deployment.  
**Phase note:** P1.1 is committed as `33e8a8c`. P1.2 is committed as `a7ac1ab`. P1.3 is committed as `23c247b`. P1.4 is committed as `466a238`. P1.5 is committed as `0540af5`. P1.6 is committed as `4d3e9d1` and is waiting for acceptance of the fixture journey. On October 9, 2026 the user moved the public Render deploy to the start of P2.

### P1.1 — Build the Soundprint interface and fixture contracts

**Status:** Done  
**Kind:** Edit · 50 minutes · AC-13, AC-18  
**Commit subject:** Build the Soundprint interface and fixture contracts

Build design tokens, the three-screen shell, reusable layout, and typed fixture contracts in `frontend/`.

**Done when.** A labeled fixture renders at 390 px and 1280 px, and contract validation passes.

**Notes.** Added dark-ink tokens, the Walk, Soundprint, and How it works screens, and a shared result validator. `fixtures/synthetic/soundprint-shell.json` is labeled synthetic, has no location fields, and does not claim live Gemma or ElevenLabs audio. `npm run typecheck`, `npm run lint`, and `npm run format` passed in `frontend/`. `npm test` passed, 8 tests, including 390 px and 1280 px overflow checks and the fixture contract. `uv run pytest tests/unit/test_fixtures.py` passed, 2 tests. Browser check of `http://127.0.0.1:4173` opened the walk, played the example, and opened How it works. The route figure is capped at 26rem so the path stays visible. Commit `33e8a8c` on `build/experience`. Full `uv run pytest` still fails during collection because `backend/tests/unit/test_arrange_gate.py` inserts `hf-space` at the front of `sys.path` before `test_imports.py` loads. That failure is pre-existing and was not changed here. No active time was measured.

### P1.2 — Deploy the frontend shell and API health endpoint

**Status:** Done locally  
**Kind:** Release · 50 minutes · AC-07  
**Commit subject:** Deploy the frontend shell and API health endpoint

Serve the frontend and a FastAPI health endpoint from one Render service. The user deploys the skeleton.

**Done when.** The public HTTPS page and `/health` both work.

**Notes.** `GET /health` returns status, API version `v1`, and schema version `1`, and it does not call a provider. The same FastAPI app serves the built shell for `/`, `/studio`, and `/about`. `deploy/render.yaml` selects Python, plan `1c-2g`, region `singapore`, a 1 GB disk, and `autoDeployTrigger: off`. Secret values stay out of the file. `uv run --directory backend ruff check .` passed. `uv run --directory backend pytest` passed, 9 tests. A local TestClient check of `frontend/dist` returned 200 for `/health`, `/`, `/studio`, `/about`, and the built JavaScript asset. The public URL check moved to P2.0. AC-07 stays open until that deploy. Commit `a7ac1ab` on `build/experience`. No active time was measured.

#### P1.2a — Keep the API import test collectable

**Status:** Done with P1.2  
**Reason:** The full backend suite could not collect after the Gemma proof test inserted `hf-space` ahead of the API package. CI runs that suite, and this step needs it green before a deploy is treated as ready.

**Notes.** `backend/tests/unit/test_arrange_gate.py` now removes that path immediately after importing `arrange`. The Gemma proof assertions are unchanged. The same 9-test run covers this fix.

### P1.3 — Synchronize route playback and audio scrubbing

**Status:** Done  
**Kind:** Edit · 50 minutes · AC-02, AC-10  
**Commit subject:** Synchronize route playback and audio scrubbing  
**Commit:** `23c247b`

Add the audio player, SVG route, and scrubbing, driven by one audio clock and deterministic fixture audio.

**Done when.** Anchor checks stay within 500 ms of the audio clock.

**Notes.** Committed as `23c247b`. The Soundprint player uses one audio element as the clock and `requestAnimationFrame` to read it. Scrubbing and event buttons seek that clock. The browser generates a deterministic sketch: the tone falls until the corner, rises after it, and stays silent through the hold. The screen says this is not ElevenLabs audio. `npm run typecheck`, `npm run lint`, and `npm run format` passed. `npm test` passed, 10 tests. The scrub and pause-marker checks stayed within 500 ms of the audio clock. A browser click on Turn moved the scrubber to 18000 and showed Now. No active time was measured.

### P1.4 — Add movement markers and Soundprint explanations

**Status:** Done  
**Kind:** Edit · 50 minutes · AC-10, AC-18  
**Commit subject:** Add movement markers and Soundprint explanations  
**Commit:** `466a238`

Add the Route–Sound Graph, Movement Story, and sponsor and provenance labels.

**Done when.** Choosing a marker moves the route, graph, and story together, and planned mappings are labeled as planned.

**Notes.** Committed as `466a238`. The graph, story cards, and route share the existing audio clock. Choosing the turn mapping seeks that clock, and the route cursor, graph playhead, and story time stay within 500 ms of one another. Mapping status stays the fixture value `planned`. Sponsor copy says this synthetic fixture did not call Gemma or ElevenLabs, and that Render is the planned host while this screen is local. `npm run typecheck`, `npm run lint`, and `npm run format` passed. `npm test` passed, 11 tests. No active time was measured.

### P1.5 — Implement recording and generation interface states

**Status:** Done  
**Kind:** Edit · 50 minutes · AC-06, AC-11, AC-18  
**Commit subject:** Implement recording and generation interface states  
**Commit:** `0540af5`

Build the fixture recording and generation flow, including every required visible state.

**Done when.** Permission, loading, partial, invalid, quota, and provider-failure states are present, and none of them pretends a live generation succeeded.

**Notes.** Committed as `0540af5`. The walk screen previews permission denial, waiting for a position fix, an invalid trace, and a hidden-page gap. The Soundprint screen previews processing, arranging, and composing, plus partial, quota, and provider failure. Those views hide the synthetic result. Provider failure uses the locked sentences for an unavailable arrangement service and unavailable Studio generation, and it says this preview did not produce a Studio Track. Returning to the synthetic fixture shows that example again, still labeled synthetic. `npm run typecheck`, `npm run lint`, and `npm run format` passed. `npm test` passed, 12 tests. No active time was measured.

### P1.6 — Refine the mobile Soundprint experience

**Status:** Partial  
**Kind:** Verify · 50 minutes · AC-12, AC-13  
**Commit subject:** Refine the mobile Soundprint experience  
**Commit:** `4d3e9d1`

The user reviews the full fixture experience. Revise hierarchy and mobile layout from that review.

**Done when.** The fixture journey is accepted and usable at 390 px and 1280 px.

**Notes.** Committed as `4d3e9d1`. The Soundprint now leads with the synthetic label, Play, and the route. Generation preview states sit behind a disclosure after the route, graph, story, and provenance. The separate movement-event list is gone because the graph already seeks those markers. The walk screen shows the empty recording before its preview-state disclosure. A selected preview state says Showing, not only a gold border. The narrow header places the mode badge beside the name. `npm run typecheck`, `npm run lint`, and `npm run format` passed. `npm test` passed, 12 tests, including route-before-states order and no horizontal overflow at 390 px and 1280 px. The fixture journey is not yet accepted by the user. No active time was measured.

---

## P2 — Real recording and movement engine

**Branch:** `build/movement`  
**Window:** Build hours 7–11 (240 minutes)  
**Outcome:** Real capture, four detectors, compression, and an exact Route Sketch Hook.  
**Phase note:** Not started. The public shell deploy was added at the start of this phase on October 9, 2026. P1 continues locally until then.

### P2.0 — Publish the shell and health endpoint

**Status:** Not started  
**Kind:** Release · user-directed · AC-07  
**Commit subject:** Record the public shell and health endpoint

After `build/experience` is pushed, create the Render Blueprint from `deploy/render.yaml`, deploy it manually, and record the public page and `/health`.

**Done when.** The public HTTPS page and `/health` both work.

**Notes.** Not started. The user will deploy after pushing this branch. Provider keys stay in the Render dashboard.

### P2.1 — Record browser movement and recover local drafts

**Status:** Not started  
**Kind:** Edit · 40 minutes · AC-01, AC-14  
**Commit subject:** Record browser movement and recover local drafts

Record permissioned browser location, keep samples bounded, and store the draft in IndexedDB.

**Done when.** Start and end stop the watch, and a reload recovers the draft. There is no upload interface.

**Notes.** Not implemented.

### P2.2 — Handle recording interruptions and screen visibility

**Status:** Not started  
**Kind:** Edit · 40 minutes · AC-01, AC-11  
**Commit subject:** Handle recording interruptions and screen visibility

Record visibility gaps, add a wake lock where the browser allows it, and explain how to keep the page visible.

**Done when.** Hiding and resuming the page marks an interruption, and the interface does not promise screen-off recording.

**Notes.** Not implemented.

### P2.3 — Validate and clean recorded movement samples

**Status:** Not started  
**Kind:** Edit · 40 minutes · AC-09, AC-14  
**Commit subject:** Validate and clean recorded movement samples

Validate, clean, and project samples in Python, and score route quality.

**Done when.** Noise, impossible jumps, and invalid timestamps are rejected, and a low-quality trace is explained.

**Notes.** Not implemented.

### P2.4 — Detect turns, pace changes, pauses, and loops

**Status:** Not started  
**Kind:** Edit · 40 minutes · AC-09  
**Commit subject:** Detect turns pace changes pauses and loops

Implement the four detectors with positive and negative fixtures.

**Done when.** Turn, pace, pause, and loop fixtures pass, and control traces do not gain invented events.

**Notes.** Not implemented.

### P2.5 — Generate synchronized route sketches from movement events

**Status:** Not started  
**Kind:** Edit · 40 minutes · AC-02, AC-10, AC-14, AC-17  
**Commit subject:** Generate synchronized route sketches from movement events

Compress the journey, transform the route for display, and synthesize the deterministic Route Sketch.

**Done when.** The automated turn and pause Hook test passes, the shared map stays in order, and the audio is valid.

**Notes.** Not implemented.

### P2.6 — Validate the movement pipeline with a real outdoor walk

**Status:** Not started  
**Kind:** Verify · 40 minutes · AC-01, AC-09, AC-14  
**Commit subject:** Validate the movement pipeline with a real outdoor walk

The user records the outdoor seed walk. Inspect the derived events and save only the approved sanitized fixture.

**Done when.** The real recording shows useful events, and the raw trace stays out of Git.

**Notes.** Not implemented.

---

## P3 — Sponsor-backed Soundprint

**Branch:** `build/soundprint`  
**Window:** Build hours 11–15 (240 minutes)  
**Outcome:** Live Gemma and Eleven Music adapters, job controls, and one reviewed Studio result. Feature freeze is at the end of this phase.  
**Phase note:** Not started. Depends on P2.

### P3.1 — Add protected generation jobs and durable usage limits

**Status:** Not started  
**Kind:** Edit · 40 minutes · AC-08, AC-14, AC-15  
**Commit subject:** Add protected generation jobs and durable usage limits

Add job endpoints, per-job capability checks, the quota ledger, and idempotency.

**Done when.** Duplicate, restart, and quota tests pass, and budget is reserved before a provider is called.

**Notes.** Not implemented.

### P3.2 — Integrate Gemma arrangement generation and validation

**Status:** Not started  
**Kind:** Edit · 40 minutes · AC-04, AC-06  
**Commit subject:** Integrate Gemma arrangement generation and validation

Call Gemma with an anonymous event timeline and validate the arrangement. Allow at most one repair.

**Done when.** A valid plan is produced, and invalid output becomes an honest Route Sketch.

**Notes.** Not implemented.

### P3.3 — Render validated arrangements with Eleven Music

**Status:** Not started  
**Kind:** Edit · 40 minutes · AC-05, AC-17  
**Commit subject:** Render validated arrangements with Eleven Music

Compile timed Music v2.5 chunks, call the Eleven Music API, and check the returned audio.

**Done when.** A genuine audio receipt exists, and an ambiguous network failure is not retried automatically.

**Notes.** Not implemented.

### P3.4 — Connect recorded walks to live Soundprint generation

**Status:** Not started  
**Kind:** Edit · 40 minutes · AC-01, AC-06, AC-08, AC-18  
**Commit subject:** Connect recorded walks to live Soundprint generation

Replace fixture generation with the live job flow without rebuilding the accepted interface.

**Done when.** A real recording reaches Studio or Route Sketch, and the mode and stages match what happened.

**Notes.** Not implemented.

### P3.5 — Verify and cache the real walk demonstration track

**Status:** Not started  
**Kind:** Verify · 40 minutes · AC-03, AC-05, AC-17  
**Commit subject:** Verify and cache the real walk demonstration track

Listen to the seed Studio track, timestamp three movement mappings, and store the cached example.

**Done when.** The turn, the pause, and a third mapping are perceptible. If they are not, AC-03 is recorded as failed. Stay inside the attempt cap.

**Notes.** Not implemented.

### P3.6 — Verify provider fallbacks and freeze the feature set

**Status:** Not started  
**Kind:** Verify · 40 minutes · AC-06, AC-08, AC-11, AC-15, AC-18  
**Commit subject:** Verify provider fallbacks and freeze the feature set

Check provider failure, deadline, quota, and fixture parity. Freeze features at build hour 15.

**Done when.** The same trace can fall back to Route Sketch, the cached example stays separately labeled, and the freeze is recorded.

**Notes.** Not implemented.

---

## P4 — Release verification

**Branch:** `build/release`  
**Window:** Build hours 15–17 (120 minutes)  
**Outcome:** Privacy, accessibility, responsive, and failure checks, then the final deployed release.  
**Phase note:** Not started. Depends on P3. Fixes only. No new features.

### P4.1 — Harden location privacy and generation access controls

**Status:** Not started  
**Kind:** Verify · 30 minutes · AC-14, AC-15  
**Commit subject:** Harden location privacy and generation access controls

Audit secrets, payloads, authorization, logs, and retention.

**Done when.** Coordinates and secrets are absent from the inspected artifacts, another job's capability is denied, and caps survive a restart.

**Notes.** Not implemented.

### P4.2 — Fix accessibility and responsive layout issues

**Status:** Not started  
**Kind:** Verify · 30 minutes · AC-12, AC-13  
**Commit subject:** Fix accessibility and responsive layout issues

Check keyboard use, contrast, reduced motion, and the 390 px and 1280 px layouts.

**Done when.** The core flow works at both widths and by keyboard. Fix required failures only.

**Notes.** Not implemented.

### P4.3 — Verify the release journey and synchronization contracts

**Status:** Not started  
**Kind:** Verify · 30 minutes · AC-02, AC-10, AC-11, AC-18  
**Commit subject:** Verify the release journey and synchronization contracts

Run the contract tests, the browser journey, and the targeted failure cases.

**Done when.** The automated Hook test and the release journey pass. Any criterion still open is written down.

**Notes.** Not implemented.

### P4.4 — Prepare the verified public release and rollback record

**Status:** Not started  
**Kind:** Release · 30 minutes · AC-07, AC-08, AC-14  
**Commit subject:** Prepare the verified public release and rollback record

The user deploys the reviewed release. Record the smoke check, the rollback commit, and cleanup settings.

**Done when.** The public URL is healthy, the example plays, and the live caps are correct.

**Notes.** Not implemented.

---

## P5 — Demo and submission

**Branch:** `build/submission`  
**Window:** Build hours 17–20 (150 minutes, plus a 30-minute emergency buffer)  
**Outcome:** Demo video, DEV article, README, links, and the final evidence record.  
**Phase note:** Not started. Depends on P4.

The 30-minute buffer is not a step. If emergency work happens, add it under the step it belongs to, with its own commit and note.

### P5.1 — Document the architecture, demo, and AI-assisted development

**Status:** Not started  
**Kind:** Edit · 45 minutes · AC-16  
**Commit subject:** Document the architecture demo and AI-assisted development

Write the README, architecture notes, and rights notes. Draft the DEV article through DevRelay, and export the Excalidraw diagram.

**Done when.** The mechanism, evidence, limitations, and setup are accurate, and the DEV draft is still unpublished for review.

**Notes.** Not implemented.

### P5.2 — Add the demonstration assets and judge runbook

**Status:** Not started  
**Kind:** Release · 45 minutes · AC-03, AC-16  
**Commit subject:** Add the demonstration assets and judge runbook

The user records the 60-second demo. Prepare the runbook and screenshot references.

**Done when.** The Hook appears in the first ten seconds, a backup video exists, and prepared playback is not described as live generation.

**Notes.** Not implemented.

### P5.3 — Record the completed challenge submission

**Status:** Not started  
**Kind:** Release · 45 minutes · AC-16  
**Commit subject:** Record the completed challenge submission

Review tags, template, and links. The user publishes the DEV submission and records the URL.

**Done when.** The submission checklist is complete before the deadline.

**Notes.** Not implemented.

### P5.4 — Record final verification and release status

**Status:** Not started  
**Kind:** Verify · 15 minutes · all acceptance criteria  
**Commit subject:** Record final verification and release status

Update the final handoff, acceptance evidence, release reference, and remaining limitations.

**Done when.** This file and the repository match the deployed release.

**Notes.** Not implemented.
