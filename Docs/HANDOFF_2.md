# Footwork execution notes

Step-by-step record of what actually happened. The locked plan stays in `Docs/HANDOFF_1.md`. This file is the place to read after a step is finished.

**Status:** The feature set is frozen on `build/soundprint`. Later phases are fixes and release checks. The user will record the outdoor walk, review the seed Studio track, and deploy to Render after the rest of the build. The 20-hour ceiling is unchanged. CodeRabbit GitHub App install is still unconfirmed.
**Next step:** P4.4 is blocked on the user deploying the reviewed release. P2.0, P2.6, and P3.5 stay pending until that later pass.
**Last completed step:** P4.3, verify the release journey and synchronization contracts, on `build/release` at `6915426`. P4.2 is `b2c9bfc`. P4.1 is `3419919`. P3.6 is `27ed855`. P3.5 is `98081fb`. P3.4 is `0f44b87`. P3.3 is `ab02558`. P3.2 is `d23b469`. P3.1 remains `4e9e844`.
**Active build time:** 0 of 20 hours recorded. This session was not measured.

Execution notes stay in this file. The diagram and write-up path are under `Docs/`. Each **Notes** section is filled only after that step is finished.

## How to update this file

After a step is implemented, edit only that step and its phase summary:

1. Set the step status to **Done**, **Blocked**, **Pending**, or **Partial**. Pending means the user will do that step after the rest of the build.
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
**Phase note:** P1.1 is committed as `33e8a8c`. P1.2 is committed as `a7ac1ab`. P1.3 is committed as `23c247b`. P1.4 is committed as `466a238`. P1.5 is committed as `0540af5`. P1.6 is committed as `4d3e9d1`. Frontend polishing steps 1–5 are complete through `847a294`. On October 9, 2026 the user requested a second Phase 1 extension covering pause/resume, a new theme, visual analytics, and purposeful motion. The plan is `Docs/PHASE_1_UI_UX_PLAN.md`. The user then asked for the visual-system slice first. P1.8 through P1.13 and the Daylight light theme are committed as `56b9c06`. P1.7 was not a separate implementation step.

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

**Notes.** Committed as `4d3e9d1`. The Soundprint now leads with the synthetic label, Play, and the route. Generation preview states sit behind a disclosure after the route, graph, story, and provenance. The separate movement-event list is gone because the graph already seeks those markers. The walk screen shows the empty recording before its preview-state disclosure. A selected preview state says Showing, not only a gold border. The narrow header places the mode badge beside the name. `npm run typecheck`, `npm run lint`, and `npm run format` passed. `npm test` passed, 12 tests, including route-before-states order and no horizontal overflow at 390 px and 1280 px. The user then approved a frontend-polishing plan instead of closing this step by acceptance. The public contract that replaces this shell is `Docs/FRONTEND_EXPERIENCE.md`. No active time was measured.

---

## Frontend polishing

The user approved this plan on October 9, 2026, on `build/experience`. It does not replace the Hook, the stack, or the phase order. Step 1 is documentation only.

### Step 1 — Rebaseline the frontend experience and visual direction

**Status:** Done
**Kind:** Edit · documentation
**Commit subject:** Rebaseline the frontend experience and visual direction

Write the public flow, page contract, plain-language copy, state model, and design-research notes. Do not change components.

**Done when.** `Docs/FRONTEND_EXPERIENCE.md`, `Docs/HANDOFF_1.md`, `Docs/HANDOFF_2.md`, and `Docs/PRODUCT_CONCEPT.md` agree on the public journey, and no frontend component was edited.

**Notes.** This commit adds `Docs/FRONTEND_EXPERIENCE.md` and aligns the handoff and product concept with that contract. No frontend component was edited. `.opencode/` and `.playwright-mcp/` stayed untracked. No active time was measured.

### Step 2 — Create the Footwork brand and mobile design system

**Status:** Done
**Kind:** Edit
**Commit subject:** Create the Footwork brand and mobile design system

Add the Night Trail Studio brand, design tokens, and reusable controls. Do not redesign `/` or `/studio`.

**Done when.** The logo, tokens, and controls exist, component tests cover focus, disabled, loading, reduced motion, 360 px, contrast, and the small mark, and no new dependency was added.

**Notes.** This commit adds the brand and the control catalog. The public walk and Soundprint screens are not redesigned. They pick up the new ink, mint, and amber through the existing token names. `/system` is not linked from the header. `.opencode/` stayed untracked. No active time was measured.

Direction: Night Trail Studio. Deep ink background, opaque elevated surfaces, mint for the route, amber for musical moments, and coral only for ending a walk or another destructive action. One system sans stack. Timers use tabular numerals. Motion is transform and opacity, and only to show state. `prefers-reduced-motion` shortens transitions and replaces the hold gesture with a second press. The recording pulse is opt-in. The word Recording stays. No WebGL, no looping background, and no new library.

No new dependency. Tokens are CSS custom properties. The logo is hand-drawn SVG. The project has no web app manifest and no image pipeline, so the favicon, 180 px apple-touch icon, and 1200×630 social image are SVG rather than PNG.

| Token | Value |
|---|---|
| `--color-bg` | `#0e1520` |
| `--color-surface` | `#1a2636` |
| `--color-surface-raised` | `#223246` |
| `--color-text` | `#f4f1ea` |
| `--color-text-muted` | `#d5d0c6` |
| `--color-mint` / `--color-mint-ink` | `#8fd4ae` / `#10281c` |
| `--color-amber` | `#e2b657` |
| `--color-coral` / `--color-coral-ink` | `#c4473a` / `#fff8f6` |
| `--color-line` | `#3a4a60` |
| `--color-focus` | `#9ad7ff` |
| `--color-warning` | `#ffb4a8` (the old `--danger` name; not coral) |
| Type | `system-ui, "Segoe UI", sans-serif`; 0.875 / 1 / 1.25 / 2 rem |
| Space | 8, 16, 24, 32, 48, 64 px |
| Radius | 12 px, 16 px |
| Border | 1 px |
| Elevation | `0 10px 28px rgb(0 0 0 / 0.28)` on raised surfaces only |
| Motion | 160 ms, `cubic-bezier(0.2, 0, 0, 1)` |
| Target | 44 px minimum |
| Safe area | `env(safe-area-inset-*)` on the shell |

Logo geometry is one continuous route stroke that reads as an F, a start circle, and one square beat. Files:

- `frontend/public/brand/mark.svg`
- `frontend/public/brand/mark-mono.svg`
- `frontend/public/brand/wordmark.svg`
- `frontend/public/favicon.svg`
- `frontend/public/brand/apple-touch.svg`
- `frontend/public/brand/og.svg`
- `frontend/public/brand/trail-wash.svg` (static, catalog only)

Controls in `frontend/src/ui/`: primary, secondary, quiet, icon, and destructive buttons; hold-to-confirm; card and raised panel; status chip; alert; dialog sheet; disclosure; skeleton; recording indicator; timer; route line, waypoint, beat, and waveform. `Logo` exposes mark, wordmark, and mono, each named Footwork. Styles live in `frontend/src/styles/tokens.css` and `frontend/src/styles/system.css`.

`npm run typecheck`, `npm run lint`, and `npm run format` passed. `npm test` passed, 16 tests. The new tests cover keyboard focus, disabled and loading states, reduced-motion confirmation, the 16 px mark, no horizontal overflow at 360 px, and no serious axe violations on the catalog. The existing shell axe run still passes at `/`, `/studio`, and `/about`.

### Step 3 — Build the guided landing and recording journey

**Status:** Done
**Kind:** Edit
**Commit subject:** Build the guided landing and recording journey

Replace the three-link introduction with one landing page and a labeled practice recording journey.

**Done when.** `/` explains the walk and can start, record, and end a practice walk. Recoverable practice states are reachable without a public picker. `/studio` is not redesigned.

**Notes.** This commit builds the landing and the practice recording journey. No new dependency. `.opencode/` stayed untracked. No active time was measured.

Route flow:

```text
/  ready landing
   Start walking
     unsupported practice -> unsupported browser
     otherwise readiness sheet
       Not now -> ready
       Begin practice walk
         denied practice -> permission denied
         offline practice -> offline
         otherwise checking location
           Cancel -> ready
           interrupted practice, or the tab is hidden -> interrupted
           otherwise recording
             release the hold early -> recording
             hold about two seconds, or a second press when motion is reduced -> ending -> finished
/studio  labeled example, still the older Soundprint screen
/about   redirects to /#how-it-works
```

