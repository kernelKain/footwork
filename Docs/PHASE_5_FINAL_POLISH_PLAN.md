# Phase 5 final product polish plan

**Status:** Approved for planning on October 12, 2026. Implementation has not started.

**Branch:** `final-product-polish`

**Position in the roadmap:** This phase is inserted after Phase 4. The former Phase 5, Demo and submission, becomes Phase 6.

## 1. Outcome

Phase 5 is the final product-facing pass before submission. It removes a location-export feature, makes recording and processing expectations obvious, increases the number of pieces one phone can create, replaces the text theme switch with an accessible icon control, rebuilds the landing-page movement examples, and turns the Soundprint into a more polished, animated result.

The phase must end with a release candidate, not another open-ended design iteration. Phase 6 remains documentation, demo, and submission only.

## 2. Product principles

1. **Protect the route.** Raw coordinates must never be offered as a browser download or appear in the result, logs, repository, share URL, or analytics.
2. **Set expectations before failure.** The recording screen states the 90-second active-walk minimum before the person ends a walk.
3. **Show work in progress.** Saving, submitting, and generating are explicit states with text announcements; the interface never appears frozen.
4. **Make visuals causal.** A route event and its musical consequence must be visually connected, not shown as unrelated decoration.
5. **Animate from product state.** Result motion follows playback, loading, or selection. No decorative infinite animation and no WebGL or animation-library dependency.
6. **Keep accessibility equivalent.** Icon controls have names, animated information has a text equivalent, and reduced motion preserves the same state and meaning.
7. **Freeze after this phase.** Phase 5 suggestions are deliberately limited to the existing two-page experience and the existing React, SVG, CSS, FastAPI, and file-ledger architecture.

## 3. Required changes

### 3.1 Remove the private walk download

Remove all of the following:

- The **Download the walk stored on this phone** action.
- Its warning text about the downloaded file containing the walk location.
- `frontend/src/recording/privateWalkFile.ts`.
- `frontend/tests/private-walk.spec.ts` and any now-obsolete imports, props, and state.
- The landing footer sentence **Footwork practice. A real walk is not saved on this page.**

This does not remove the local draft needed while a live walk is in progress. The local draft remains an internal recovery mechanism and is never exposed as a raw-coordinate file.

**Additional privacy improvement:** after the server accepts a finished walk, clear its raw-coordinate draft from IndexedDB. If submission fails before acceptance, keep it only long enough to show recovery and provide a clearly named **Delete saved walk** action. Expired ended drafts are removed automatically.

**Acceptance:** no public control can export coordinates; a repository search finds no user-facing download copy or `privateWalkFile`; accepted jobs leave no finished raw-coordinate draft on the phone.

### 3.2 Explain recording readiness

The backend already requires at least 90 seconds of accepted active movement, 60 metres of accepted distance, and 30 accepted samples. Time is the only requirement the recording screen can explain continuously without pretending GPS quality is certain.

Show one line directly below the active timer:

> Walk for at least 1 min 30 sec of active movement for a reliable Soundprint.

While recording, append a compact state derived from active time:

- Before 90 seconds: `0:54 of 1:30 minimum`.
- At or after 90 seconds: `Minimum time reached`.

Ending must remain available at all times for safety. If the person ends early, confirm that the walk may be too short before submitting it; do not trap them in recording.

**Acceptance:** guidance is visible in live recording and accessible by screen reader, pause time does not advance the minimum, and the threshold matches `MIN_ACTIVE_MS` in the backend.

### 3.3 Show saving and processing immediately

Introduce an explicit post-recording transition rather than silently moving from **Walk saved** to `/studio`:

1. `Saving your walk on this phone…`
2. `Walk saved. Turning your movement into music…`
3. `/studio` continues with the existing named generation stages.

The current active step is exposed through `role="status"`; duplicate submissions and repeated taps are prevented. A failure ends in a real recovery state with the existing error contract.

**Acceptance:** a slow request always shows progress text, the job is submitted once, and keyboard/screen-reader users receive one polite announcement per state change.

### 3.4 Increase same-phone generation allowance safely

The current release limit is global: four Gemma attempts, 240 GPU seconds, and six music attempts per UTC day. It is not a per-phone limit. Phase 5 replaces that confusing behavior with two guards:

- **Per-install allowance:** eight accepted generation jobs per UTC day by default.
- **Global provider budget:** a separately configurable daily ceiling that prevents all phones together from exhausting paid or limited provider capacity.
- **Concurrency:** keep one active generation job at a time.

