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

The application has two public pages. `/` is the landing page and the practice walk. `/studio` is the Soundprint. `/about` opens How it works on `/`.

Sponsor roles and technical provenance stay in `Docs/HANDOFF_1.md`, `Docs/FRONTEND_EXPERIENCE.md`, and `Docs/PRODUCT_CONCEPT.md`. They are not sections in the application. Gemma is the planned open-weight arrangement model, ElevenLabs is the planned studio recording service, and Render is the planned public host. The current example does not call them.

The Phase 1 UI/UX extension is specified in [`Docs/PHASE_1_UI_UX_PLAN.md`](Docs/PHASE_1_UI_UX_PLAN.md). Pause and resume, Nocturne Pulse, the Daylight light theme, the movement summary, the visual journey recap, and the walker are on this branch. The plan remains the spec.