Fixture boundary: the public page has no state picker. Tests set `sessionStorage` key `footwork-practice` to `denied`, `unsupported`, `offline`, or `interrupted` before load. Any other value is the granted practice. The recording port in `frontend/src/recording/practicePort.ts` is the Phase 2 seam. Its methods do not call geolocation, Wake Lock, or IndexedDB. `recoverDraft()` returns null.

Known limits: the timer is a practice clock, not a stored walk. The route line is not the person's path. Ending a practice walk does not generate music. `/studio` still shows the fixture banner, the generation preview control, and the sponsor and provenance sections.

`npm run typecheck`, `npm run lint`, and `npm run format` passed. `npm test` passed, 29 tests, including 360, 390, 430, 768, and 1280 px, keyboard focus, reduced motion, hold completion, early release, permission denial, and the unsupported browser.

### Step 4 — Redesign the generation and Soundprint experience

**Status:** Done
**Kind:** Edit
**Commit subject:** Redesign the generation and Soundprint experience

Show a clear wait after a walk ends, then a Soundprint with a hero, a route, a movement-to-music timeline, a short story, and optional details.

**Done when.** Ending a practice walk opens generation. The result no longer shows sponsors, provenance, or fixture controls. Audio and route stay within 500 ms.

**Notes.** This commit replaces the older Soundprint screen. No new dependency. `.opencode/` stayed untracked. No active time was measured.

Ending a practice walk waits briefly, then opens `/studio`. The practice stages are Reading your walk, Finding meaningful moments, Turning them into music, and Creating your track. Their ids (`reading_walk`, `finding_moments`, `shaping_music`, `recording_piece`) are not the labels. The page shows the active line and the elapsed time. It does not show a percent. The 180 second boundary from AC-08 uses the same check: past that, or when the attempt is `timed_out`, the page says the piece took too long and offers Try again. Phase 1 practice finishes the four lines on a short timer and does not call a model. The result is still the example.

The result order is the hero (title, summary, cover, Play, Pause, Replay, scrub, and Example walk), the route, the timeline, the walk story, and a closed About this example disclosure. Generated from your walk is reserved for a later result whose mode is not an example. Provenance stays on the result object and in the fixture. It is not a public panel.

Fixture boundary: tests set `sessionStorage` key `footwork-generation` to `run` or an error code before load. `footwork-generation-complete` keeps a second practice ending from starting another piece. There is no public picker.

Verification for this commit: `npm run typecheck`, `npm run lint`, and `npm run format` passed. `npm test` passed, 39 tests. Those tests cover play, pause, seek, replay, event selection, keyboard activation, the 500 ms clock, empty, partial, timeout, error, retry, example, and repeat states, reduced motion, and 360, 390, 430, 768, and 1280 px. Sponsors, Provenance, the generation picker, `synthetic_fixture`, and `mapping_status` are absent from the public page. The route cursor, timeline playhead, and story time still share the audio clock within 500 ms.

### Step 5 — Verify the frontend redesign and rebaseline later phases

**Status:** Done
**Kind:** Edit
**Commit subject:** Verify the frontend redesign and rebaseline later phases

Check the Phase 1 pages, remove leftover preview controls, and write the Phase 2 seams against the screens that exist.

**Done when.** The existing checks pass, the critical flows have regression tests, and Phase 2 can start from the current landing, recording, generation, and Soundprint interfaces.

**Notes.** This commit does not add a product feature. `.opencode/` stayed untracked. No active time was measured. No real phone was available for this pass.

`npm run typecheck`, `npm run lint`, and `npm run format` passed. `npm test` passed, 45 tests. `npm run build` passed. `uv run --directory backend ruff check .` passed, and `uv run --directory backend pytest` passed, 9 tests, with no backend source changes. The first test run in this step failed two shell tests while a second build was writing `dist` at the same time. A clean rerun passed those tests. They were not product failures.

What changed: `viewport-fit=cover` so the existing safe-area padding can apply on a notched phone. Touch targets use `max(44px, 2.75rem)` and the primary actions use `max(48px, 3rem)`, so they stay at least the physical minimum and grow when text is enlarged. The readiness sheet moves focus inside the dialog and returns it when the sheet closes. `/about` settles to `/#how-it-works` for a direct visit and for in-app navigation. Unused preview components and their styles are gone. Repeated waveform bar keys that collided were given unique keys. The public pages were not redesigned.

Phase 2 starts from these seams:

- Recording: `frontend/src/recording/practicePort.ts`. Replace it with the Geolocation API, the Screen Wake Lock API, and IndexedDB. `checkSupport` reports an unsupported browser before a location request. `explainThenResolve` reports granted, denied, or offline. `wakeLockLabel` says when the screen is held and when it is not. The page must not promise recording after the phone is locked. `recoverDraft` is null until a draft can be saved and restored. The elapsed clock must be monotonic and must not fill missing time.
- Generation: `frontend/src/studio/generationContract.ts`. Stage ids, in order, are `reading_walk`, `finding_moments`, `shaping_music`, and `recording_piece`. The public lines are Reading your walk, Finding meaningful moments, Turning them into music, and Creating your track. Error codes are `trace_too_short`, `timed_out`, `arrangement_unavailable`, `music_unavailable`, and `generation_limit`. Retry is only for `timed_out`, `arrangement_unavailable`, and `music_unavailable`, and only after the person presses Try again. The 180 second boundary from AC-08 ends in the timeout line. A second ending of the same finished walk must not start another piece. Do not send a percent or a new HTTP path from this contract.
- Provenance stays on the Soundprint result and in the fixture. It is not a public panel. Sponsor acknowledgements stay in `README.md` and these notes.

Accessibility baseline from this pass: one `h1` on each public view, a `header` and a `main`, visible `:focus-visible` outlines, named controls, text plus color for status, and reduced motion that leaves the generation line visible. Playback time is not a live region. The stage status changes only when the stage changes.

Performance baseline, local only: `vite build` produced `dist/index.html` at 0.91 kB (gzip 0.45 kB), CSS at 11.53 kB (gzip 3.12 kB), and JavaScript at 268.74 kB (gzip 82.09 kB). CSS is about 0.5 kB smaller than the previous build because unused preview styles were removed. The deleted preview modules were already outside the bundle, so JavaScript stayed about 82 kB gzip. An emulated slow mobile profile, about 1.6 Mbps down, 750 kbps up, 150 ms latency, and 4× CPU, showed the landing in 1353 ms and the example in 1113 ms on the local preview server. The document load event was 388 ms and the document transfer was 1212 bytes. Resource body sizes in that run were 0 because the preview assets were already cached, so this is not a cold download of the script and not a Lighthouse score. No real phone was available. SVG brand files are all under 1 KB. The type stack is `system-ui`, so no web font blocks the first paint. The JavaScript dependencies are React and React DOM. There is no Three.js, WebGL, or infinite decorative background animation. The stage entrance and the recording pulse use opacity and transform, and the pulse runs only when the person has not asked for reduced motion.

### P1.7–P1.13 — Extend the frontend with pause, visual analytics, and purposeful motion

**Status:** Done for P1.8 through P1.13 and Daylight, commit `56b9c06`. P1.7 was not a separate implementation step.
**Plan:** `Docs/PHASE_1_UI_UX_PLAN.md`
**Estimated total:** 290 minutes
**Budget state:** A decision is required before implementation because the original 20-hour plan allocated its full ceiling.

| Step | Status | Outcome | Proposed commit subject |
|---|---|---|---|
| P1.7 | Planned | Lock pause semantics, the Nocturne Pulse direction, result wireframes, and allowed analytics. | `Plan the pause journey and visual Soundprint extension` |
| P1.8 | Done | Practice pause, paused restoration, usable-fix resume, active time, and break time. Commit `56b9c06`. | `Add pause and resume states to the walk journey` |
| P1.9 | Done | Typed movement summaries, rendered by the recap. Commit `56b9c06`. | `Add honest movement summaries to the Soundprint contract` |
| P1.10 | Done | Nocturne Pulse, with Daylight added in the same commit. Contrast is recorded below. Commit `56b9c06`. | `Apply the Nocturne Pulse visual system` |
| P1.11 | Done | Glance tiles, segmented route, movement ribbon, event cards, composition counts, and a closed quality disclosure. Commit `56b9c06`. | `Turn the Soundprint result into a visual journey recap` |
| P1.12 | Done | One SVG walker on landing, recording, paused, generation, and playback. Commit `56b9c06`. | `Animate the walk to Soundprint transformation` |
| P1.13 | Done | Verification passed on October 9, 2026, then Daylight was added and the suite was run again. Commit `56b9c06`. | `Verify the upgraded walk and Soundprint experience` |