Create a random 256-bit install token on the phone and keep it in local storage. Send it only as an opaque client header. Store only a namespaced cryptographic digest in the server ledger; do not fingerprint the device or collect hardware, advertising, account, IP, or location identifiers for quota purposes.

The deployment values remain environment-controlled and clamped to reviewed safe maxima. Before raising the global production ceiling, record the current Hugging Face and Eleven Music budget. Distinguish these messages:

- Per-install cap: `This phone has made today's pieces. New pieces are available tomorrow.`
- Global cap: `The studio has reached today's generation limit. Hear the example or try tomorrow.`

**Acceptance:** one phone can complete eight admitted jobs in a day when the global budget allows it; a ninth is rejected before provider dispatch; another install has its own allowance; restart, race, and idempotency tests still pass; the ledger contains no raw install token.

### 3.5 Replace the theme text with an icon

Use the existing `IconButton` component and code-native SVG:

- Show a sun when activating Daylight.
- Show a moon when activating Nocturne Pulse.
- Put the action name on the button with `aria-label`, not on the SVG.
- Keep a minimum 44-by-44-pixel target, visible focus, and current theme persistence.

No visible `Light theme` or `Dark theme` button text remains in the header. The accessible name and test selectors continue to use those action phrases.

**Acceptance:** both icons are visually clear in both themes, the button announces the theme it will activate, the SVG is hidden from assistive technology, and the existing persistence tests pass with updated visual assertions.

### 3.6 Rebuild “Hear what a moment does”

Replace the single generic diagram and three text switches with three accurate, always-visible cause-and-effect cards:

1. **Turn → melody changes direction**
   - Draw a sharp route corner.
   - Align the event marker with a pitch contour that visibly changes direction.
2. **Pause → musical break**
   - Draw two disconnected route segments with a real gap.
   - Align the gap with silence/near-zero waveform energy.
3. **Pace change → energy rises or settles**
   - Draw spaced route samples changing density or pace treatment.
   - Align the change with a denser or taller musical pulse.

Each card gets a short plain-language caption and a **Preview** control. A user gesture plays a deterministic short browser-generated example; switching cards stops the previous preview. The preview is labeled as an illustration, not a generated result.

At 390 px the cards stack; at desktop width they form a three-column comparison. Motion is optional emphasis only. The static SVG must explain the mapping when reduced motion is enabled.

**Acceptance:** the three examples are visually distinct without their captions, their text matches the actual movement-to-music rules, previews do not autoplay or overlap, and the section passes keyboard and axe checks.

### 3.7 Redesign the Soundprint result

Keep the existing data contract and one shared audio clock. Improve hierarchy instead of adding unsupported health metrics.

#### New reading order

1. **Album-style hero** — large privacy-safe route artwork, honest result label, track title, concise journey sentence, and primary player.
2. **Four-stat overview** — active time, total time, distance, and accepted movement moments.
3. **Interactive journey stage** — route, playhead, event markers, and current chapter in one visually dominant frame.
4. **What shaped the music** — three to five event cards synchronized with the route and audio.
5. **Movement ribbon** — a compact song-length overview with pace, gaps, chapters, events, and playhead.
6. **Journey pattern** — the existing event distribution presented as a stronger visual composition rather than a plain list of bars.
7. **Details** — quality, gaps, and honest generation mode in one quiet disclosure.

#### Added result features

- A mobile sticky mini-player after the hero scrolls away, using the same audio element and clock.
- A **Now playing** chapter/moment label that updates from existing chapter and event data.
- Clickable route markers and event cards with a shared selected/focus state.
- A compact share action in the hero when a share token exists.
- A privacy line that says the displayed route is abstracted and contains no coordinates.
- Purposeful empty states when there are few or no accepted events.

Do not add calories, steps, elevation, health scores, a literal map, a raw-route download, a second audio element, or a new result API.

**Acceptance:** the result is understandable in the first viewport, route/card/ribbon/story positions remain within 500 ms of the audio clock, example and generated labels remain honest, and the page works at 360, 390, 430, 768, and 1280 px.

### 3.8 Upgrade motion without reducing quality or access

Use CSS and SVG already in the repository:

- Reveal the cover route once when the result becomes ready.
- Move the route walker only while audio is playing.
- Pulse only the current marker when its event becomes active.
- Interpolate the hero glow and waveform emphasis from playback state.
- Cross-fade chapter and current-moment text.
- Use a short completion transition when generation becomes ready.

