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

The final product polish is commit `be8e2e1` on `final-product-polish`. The landing has no raw-coordinate download. A recording shows the 1 minute 30 second active-time line, and ending announces saving before generation. One anonymous browser installation can be admitted for eight jobs a day when the separate global provider budget allows it. The theme control is a sun or moon icon whose accessible name is still Light theme or Dark theme. Three movement cards explain a turn, a pause, and a pace change, and each preview plays only when asked. The Soundprint is one album-style result on one audio element and one clock. Automated backend and frontend checks passed on October 12, 2026. Feature freeze is restored for further product changes. Three gates remain with the user: confirm the provider budget before changing any deployed cap, review the flow on a real phone, and deploy this work before running the public smoke checklist in `Docs/HANDOFF_2.md`. The public service at https://footwork-m6g0.onrender.com/ does not yet include this uncommitted work. `deploy/render.yaml` was not changed: it still lists `GENERATION_ENABLED` as `false` and global caps of 4 Gemma attempts, 240 GPU seconds, and 6 music attempts. The spec remains [`Docs/PHASE_5_FINAL_POLISH_PLAN.md`](Docs/PHASE_5_FINAL_POLISH_PLAN.md). Branch names and commit subjects for this work use descriptive language only and never include phase or step identifiers.