**Notes.** The user first asked for a plan and no implementation. That request and the linked plan changed documentation only. No component, style, fixture, contract, dependency, or test was changed for the plan itself. Manual breaks are planned as gaps between recording segments and are not natural pause events. Visual analytics are limited to values derivable from accepted location samples and detector output; calories, heart rate, steps, elevation, and health advice remain out of scope.

On October 9, 2026 the user then asked for the visual-system slice before the other extension steps. That work is recorded under P1.10 below. The pause journey was implemented afterward and is recorded under P1.8. The movement summary contract was implemented after that and is recorded under P1.9. The visual recap and walker were implemented after that and are recorded under P1.11 and P1.12. The verification pass is recorded under P1.13.

### P1.8 — Add pause and resume states to the walk journey

**Status:** Done
**Kind:** Edit
**Commit subject:** Add pause and resume states to the walk journey
**Commit:** `56b9c06`

Practice recording can pause, wait through "Finding your location again", and resume on a new segment. A paused practice in sessionStorage is restored after reload. A recording draft is not restored as paused.

**Done when.** The practice journey pauses, survives a reload fixture, resumes without drawing across the break, and remains keyboard- and screen-reader-usable.

**Notes.** Implemented in the working tree on October 9, 2026. The practice port does not call geolocation, Wake Lock, or IndexedDB. A paused draft is kept in sessionStorage under `footwork-practice-draft` as segment durations and break intervals, not coordinates. Active time is the sum of recording segments. Elapsed time adds every manual break. The visible current break is only the open interval. A manual break does not add distance, route points, or musical pause events. Hiding the page during recording still shows the interrupted state and stores nothing. Hiding while paused leaves the paused walk in place.

The practice route draws each segment as its own cyan path. A break is a separate pause-blue dotted path titled "Break. Not movement." That decorative route shows at most three segments. There is no walker motif yet, so the motion that stops while paused is the recording pulse and the growing practice route.

`npm run lint` and `npm run format` passed. `npm test` passed, 54 tests, with Playwright pointed at the installed browser cache. The new tests cover pause, resume, focus, an early end, reduced-motion keyboard end, restoration, a recording draft that is not restored, resume failure, cancel, hidden-page behavior, active and break timing, a second pause whose current break is shorter than the total, the missing route connector, and axe on the paused view. `npm run build` passed, and its `tsc -b` step is the typecheck: HTML 0.96 kB (gzip 0.47 kB), CSS 13.17 kB (gzip 3.41 kB), JavaScript 276.87 kB (gzip 84.55 kB).

A browser pass of the preview restored a paused draft. The heading was "Walk paused", Resume walk was focused, active time was 00:05, and the status sentence was "Movement is not being recorded. Your walk is saved on this phone." Resume showed "Finding your location again", then returned to Practice walk with focus on Pause walk. The route had separate segment paths and pause-blue gaps that were not part of those paths. A later pause showed current break 00:00 while elapsed stayed 00:58, so the new break did not absorb earlier breaks. The IDE browser tab was hidden for part of the pass, so animation frames did not advance the clocks there. The second-by-second active and break timing was measured by the Playwright tests. Holding the end control in that browser did not complete the two-second press. Ending from paused is covered by the Playwright hold and reduced-motion keyboard tests. Paused layout was not remeasured at five widths in the browser. The recording view, which now has both dock buttons, passed the existing 360, 390, 430, 768, and 1280 px checks. Commit `56b9c06`. Movement analytics were not added in this step.

### P1.9 — Extend the Soundprint analytics contract and fixture

**Status:** Done
**Kind:** Contract/fixture
**Commit subject:** Add honest movement summaries to the Soundprint contract
**Commit:** `56b9c06`

Every Soundprint result now carries a required `movement_summary`. The page does not render it. `schema_version` stays `"1"`.

**Done when.** Every proposed visual has typed data, and missing or low-quality data produces an explicit unavailable state.

**Notes.** Implemented in the working tree on October 9, 2026. The named fields match `Docs/PHASE_1_UI_UX_PLAN.md` section 7. Nested shapes were not named in that plan, so they are recorded here.

`recording_segments` items are `{ id, start_ms, end_ms, distance_m }`. `break_intervals` items are `{ id, start_ms, end_ms }`. `uncertain_intervals` items add `reason`, which is `visibility` or `signal`. `pace_series` items are `{ t_ms, pace, quality }`, where `pace` is a relative value from 0 to 1 and `quality` is `clear` or `uncertain`. `event_counts` is `{ turn, pause, pace_change, loop }`. The `pause` count is detected pause events. It is not the manual-break count. `return_proximity` may be omitted. A present value is a finite number from 0 to 1. `quality_grade` is `clear`, `mixed`, or `limited`. `quality.usable` stays a separate flag.

Validation rejects a missing summary, a missing required field, a negative or non-finite value, an overlap, an out-of-order list, and a total that does not match its parts. There is no silent zero. Active time is the sum of segment durations. Manual-break time is the sum of break durations. Distance is the sum of segment distances. Elapsed time runs from the first interval start to the final end and equals active time plus manual breaks plus uncertain intervals. A hole that is none of those three fails. Touching endpoints are allowed. A route point, pace sample, or event time must fall inside a recording segment. Consecutive route points must not cross a manual break or an uncertain interval. Clear quality requires active time, no uncertain intervals, at least one clear pace sample, and a speed equal to accepted distance divided by active seconds, within 0.001 and at most 12 m/s. Mixed quality requires an uncertain interval or an uncertain pace sample, and its speed may be null or that same computed value. Limited quality requires a null speed. Its pace samples, if any, must be marked uncertain. Calories, steps, heart rate, cadence, elevation, health advice, population comparisons, and route connector fields are forbidden and are checked through nested objects.

`fixtures/synthetic/soundprint-shell.json` stays the page example: one 60 second segment, 96 fictional meters, empty pace, null speed, limited grade, and no return proximity. Its route points and event times are unchanged, so the existing polyline does not cross a gap. `fixtures/synthetic/movement-summary-mixed.json` has two segments, a 6 second manual break, a 2 second signal gap, 60 meters, speed 1.5, and return proximity 0.25. Its route samples stop before the gap. `fixtures/synthetic/movement-summary-limited.json` has uncertain pace samples, a null speed, and no return proximity. Provenance and the four result modes are unchanged.

`npm run lint` and `npm run format` passed. `npm test` passed, 68 tests, with Playwright pointed at the installed browser cache. The new contract tests cover the three fixtures, an omitted return proximity, a clear summary derived from the shell, a mixed summary with speed withheld, a missing summary, a missing distance, negative and non-finite values, a drifted elapsed time, a distance that does not match the segments, a wrong speed, an overlap, an out-of-order segment list, an event count that does not match, a detected pause inside a manual break, a pace sample inside a break, route points that would cross a gap, a limited summary that publishes a speed, a clear grade on an uncertain gap, a return proximity above 1, a null return proximity, and calories, steps, and connector keys. `uv run pytest tests/unit/test_fixtures.py` from `backend/` passed, 2 tests. That test now walks nested objects for the same forbidden keys. `npm run build` passed, and its `tsc -b` step is the typecheck: HTML 0.96 kB (gzip 0.47 kB), CSS 13.17 kB (gzip 3.41 kB), JavaScript 284.43 kB (gzip 86.81 kB), asset `index-Dd-maerp.js`.

The pause suite also exposed a 1 ms split: rounding active time and break time separately could disagree with rounding their sum. The published elapsed attribute is now the sum of those two rounded values. The visible clocks still use the floored second text. No movement totals were added to the Soundprint screen. Commit `56b9c06`.

### P1.11 — Turn the Soundprint result into a visual journey recap

**Status:** Done
**Kind:** Frontend visualization
**Commit subject:** Turn the Soundprint result into a visual journey recap
**Commit:** `56b9c06`

The Soundprint page reads `movement_summary` directly. A missing speed or an empty pace series shows "Not enough clear data". The page does not substitute a number.