All motion pauses while the document is hidden. `prefers-reduced-motion: reduce` shows the final route, current marker, progress position, and text without animated travel. Avoid infinite decorative motion, scroll-jacking, parallax, flashing, WebGL, Lottie, and a new animation dependency.

**Acceptance:** motion is driven by loading, playback, or selection state; no animation is required to understand the result; reduced-motion and hidden-tab tests pass; the production bundle and slow-mobile interaction remain within the existing release baseline plus an explicitly recorded small delta.

## 4. Additional recommendations included in this phase

These are the agent-recommended additions that directly support the requested work:

| Recommendation                                      | Why it belongs now                                                                           | Boundary                                                          |
| --------------------------------------------------- | -------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| Automatic raw-draft cleanup after server acceptance | Removing the download button alone does not remove the sensitive local draft.                | No account, cloud history, or analytics.                          |
| Readiness progress under the 90-second line         | Prevents a surprise `trace_too_short` result while keeping End available for safety.         | Time is guidance, not a promise of GPS quality.                   |
| User-triggered movement previews                    | Makes “Hear what a moment does” accurate, not merely decorative.                             | Browser-generated, short, labeled illustration; no provider call. |
| Sticky single-clock player and Now playing label    | Makes the long result usable and clarifies synchronized visuals.                             | Reuse the existing audio element and result contract.             |
| Separate per-install and global quotas              | Gives the same phone more attempts without removing cost protection or fingerprinting users. | Anonymous random token only; global cap still wins.               |

Deferred until after submission: accounts, saved history, social profiles, editable moods, remixes, PWA installation, native background tracking, health metrics, and route maps.

## 5. Step-by-step execution queue

Every step starts only after the previous step is verified. Each implementation step receives one reviewable commit with a descriptive subject. Branch names and commit subjects must never contain a phase name, phase number, step number, step ID, or prefixes such as `P5` or `P5.1`. The roadmap may keep those identifiers inside planning documents only.

| Step     | Estimate | Work                                                                                                                                        | Verification                                                                    | Proposed commit                                            |
| -------- | -------: | ------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| **P5.1** |   45 min | Remove coordinate download, obsolete state/file/test, and unwanted landing footer copy. Add accepted-job local-draft cleanup contract.      | Search, typecheck, privacy-focused browser tests.                               | `Remove the private walk export and clear accepted drafts` |
| **P5.2** |   45 min | Add the 1:30 readiness line, active-time progress, early-end warning, and explicit saving/submitting state.                                 | Clock unit tests, live-flow Playwright test, screen-reader status assertions.   | `Clarify walk readiness and processing progress`           |
| **P5.3** |   75 min | Add anonymous install quota key, per-install ledger buckets, raised allowance, separate global guard, messages, and migration.              | Backend race/restart/idempotency/quota tests; inspect ledger for token leakage. | `Increase generation allowance with private quota guards`  |
| **P5.4** |   30 min | Replace theme text with sun/moon icon button and update tests/system catalog.                                                               | Keyboard, accessible-name, theme persistence, and contrast checks.              | `Replace the theme label with an accessible icon control`  |
| **P5.5** |   60 min | Build three accurate movement-to-music cards and short user-triggered preview audio.                                                        | Mapping unit tests, no-overlap audio test, mobile/desktop and axe checks.       | `Make movement examples visually and audibly accurate`     |
| **P5.6** |   90 min | Recompose the result hero, stat overview, journey stage, synchronized cards, ribbon, composition, details, sticky player, and empty states. | Existing contract/playback tests plus responsive visual review.                 | `Redesign the Soundprint as a premium journey result`      |
| **P5.7** |   45 min | Add playback/state-driven polish and complete reduced-motion/static equivalents.                                                            | Hidden-page, reduced-motion, sync, and bundle/performance checks.               | `Polish Soundprint motion around the shared audio clock`   |
| **P5.8** |   30 min | Run the final regression/privacy/accessibility matrix and align README, frontend contract, product concept, handoff, and deployment notes.  | Full backend and frontend suites, production build, public smoke checklist.     | `Verify and document the final product experience`         |

**Planned implementation time:** 420 minutes (7 hours), excluding deployment wait and human visual/listening review.

## 6. Required test matrix