**Done when.** A user can understand the journey and its musical influence primarily from visuals, with accessible text alternatives and no invented metrics.

**Notes.** Implemented in the working tree on October 9, 2026. The mobile order is the hero, glance tiles, route fingerprint, movement ribbon, three event cards, composition counts, the short story, and a closed "About this example" disclosure. Desktop keeps that order and widens the glance row to four tiles. The player, walker cursor, ribbon playhead, event cards, and story use `useAudioClock`. Marker seeks stay within 500 ms. The example shows active time 1:00, total time 1:00, distance 96 m, and 3 movement moments. Relative pace and average speed stay withheld because the shell summary has an empty pace series and a null speed. The route is one segment. Manual breaks and uncertain intervals are drawn only when the summary contains them, and a gap is a separate path from the movement line. Composition counts come from `event_counts`. Loops are 0. The disclosure starts closed and says location clarity is limited.

`npm run lint` and `npm run format` passed. `npm test` passed, 77 tests. `npm run build` passed: HTML 0.96 kB (gzip 0.47 kB), CSS 17.03 kB (gzip 4.21 kB), JavaScript 294.87 kB (gzip 89.59 kB), assets `index-C2SsGSJP.css` and `index-WdGtGbb4.js`. Against the Step 5 baseline in this file (HTML 0.91 kB gzip 0.45, CSS 11.53 kB gzip 3.12, JavaScript 268.74 kB gzip 82.09), CSS is 5.50 kB larger raw and 1.09 kB larger gzip, and JavaScript is 26.13 kB larger raw and 7.50 kB larger gzip. The same throttled-mobile test, about 1.6 Mbps down, 750 kbps up, 150 ms latency, and 4× CPU, recorded landing 1555 ms and the example 830 ms. The baseline sample was landing 1353 ms and the example 1113 ms. Document load was 364 ms and the document transfer was 1262 bytes. Encoded resource bytes were 0 because the preview assets were already cached. This is one warm sample, not a cold download and not a Lighthouse score. A browser pass of the preview confirmed the glance values, the withheld pace sentence, a turn card seek to 0:18 with a visible Now label, the story chapter Corner Now, and the closed disclosure opening onto the limited-clarity and withheld-speed sentences. Commit `56b9c06`.

### P1.12 — Animate the walk to Soundprint transformation

**Status:** Done
**Kind:** Frontend motion
**Commit subject:** Animate the walk to Soundprint transformation
**Commit:** `56b9c06`

One inline SVG walker is the ready, recording, paused, generation, and playback figure. Result motion follows the audio clock. Route drawing is one CSS pass. Numbers appear at their final values, so the result page does not run a second timer.

**Done when.** Motion explains state and causality, stops when irrelevant, and adds no WebGL or autoplay media.

**Notes.** Implemented with P1.11 on October 9, 2026. No new dependency. The landing figure includes the walker. Recording uses a stride pose. Pausing, paused, and resuming use a still pose. Generation swaps one figure across the four existing stage lines: route points, markers, a waveform, then a cover. The stage sentence stays the status. The figure does not show a percent. Playback places the walker on the route at the shared clock and strides only while audio is playing. `prefers-reduced-motion: reduce` leaves the route fully drawn, the walker still, and the glance numbers visible. Focus, press, and the generation status line remain. The reduced-motion recap test measured `animation-name: none` on the route path and the walker legs. The generation stage test still requires that line's animation duration to be under 1 ms when motion is reduced. Commit `56b9c06`.

### P1.13 — Verify the upgraded walk and Soundprint experience

**Status:** Done
**Kind:** Verify
**Commit subject:** Verify the upgraded walk and Soundprint experience
**Commit:** `56b9c06`

This pass fixes only issues found in the audit. It does not add a feature.

**Done when.** The required journeys, manual-break rules, analytics honesty, 500 ms synchronization, accessibility checks, widths, and performance notes have measured evidence. A step stays Partial until its commit hash exists.

**Notes.** Checked on October 9, 2026 from the working tree. Commands, all from the repository unless noted:

- `frontend`: `npm run typecheck` passed.
- `frontend`: `npm run lint` passed.
- `frontend`: `npm run format` passed.
- `frontend`: `PLAYWRIGHT_BROWSERS_PATH=/home/kernel-kain/.cache/ms-playwright npm test` passed, 78 tests in 30.0s.
- `frontend`: `npm run build` passed. HTML 0.96 kB (gzip 0.47 kB), CSS 17.55 kB (gzip 4.28 kB), JavaScript 295.96 kB (gzip 89.85 kB), assets `index-TWHbuoFw.css` and `index-DZG9-8kj.js`.
- `backend`: `uv run pytest tests/unit/test_fixtures.py` passed, 2 tests.
- `git diff --check` passed with no output.

Against the Step 5 baseline in this file (HTML 0.91 kB gzip 0.45, CSS 11.53 kB gzip 3.12, JavaScript 268.74 kB gzip 82.09), CSS is 6.02 kB larger raw and 1.16 kB larger gzip, and JavaScript is 27.22 kB larger raw and 7.76 kB larger gzip. Against the P1.11 build recorded above (CSS 17.03 kB gzip 4.21, JavaScript 294.87 kB gzip 89.59), this pass added 0.52 kB of CSS raw (0.07 kB gzip) and 1.09 kB of JavaScript raw (0.26 kB gzip).

The same throttled-mobile test, about 1.6 Mbps down, 750 kbps up, 150 ms latency, and 4× CPU, recorded landing 1456 ms and the example 1221 ms. Document load was 415 ms and the document transfer was 1262 bytes. Encoded resource bytes were 0 because the preview assets were already cached. The Step 5 sample was landing 1353 ms and the example 1113 ms. The P1.11 sample was landing 1555 ms and the example 830 ms. These are single warm samples, not a cold download and not a Lighthouse score.

The suite covers the required journeys: pause then resume then end, pause then end, paused restore after reload, permission denied, unsupported browser, offline and interrupted, short or unclear trace, generation timeout, arrangement unavailable, music unavailable, and the example result. Manual breaks stay out of distance, active time, detected pause events, and route connectors. Glance values come from the validated summary. A null speed and an empty pace series show an unavailable sentence. The page does not show calories, steps, heart rate, or elevation. Marker and card seeks stay within 500 ms of the route cursor, ribbon, and story. Keyboard coverage, dialog focus, axe serious and critical checks, 200% text at 360 px, and reduced-motion still states passed. Layout checks passed at 360, 390, 430, 768, and 1280 px.

Fixes in this pass: published numbers keep three decimal places, so 0.25 stays 0.25. Looping walker and recording-dot animations stay paused unless the element is on screen and the document is visible. The walk clocks, generation clock, and audio clock do not request another animation frame while the document is hidden. Generation updates its displayed second and stage only when those values change.

Unresolved: the 290-minute budget decision is still open. The slow-mobile numbers are warm-cache samples and move between runs. The full backend suite was not part of this check; only `tests/unit/test_fixtures.py` was run. Commit `56b9c06`.

### Daylight — Add a light theme beside Nocturne Pulse

**Status:** Done
**Kind:** Frontend theme
**Commit subject:** Add a Daylight theme beside Nocturne Pulse
**Commit:** `56b9c06`

Daylight is the light theme. Nocturne Pulse stays the dark theme. Both use one token list through `light-dark()`. `color-scheme` follows the device, and `data-theme` stores an explicit choice. A script in `index.html` sets the theme before the page paints. The header button is named Light theme or Dark theme.

**Done when.** A light device shows Daylight, a dark device shows Nocturne Pulse, and a stored choice wins after reload. Text and signal fills stay above 4.5:1.

**Notes.** Checked on October 9, 2026. Light surfaces are `#F4F1E8`, `#FFFDF8`, and `#E8E2D6`. Ink is `#172033` and muted ink is `#3C4A60`. Signals are deepened: route `#0C6B64`, music `#5536B0`, event `#8A4B00`, pause `#1A4E96`, coral `#B4232A`, with light label ink `#F8F5EE`. Measured contrast, WCAG relative luminance: text on those three surfaces is 14.40:1, 16.00:1, and 12.61:1. Muted text is 7.94:1, 8.83:1, and 6.96:1. Light ink on the five signal fills is 5.84:1, 7.59:1, 6.25:1, 7.49:1, and 6.00:1. Route on the paper background is 5.63:1.

`npm run typecheck`, `npm run lint`, and `npm run format` passed. `npm test` passed, 81 tests in 25.4s, including the Daylight, stored-choice, and dark-device tests. `npm run build` passed: HTML 1.55 kB (gzip 0.73 kB), CSS 19.03 kB (gzip 4.48 kB), JavaScript 297.02 kB (gzip 90.13 kB), assets `index-B0ADRuwh.css` and `index-B5vcvyQq.js`. Against the Step 5 baseline, CSS is 7.50 kB larger raw and 1.36 kB larger gzip, and JavaScript is 28.28 kB larger raw and 8.04 kB larger gzip. Against the P1.13 build (CSS 17.55 kB gzip 4.28, JavaScript 295.96 kB gzip 89.85), Daylight added 1.48 kB of CSS raw (0.20 kB gzip) and 1.06 kB of JavaScript raw (0.28 kB gzip). The throttled-mobile sample in this run was landing 1354 ms and the example 806 ms, document load 367 ms, document 1029 bytes, encoded resource bytes 0. Warm cache, not a Lighthouse score. No new dependency. Commit `56b9c06`.

### P1.10 — Apply the Nocturne Pulse visual system

**Status:** Done
**Kind:** Edit
**Commit subject:** Apply the Nocturne Pulse visual system
**Commit:** `56b9c06`

Replace the green-led palette across the landing, recording, generation, Soundprint, and `/system` screens. Keep the page structure, controls, route clock, and example labels.

**Done when.** The theme is coherent at the target widths and critical status does not depend on a gradient or color alone.

**Notes.** Implemented in the working tree. No new dependency. The old mint route color is retired. `--color-mint` and `--mint` now alias the route cyan so a leftover reference cannot stay green. `frontend/public/brand/trail-wash.svg` is replaced by one static contour file, `frontend/public/brand/contours.svg`, 773 bytes. It is a solid stroke, not a translucent wash. The signature cyan → violet → amber gradient is only on the landing hero route, the Soundprint cover, and a 3 px bar on the active chapter or moment. Buttons stay solid. Coral is only the end and destructive actions. At the time of this slice, walk pause was not a control yet; the pause blue is used for the route pause mark, the dashed pause moment, and the catalog chip. P1.8 later uses that same blue for the practice break gap. Playback Pause stays violet because it is a music control.

Contrast was measured with the WCAG 2.1 relative-luminance formula before these values were locked. The hardest text ground is the raised surface `#18233A`.

| Token | Final value | Contrast decision |
|---|---|---|
| `--color-bg` | `#080C18` | Candidate kept. |
| `--color-surface` | `#11182A` | Candidate kept. |
| `--color-surface-raised` | `#18233A` | Candidate kept. |
| `--color-text` | `#F7F7F2` | 18.16:1 on the background, 16.45:1 on the surface, 14.58:1 on the raised surface. |
| `--color-text-muted` | `#B9C2D6` | Candidate kept. 10.92:1, 9.89:1, and 8.77:1 on those same three grounds. |
| `--color-route` | `#53E6D8` | Candidate kept. 10.20:1 on the raised surface and 12.71:1 against the background. |
| `--color-music` | `#A78BFA` | Candidate kept. 5.76:1 on the raised surface, the lowest text signal, still above 4.5:1. |
| `--color-event` | `#FFB45C` | Candidate kept. 8.90:1 on the raised surface. |
| `--color-pause` | `#73B7FF` | Candidate kept. 7.42:1 on the raised surface. |
| `--color-coral` | `#FF6B6B` | Candidate kept for the control fill. Light text on this fill is 2.58:1, so it is not used for labels. |
| `--color-on-signal` | `#0C1220` | Added. Label ink on the bright fills: 12.18:1 on cyan, 6.87:1 on violet, 10.63:1 on amber, 8.86:1 on pause blue, and 6.74:1 on coral. |
| `--color-line` | `#5C6E90` | Adjusted. 3.80:1 on the background, 3.44:1 on the surface, and 3.05:1 on the raised surface, so a border can identify a control. |
| `--color-focus` | `#F7F7F2` | 18.16:1 on the background. The same light ring is about 1.4:1 on cyan and about 2.5:1 on violet and coral, so the 3 px outline is offset 3 px onto the field. |
| `--color-warning` | `#FFB4A8` | Kept for alert borders. It is not the end-walk color. 10.39:1 on the surface. |
| `--color-contour` | `#23334C` | Decorative only, 1.53:1 against the background. Text on that stroke is still 11.85:1 and muted text is 7.12:1. Violet on it is 4.68:1 and coral is 4.59:1. |

The white hold-progress overlay at 28% opacity lightens coral to about `#FF9494`. Dark label ink on that composite is 8.83:1, so the existing progress treatment stays. Filled controls also clear 3:1 against the background: cyan 12.71, violet 7.17, amber 11.09, pause blue 9.24, coral 7.03.

`npm run typecheck`, `npm run lint`, and `npm run format` passed. `npm test` passed, 45 tests, after pointing Playwright at the installed browser cache. Those tests include axe on `/`, `/studio`, `/about`, and `/system`, and no horizontal overflow at 360, 390, 430, 768, and 1280 px. `npm run build` passed: `dist/index.html` 0.96 kB (gzip 0.47 kB), CSS 13.04 kB (gzip 3.39 kB), JavaScript 269.54 kB (gzip 82.25 kB). CSS grew about 1.5 kB from the theme. JavaScript gzip stayed about 82 kB. A browser pass of the preview opened the landing, started a practice walk, showed Recording with the cyan route and the coral end control, opened generation, played the example, and sought the turn. `/about` settled on `/#how-it-works`. Computed colors matched the tokens above, and the same five widths had no horizontal overflow in that browser. No active time was measured. Commit `56b9c06`.

---

## P2 — Real recording and movement engine

**Branch:** `build/movement`
**Window:** Build hours 7–11 (240 minutes)
**Outcome:** Real capture, four detectors, compression, and an exact Route Sketch Hook.
**Phase note:** P2.1 through P2.5 are committed. P2.6 and P2.0 are pending. The user will record the outdoor walk and deploy to Render after the rest of the build. No events will be invented to fill that walk. The recording and generation seams are the practice port and `frontend/src/studio/generationContract.ts`. Use the public states in `Docs/FRONTEND_EXPERIENCE.md`. Do not restore sponsor, provenance, or fixture-picker sections.

### P2.0 — Publish the shell and health endpoint

**Status:** Pending
**Kind:** Release · user-directed · AC-07
**Commit subject:** Record the public shell and health endpoint

After `build/experience` is pushed, create the Render Blueprint from `deploy/render.yaml`, deploy it manually, and record the public page and `/health`.

**Done when.** The public HTTPS page and `/health` both work.

**Notes.** Pending on October 10, 2026. The user will deploy `deploy/render.yaml` and record the public page and `/health` after the rest of the build. Local build and tests continue. Provider keys stay in the Render dashboard.

### P2.1 — Record browser movement and recover local drafts

**Status:** Done
**Kind:** Edit · 40 minutes · AC-01, AC-14
**Commit subject:** Record browser movement and recover local drafts

Record permissioned browser location, keep samples bounded, and store the draft in IndexedDB.

**Done when.** Start and end stop the watch, and a reload recovers the draft. There is no upload interface.

**Notes.** Implemented on `build/movement` on October 10, 2026. Commit `e0c6c94`.

The public page, with `footwork-practice` unset, asks for location and keeps one draft in IndexedDB database `footwork`, store `drafts`, key `current`. Consent version is `1`. Samples need finite coordinates, accuracy no worse than 50 m, at least one second since the previous kept sample, and the draft stops at 3,000 samples. Start and end call `clearWatch`. Pause also stops the watch and a reload restores that paused draft. An ended draft stays stored and does not resume. A draft older than 24 hours is deleted on read. The page does not show coordinates, a file input, or a generated piece. Wake Lock and hidden-page gaps stay in P2.2. Accuracy jumps and trace quality stay in P2.3.

Practice screens still run when `footwork-practice` is `granted`, `denied`, `unsupported`, `offline`, or `interrupted`. Frontend tests set `granted` when the key is empty so the existing practice journey stays covered. The public page does not set the key.

`npx tsc -b --pretty false`, `npm run lint`, and `npm run format` passed. `PLAYWRIGHT_BROWSERS_PATH=/home/kernel-kain/.cache/ms-playwright npm test` passed, 86 tests, including the five capture tests. The test command builds the frontend before it starts. No new dependency. No active time was measured.