- Backend: full pytest suite; quota migration, per-install/global exhaustion, restart, concurrency, and no-provider-dispatch-on-rejection.
- Frontend static: TypeScript, ESLint, Prettier, and production build.
- Browser: live recording, pause/resume, early end, saving/submitting, quota errors, icon theme toggle, moment previews, result playback, sharing, and draft cleanup.
- Accessibility: axe serious/critical, keyboard-only flow, 200% zoom, icon accessible name, status announcements, and reduced motion.
- Responsive: 360, 390, 430, 768, and 1280 px without horizontal overflow.
- Privacy: no raw coordinate download, no raw install token in ledger/logs, no coordinate in result/share URL, and no ended draft after accepted submission.
- Performance: production bundle delta recorded; no new runtime dependency; route, ribbon, and cards remain synchronized within 500 ms.

## 7. Release gates

Phase 5 is complete only when:

- All eight steps are implemented and verified.
- The provider budget supports the deployed quota values.
- The public service passes `/health`, landing, live recording, generation, result playback, theme, and share-link smoke checks.
- A real phone review confirms the 1:30 guidance, processing transition, touch targets, sticky player, and animation quality.
- Raw route export is absent and accepted local drafts are deleted.
- No known serious or critical accessibility issue remains.
- Docs describe the deployed behavior rather than the planned behavior.

Then feature freeze is restored and Phase 6 begins. No new product feature enters Phase 6.

## 9. Verification record

Recorded on October 12, 2026 on `final-product-polish`. The branch was not deployed. `deploy/render.yaml` was not changed.

| Gate | Result |
| --- | --- |
| All eight product slices implemented | Present on `final-product-polish`. P5.8 stays partial until the user smoke checklist passes. |
| Backend suite, Ruff check, and Ruff format | Passed. 91 tests. |
| Frontend typecheck, lint, Prettier, and production build | Passed after formatting `frontend/tests/fixtures/route-sketch-result.json`. |
| Complete Playwright suite | Passed. 133 tests. |
| Privacy checks in those suites | Passed. No route export, no raw install token in the ledger or logs, no coordinates in the share URL, and the ended raw draft is cleared after an accepted submission. |
| Accessibility, 200% text, responsive widths, one audio clock within 500 ms | Passed in the suite. Root text at 32 px also fit `/` and `/studio` at 360, 390, 430, 768, and 1280 px. |
| Production bundle | HTML 1.60 kB, gzip 0.74 kB. CSS 22.39 kB, gzip 5.02 kB. JavaScript 327.16 kB, gzip 98.99 kB. No new runtime dependency. |
| Provider budget supports the deployed quota values | User gate. Not confirmed. Blueprint caps remain 4, 240, and 6. |
| Public `/health`, landing, live recording, generation, playback, theme, and share-link smoke | User gate. Not run against https://footwork-m6g0.onrender.com/. |
| Real-phone review of the 1:30 line, processing transition, touch targets, sticky player, and animation | User gate. Not done. |
| Docs describe verified behavior | Updated in this record. The public host still serves the previous deployment. |
| Feature freeze | Restored for further product changes. Phase 6 has not started. |

The public smoke checklist the user runs after deploying this work:

1. `GET /health` returns status `ok`.
2. `/` shows Start walking, Hear an example, and Hear what a moment does, and it does not offer a coordinate download.
3. A live recording shows the 1 minute 30 second line, and End stays available.
4. Ending a walk announces saving, then generation, without a percent.
5. The result plays from one control, and the route, ribbon, and moment stay with that audio.
6. The theme icon switches Daylight and Nocturne Pulse and keeps the choice.
7. A ready share link opens `/w` and does not contain a location.

## 8. Research constraints

- [SVG Icon Accessibility: Decorative vs Meaningful Icons](https://dev.to/svgicons/svg-icon-accessibility-decorative-vs-meaningful-icons-2430) supports naming the icon-only theme button at the button level and hiding its decorative SVG.
- [Lottie Animations and Accessibility: prefers-reduced-motion, ARIA, and Best Practices](https://dev.to/fazalshah/lottie-animations-and-accessibility-prefers-reduced-motion-aria-and-best-practices-51fo) reinforces static reduced-motion equivalents and explicit status text. Footwork will use its existing CSS/SVG stack rather than adding Lottie.

The source search produced useful guidance on accessible icons and motion but little project-specific evidence for location-recording flows. The recording and privacy decisions therefore follow Footwork's existing backend thresholds and privacy contract rather than treating community articles as authority for those values.