### P2.2 — Handle recording interruptions and screen visibility

**Status:** Done
**Kind:** Edit · 40 minutes · AC-01, AC-11
**Commit subject:** Handle recording interruptions and screen visibility

Record visibility gaps, add a wake lock where the browser allows it, and explain how to keep the page visible.

**Done when.** Hiding and resuming the page marks an interruption, and the interface does not promise screen-off recording.

**Notes.** Implemented on `build/movement` on October 10, 2026. Commit `61ec939`.

Hiding the page during a live recording stops the watch, freezes active time, and stores an open hidden gap. The page says the missing positions were not filled in and that recording does not continue after the phone locks. Continue asks for a new fix and then closes the gap. A paused walk is left paused. A reload of an open gap returns to that interruption. When the browser allows it, a screen wake lock is held only while recording and is released when the page is hidden, paused, or ended. Draft saves are queued so an earlier write cannot replace a newer one.

`npx tsc -b --pretty false` and `npx eslint` on the recording files passed. `PLAYWRIGHT_BROWSERS_PATH=/home/kernel-kain/.cache/ms-playwright npm test` passed, 89 tests. The test command builds the frontend before it starts. No new dependency. No active time was measured.

### P2.3 — Validate and clean recorded movement samples

**Status:** Done
**Kind:** Edit · 40 minutes · AC-09, AC-14
**Commit subject:** Validate and clean recorded movement samples

Validate, clean, and project samples in Python, and score route quality.

**Done when.** Noise, impossible jumps, and invalid timestamps are rejected, and a low-quality trace is explained.

**Notes.** Implemented on `build/movement` on October 10, 2026. Commit `aef013b`.

`backend/app/movement/clean.py` accepts samples and optional recorded gaps. It drops non-finite or out-of-range coordinates, non-positive timestamps, negative accuracy, accuracy worse than 50 m, samples closer than one second, samples past 30 minutes from the first kept sample, and movement faster than 12 m/s when the interval is not an open gap. It does not sort timestamps into a new order. Distance and active time are not added across an interval longer than 15 seconds or across a recorded gap. Kept samples are projected in meters from the first kept point. A usable trace needs at least 90 seconds of active time, 30 kept samples, and 60 meters. A short or short-distance trace is `trace_too_short`. A trace that only lacks 30 clear positions is `trace_unclear`. The public result has relative time and meters only.

`uv run ruff check .` and `uv run ruff format --check .` passed. `uv run pytest` passed, 15 tests, including six cleaner tests. No new dependency. No active time was measured.

### P2.4 — Detect turns, pace changes, pauses, and loops

**Status:** Done
**Kind:** Edit · 40 minutes · AC-09
**Commit subject:** Detect turns pace changes pauses and loops

Implement the four detectors with positive and negative fixtures.

**Done when.** Turn, pace, pause, and loop fixtures pass, and control traces do not gain invented events.

**Notes.** Implemented on `build/movement` on October 10, 2026. Commit `b913a93`.

`backend/app/movement/detect.py` reads a cleaned trace. It finds a turn when the heading changes by at least 60 degrees across about 12 meters of straight approach and departure. It finds a pace change when smoothed speed changes by at least 30 percent and the new speed holds for about 10 seconds, and both speeds stay at or above 0.5 meters per second. It finds a pause when speed stays under 0.5 meters per second for at least 10 seconds. It finds a loop when the route returns within 20 meters of an earlier stretch after at least 60 seconds and 100 meters, and the path left that neighborhood in between. Gaps are not treated as movement. An unusable trace produces no events. A trace can be usable and still have only some of the four events.

`uv run ruff check .` and `uv run ruff format --check .` passed. `uv run pytest` passed, 27 tests, including 12 detector tests. No new dependency. No active time was measured.

### P2.5 — Generate synchronized route sketches from movement events

**Status:** Done
**Kind:** Edit · 40 minutes · AC-02, AC-10, AC-14, AC-17
**Commit subject:** Generate synchronized route sketches from movement events

Compress the journey, transform the route for display, and synthesize the deterministic Route Sketch.

**Done when.** The automated turn and pause Hook test passes, the shared map stays in order, and the audio is valid.

**Notes.** Implemented on `build/movement` on October 10, 2026. Commit `6535866`.

`backend/app/movement/sketch.py` compresses a cleaned trace onto a 60-second timeline. The melody falls until the first turn and rises after it. The pause is silence until the next event, or for 10 seconds. Turn and pause times are chapter boundaries. The shared map keeps source and audio intervals in order, without overlap, from the start of the walk to 60 seconds. Up to eight events open chapters. Every detected event stays in the metadata. Display points are recentered, rotated onto their long axis, and scaled into the unit square. A short stretch is trimmed from each end. The summary says the shape can still be identifying. An unusable trace does not receive invented turn or pause events.

`uv run ruff check .` and `uv run ruff format --check .` passed. `uv run pytest` passed, 33 tests, including six sketch tests. No new dependency. No active time was measured. Headphones listening is still outstanding for AC-17.

### P2.6 — Validate the movement pipeline with a real outdoor walk

**Status:** Pending
**Kind:** Verify · 40 minutes · AC-01, AC-09, AC-14
**Commit subject:** Validate the movement pipeline with a real outdoor walk

The user records the outdoor seed walk. Inspect the derived events and save only the approved sanitized fixture.

**Done when.** The real recording shows useful events, and the raw trace stays out of Git.

**Notes.** Pending on October 10, 2026. The user will record one real outdoor walk after the rest of the build. A synthetic trace will not be saved as that walk. The raw coordinates stay out of Git.

---

## P3 — Sponsor-backed Soundprint

**Branch:** `build/soundprint`
**Window:** Build hours 11–15 (240 minutes)
**Outcome:** Live Gemma and Eleven Music adapters, job controls, and one reviewed Studio result. Feature freeze is at the end of this phase.
**Phase note:** P3.1 is commit `4e9e844`. P3.2 is commit `d23b469`. P3.3 is commit `ab02558`. P3.4 is commit `0f44b87`. P3.5 is commit `98081fb` and is pending: the user will review the seed Studio track after the rest of the build, so AC-03 is not claimed. A finished walk returns Route Sketch while the Gemma Space is unproved. AC-04 stays blocked. P2.6 and P2.0 are pending. P3.6 is commit `27ed855` and records the feature freeze. Generation uses the stage codes and error codes in `Docs/FRONTEND_EXPERIENCE.md`. Retry is explicit. The same idempotency key and body do not start a second piece. Transport paths now follow the locked `/api/v1` contract.

### P3.1 — Add protected generation jobs and durable usage limits

**Status:** Done
**Kind:** Edit · 40 minutes · AC-08, AC-14, AC-15
**Commit subject:** Add protected generation jobs and durable usage limits

Add job endpoints, per-job capability checks, the quota ledger, and idempotency.

**Done when.** Duplicate, restart, and quota tests pass, and budget is reserved before a provider is called.

**Notes.** Implemented on `build/soundprint` on October 10, 2026. Commit `4e9e844`.

`POST /api/v1/soundprints` accepts a finished walk, `X-Idempotency-Key`, and a 256-bit `X-Job-Key`. The server stores only hashes of the key, the capability, and the raw body. The same key and body return the same job. A changed body returns 409. One job can be active. Status, audio, and deletion require `Authorization: Bearer` with that capability. The ledger is an atomic JSON file under `var/jobs/`, which is gitignored. Before the dispatch hook runs, the ledger reserves one Gemma attempt, 60 GPU seconds, and one Eleven attempt, inside the daily caps of four attempts, 240 GPU seconds, and six Eleven attempts. The default hook does not call Gemma or Eleven. An exception from the hook is recorded as an unknown outcome and the reservation stays. A new process marks an active job interrupted and keeps the reserved counts. Deleting a job does not refund the reservation. Coordinates, capabilities, and idempotency keys are not written to the ledger. `GET /api/v1/capabilities` reports generation as open or capped and both providers as unavailable. It does not report balances.

A repeated finished walk is the same attempt only when the client reuses the idempotency key. After an interruption, a new key is a new reserved attempt, which matches the restart rule that retry is an explicit budgeted action. No per-client cooldown duration is locked, and there is no account, so the single active job is the concurrency control. Audio range requests are not implemented; an authorized artifact is returned in full.

`uv run --directory backend ruff check app tests/unit/test_jobs.py` passed. `uv run --directory backend ruff format --check` passed for the job files. `uv run --directory backend pytest` passed, 44 tests. No new dependency. No active time was measured. AC-15 is covered by the duplicate, conflict, quota, restart, and unknown-outcome tests. AC-14 is covered by capability checks and the ledger redaction checks. AC-08 is not measured yet; this step stores elapsed time and does not run a timed provider.

### P3.2 — Integrate Gemma arrangement generation and validation

**Status:** Done
**Kind:** Edit · 40 minutes · AC-04, AC-06
**Commit subject:** Integrate Gemma arrangement generation and validation

Call Gemma with an anonymous event timeline and validate the arrangement. Allow at most one repair.

**Done when.** A valid plan is produced, and invalid output becomes an honest Route Sketch.

**Notes.** Implemented on `build/soundprint` on October 10, 2026. Commit `d23b469`.

`backend/app/arrange/gemma.py` builds an anonymous timeline from event id, type, and audio offset. It strips location fields before any call. A reply is accepted only when the mood is `warm_cinematic`, the style list is one to six words from the closed instrumental vocabulary and includes `instrumental`, and every event reference matches the timeline. A fenced JSON object is parsed locally. Schema-invalid output may be submitted once, with field codes only, when another Gemma attempt, 60 GPU seconds, and 90 seconds of deadline remain, and only after an optional reservation succeeds. A transport exception is not repeated. Failure returns `arrangement_unavailable` and `route_sketch` with no invented plan. `pace_change` ids that contain an underscore are renamed into the shared hyphen pattern. `SpaceArrangeClient` can call `/arrange`, and it was not used. The Space recorded in `Docs/evidence/gemma-access.md` is still `NO_APP_FILE`, so this step does not claim a live checkpoint result.

`uv run --directory backend ruff check app/arrange tests/unit/test_arrange.py` passed. `uv run --directory backend ruff format --check` passed for those files. `uv run --directory backend pytest` passed, 52 tests. No new dependency. No active time was measured. AC-06 is covered by the invalid-plan and transport tests. AC-04 remains blocked until a named Gemma call returns a validated arrangement.

### P3.3 — Render validated arrangements with Eleven Music

**Status:** Done
**Kind:** Edit · 40 minutes · AC-05, AC-17
**Commit subject:** Render validated arrangements with Eleven Music

Compile timed Music v2.5 chunks, call the Eleven Music API, and check the returned audio.

**Done when.** A genuine audio receipt exists, and an ambiguous network failure is not retried automatically.

**Notes.** Implemented on `build/soundprint` on October 10, 2026. Commit `ab02558`.

`backend/app/music/render.py` compiles a validated arrangement into Music v2.5 chunks that total 60 seconds. Each chunk is at least 3 seconds. A turn at 12 seconds and a pause at 30 seconds become chunk boundaries, and the pause is a 10-second hold. Chunk text is a section label only. Vocals, lyrics, and speech are negative styles. The request sends `model_id` `music_v2_5` and a composition plan. It does not send a prompt or `force_instrumental`. The client is httpx. A timeout, a lost connection, an HTTP error, or audio outside 44.5–60.5 seconds is recorded once and is not sent again.

One live compose returned HTTP 200 `audio/mpeg` on the first attempt. The request SHA-256 is `5100159eda409713310806b37b8199cbf25cbc3929a06bf56456407b08c84e19`. The provider song id is `6JZhKLyXn9BrPEPAnUQC`. The file is 960515 bytes and `ffprobe` measured 60.029375 seconds. It is stored at `artifacts/eleven-arrangement.mp3`, which git ignores. The API key is not recorded. Evidence is in `Docs/evidence/music-hosting.md`.

`uv run --directory backend ruff check app/music tests/unit/test_music.py` passed. `uv run --directory backend ruff format --check` passed for those files. `uv run --directory backend pytest` passed, 57 tests. No new dependency. No active time was measured. AC-05 is covered by the receipt. AC-17 duration and decode checks passed. Headphone listening remains for P3.5. This renderer is not called by job submission yet.

### P3.4 — Connect recorded walks to live Soundprint generation

**Status:** Done
**Kind:** Edit · 40 minutes · AC-01, AC-06, AC-08, AC-18
**Commit subject:** Connect recorded walks to live Soundprint generation

Replace fixture generation with the live job flow without rebuilding the accepted interface.

**Done when.** A real recording reaches Studio or Route Sketch, and the mode and stages match what happened.

**Notes.** Implemented on `build/soundprint` on October 10, 2026. Commit `0f44b87`.

A finished walk is submitted to the existing job endpoint. The reservation still happens first. The walk trace stays in memory for that call and is not written to the ledger. The job then detects moments, builds the Route Sketch, and asks for an arrangement. The arrangement space is still unproved, so that call fails closed and does not contact the Space. The result mode is `route_sketch`, the stage is `shaping_music`, and the audio is the sketch wav. A validated plan is the only path that asks Eleven for audio. A failed or lost music response is not sent again, and the mode stays `route_sketch` at stage `recording_piece`. A checked music file would be `studio_live`. The result uses the same soundprint contract as the example. Coordinates are not stored in the ledger.

The live walk screen submits when the walk finishes and opens the existing studio screen. That screen polls the job and shows the server stage, then the result. Example and practice walks still use the example. Public capabilities still report both providers unavailable.

A corner-shaped recording submitted through the API returned `route_sketch` with one turn and no music call. `frontend/tests/fixtures/route-sketch-result.json` is that result, and `validateSoundprintResult` accepted it. A lost music response stayed a sketch after one render call. `uv run --directory backend pytest` passed, 60 tests. Frontend typecheck, ESLint, and Prettier passed for the touched files. The Playwright browser binary was not installed in this environment, so the studio page was not clicked through here. AC-06 is covered by the lost-render test. AC-18 is covered by the shared-contract check. AC-08 was not timed on a phone network. AC-01 remains blocked until the outdoor seed walk. No new dependency. No active time was measured. No second music request was made.

### P3.5 — Verify and cache the real walk demonstration track

**Status:** Pending
**Kind:** Verify · 40 minutes · AC-03, AC-05, AC-17
**Commit subject:** Verify and cache the real walk demonstration track

Listen to the seed Studio track, timestamp three movement mappings, and store the cached example.

**Done when.** The turn, the pause, and a third mapping are perceptible. If they are not, AC-03 is recorded as failed. Stay inside the attempt cap.

**Notes.** Pending on October 10, 2026. Commit `98081fb`. The user will listen to the seed Studio track after the rest of the build. No listening review was recorded and no cached example was stored.

P2.6 still has no outdoor walk. The live job path returns `route_sketch` because the Gemma Space is unproved, so a submitted walk does not become `studio_live`. The file `artifacts/eleven-arrangement.mp3` is the October 10 arrangement proof: 60.029375 seconds, song id `6JZhKLyXn9BrPEPAnUQC`. It was not made from a seed walk, and it has not been heard for the turn, the pause, and a third mapping. AC-03 needs that hearing. A waveform or duration check would not replace it. No music request was made for this step. The daily attempt cap is unchanged. AC-03 is not marked passed and is not marked failed.

### P3.6 — Verify provider fallbacks and freeze the feature set

**Status:** Done
**Kind:** Verify · 40 minutes · AC-06, AC-08, AC-11, AC-15, AC-18
**Commit subject:** Verify provider fallbacks and freeze the feature set

Check provider failure, deadline, quota, and fixture parity. Freeze features at build hour 15.

**Done when.** The same trace can fall back to Route Sketch, the cached example stays separately labeled, and the freeze is recorded.

**Notes.** Verified on `build/soundprint` on October 10, 2026. Commit `27ed855`.

The same corner walk falls back to `route_sketch` when the arrangement call fails and when a validated plan's music response is lost. Neither result uses `cached_example` or `synthetic_fixture`, and neither is marked `human_reviewed_studio`. The bundled example stays `synthetic_fixture` and is labeled Example walk. `cached_example` uses that same label. `route_sketch` and `studio_live` stay labeled Generated from your walk. No separate cached Studio file was stored, because the seed track review is still pending.

The client still ends a live attempt at 180 seconds. The public failure sentences and the retry set are locked in `frontend/tests/freeze.spec.ts`. A quota limit is not retryable. A repeated request still reserves once, and a restart still keeps that reservation, in the existing job tests. Cached playback was not timed on a phone network, so the five-second network part of AC-08 is not claimed. `uv run --directory backend pytest` passed, 61 tests. The three freeze checks passed. No new dependency. No active time was measured. No music request was made.

Feature freeze is recorded at the end of this phase. Elapsed build time is still unmeasured, so this is the phase boundary the plan places at hour 15, not a measured clock. Later phases are fixes and release checks. New user-facing features stop here. The outdoor walk, the seed Studio review, and the Render deploy are pending until after the rest of the build. The Gemma Space stays unproved.

---

## P4 — Release verification

**Branch:** `build/release`
**Window:** Build hours 15–17 (120 minutes)
**Outcome:** Privacy, accessibility, responsive, and failure checks, then the final deployed release.
**Phase note:** P4.1 through P4.3 are committed on `build/release`. P4.4 has a local release record and is blocked until the user deploys. Fixes only. No new features.

### P4.1 — Harden location privacy and generation access controls

**Status:** Done
**Kind:** Verify · 30 minutes · AC-14, AC-15
**Commit subject:** Harden location privacy and generation access controls

Audit secrets, payloads, authorization, logs, and retention.

**Done when.** Coordinates and secrets are absent from the inspected artifacts, another job's capability is denied, and caps survive a restart.

**Notes.** Verified on `build/release` on October 10, 2026.

The audit found three gaps. Deleted and expired jobs left their audio files on disk. A random wrong key was tested, but another live job's capability was not. Job logs did not exist, so a later log call could have written the raw request.

A result that contains a location field is refused before any audio file is written, and the reservation stays. Delete and expiry remove that job's `audio` file and leave the quota ledger in place. Status, audio, and deletion still require the matching capability: job B's key is denied for job A. The access log is an allowlist of job id, status, stage, mode, error code, and elapsed time. A logger filter drops lines that still contain a location word, an authorization header, or an `sk-` token. Public fixtures were already free of location keys. No new dependency.

`uv run --directory backend ruff check .` passed. `uv run --directory backend ruff format --check .` passed. `uv run --directory backend pytest` passed, 65 tests. No active time was measured. AC-14 is covered by the ledger, log, and refused-result checks. AC-15 is covered by the existing restart test and by a new process that still sees the reserved cap after the audio file is removed.

### P4.2 — Fix accessibility and responsive layout issues

**Status:** Done
**Kind:** Verify · 30 minutes · AC-12, AC-13
**Commit subject:** Fix accessibility and responsive layout issues

Check keyboard use, contrast, reduced motion, and the 390 px and 1280 px layouts.

**Done when.** The core flow works at both widths and by keyboard. Fix required failures only.

**Notes.** Verified on `build/release` on October 10, 2026.

No required layout or keyboard failure turned up, so no component or token change was made. Focus outlines were already present, and body text, headings, muted copy, and primary actions stayed at or above 4.5:1 in both themes. The border line color is not used as text.

`frontend/tests/release-a11y.spec.ts` now walks the live path. At 390 px and 1280 px, the keyboard starts the walk, accepts location, and pauses it, with the pause control inside the viewport and no horizontal overflow. The example Play control and scrubber work from the keyboard at both widths. Light and dark home and studio pages pass axe serious and critical checks and the same contrast floor. With reduced motion, two Enter presses end the walk, and Hear the example is reachable from the keyboard. `PLAYWRIGHT_BROWSERS_PATH=$HOME/.cache/ms-playwright npx playwright test tests/release-a11y.spec.ts` passed, 9 tests. Prettier and ESLint passed for that file. No active time was measured. AC-12 and AC-13 are covered by that run.

### P4.3 — Verify the release journey and synchronization contracts

**Status:** Done
**Kind:** Verify · 30 minutes · AC-02, AC-10, AC-11, AC-18
**Commit subject:** Verify the release journey and synchronization contracts

Run the contract tests, the browser journey, and the targeted failure cases.

**Done when.** The automated Hook test and the release journey pass. Any criterion still open is written down.

**Notes.** Verified on `build/release` on October 10, 2026.

The Hook tests passed. The composer and the browser synthesizer both drop the tone into the turn and keep the pause quieter than the moving section, within 500 ms. The example page keeps the route, graph, and story within 500 ms of the audio clock when scrubbed or when a marker is chosen. The live sketch journey now serves that same synthesizer and, after the turn card is chosen, keeps the route cursor, ribbon, story, and audio element within 500 ms of the turn at 28 seconds.

`uv run --directory backend pytest tests/unit/test_sketch.py tests/unit/test_flow.py tests/unit/test_fixtures.py` passed, 12 tests. Playwright passed 47 tests across the fixture contract, freeze labels, studio failures, practice journey, playback, markers, and the live sketch, then 8 capture tests for permission denial, offline, a missing location API, a hidden gap, and wake lock. Prettier left `frontend/tests/live-job.spec.ts` unchanged and ESLint passed. No active time was measured.

Still open, and not claimed by this step: AC-01 needs the outdoor walk. AC-03 needs the seed Studio listening review. AC-04 stays blocked while the Gemma Space is unproved. AC-08 was not timed on a phone network. The saved route-sketch fixture has a turn and no pause, so the pause half of the Hook is proven on the composer and the example synthesizer, not on that fixture. No headphones listening was done in this run.

### P4.4 — Prepare the verified public release and rollback record

**Status:** Blocked
**Kind:** Release · 30 minutes · AC-07, AC-08, AC-14
**Commit subject:** Prepare the verified public release and rollback record

The user deploys the reviewed release. Record the smoke check, the rollback commit, and cleanup settings.

**Done when.** The public URL is healthy, the example plays, and the live caps are correct.

**Notes.** Prepared on October 10, 2026, on `build/release`. No Render service was created, and no public URL was checked.

The blueprint already named the persistent disk, but the app stored jobs under `var/jobs` and ignored those variables. A production process now refuses to start unless `LEDGER_PATH` and `ARTIFACT_DIR` are both set. With the blueprint values, the ledger is `/var/footwork/quota.json` and audio is under `/var/footwork/artifacts`. Tests that pass a data directory still use that directory. Daily caps read `MAX_GEMMA_ATTEMPTS_PER_DAY`, `MAX_GEMMA_GPU_SECONDS_PER_DAY`, and `MAX_MUSIC_ATTEMPTS_PER_DAY`, and a higher value is clamped to 4 attempts, 240 GPU seconds, and 6 music attempts. The blueprint now lists the music cap as 6. `GENERATION_ENABLED` must be the string `true` before the installed dispatcher can call Eleven. It is `false` in the blueprint, so the public release keeps the unproved arrangement space and does not call music. Secret names stay `sync: false`. No secret value is in the blueprint.

Cleanup: when a ledger file already exists, process startup runs the same expiry pass as a request. Ready audio is removed 60 minutes after it becomes ready. Ledger rows stay for 48 hours. Delete removes that job's audio. Spent quota is not refunded.

Smoke check, after the user deploys this reviewed commit manually with `autoDeployTrigger` left off:

1. `GET /health` returns status `ok`, API version `v1`, and schema version `1`.
2. `/` and `/studio` return the built shell. The cached Studio piece is the example, labeled Example walk.
3. Dashboard caps stay at 4, 240, and 6. `GENERATION_ENABLED` stays `false`.
4. Set `PUBLIC_BASE_URL`, `HF_SPACE_URL`, `HF_TOKEN`, `GEMMA_MODEL_ID`, `GEMMA_MODEL_REVISION`, `ELEVENLABS_API_KEY`, and `ELEVEN_MUSIC_MODEL` in the dashboard only.

Rollback: redeploy `6915426` and leave `GENERATION_ENABLED` false. That commit is the last verified application commit. It does not read the disk paths, so use it only to restore the previous process. No earlier Render deploy exists to restore.

`uv run --directory backend pytest` passed, 69 tests. `uv run --directory backend ruff check .` passed, and the format check passed. AC-07 stays open until the public HTTPS check. AC-08 was not timed on a phone network. AC-14 is covered by the capability, redaction, and disk-path checks already in the suite. No active time was measured.

---

## P5 — Demo and submission

**Branch:** `build/submission`
**Window:** Build hours 17–20 (150 minutes, plus a 30-minute emergency buffer)
**Outcome:** Demo video, DEV article, README, links, and the final evidence record.
**Phase note:** Not started. Depends on P4. Sponsor roles and technical provenance belong in the README and submission evidence, not in the application UI.

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
