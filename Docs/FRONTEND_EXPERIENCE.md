# Footwork frontend experience

Public information architecture, copy, and interface contract for the polishing work. The landing, the practice recording journey, and the Soundprint follow this file.

The Phase 1 extension is specified in `Docs/PHASE_1_UI_UX_PLAN.md`. Pause and resume, the movement summary, the visual recap, the walker, Nocturne Pulse, and the Daylight light theme are in the public pages. Token values and contrast decisions are in `Docs/HANDOFF_2.md`.

The final product polish specified in `Docs/PHASE_5_FINAL_POLISH_PLAN.md` is the behavior on `final-product-polish`. There is no raw-coordinate download. Recording shows the 1 minute 30 second active-time line and a saving status. The theme control is a sun or moon icon. Three movement examples can be previewed. The Soundprint is the album result below. Automated checks passed on October 12, 2026. The public host still serves the last deployed release until the user deploys this work. Feature freeze is restored for further product changes.

When this file disagrees with an older screen list in `Docs/HANDOFF_1.md` or a broader idea in `Docs/PRODUCT_CONCEPT.md`, this file wins for the public pages. `Docs/HANDOFF_1.md` still wins for the Hook, acceptance criteria, stack, privacy rules, and phase order.

## Product flow

Understand Footwork → Start walking → Record safely ↔ Pause and resume → End walk → Generate → Explore the Soundprint

One page introduces the product and holds the walk. A second page is the Soundprint the person hears. How it works stays on the first page.

## Decisions

| Decision | Meaning |
|---|---|
| `/` is the landing and the recording entry | The person understands Footwork and starts, records, and ends a walk here. |
| `/studio` is the Soundprint | Generation, then the result: hero, route, timeline, a short story, and optional details. Hear an example opens the same result, labeled as an example. |
| `/about` redirects to `/#how-it-works` | How it works is a section on `/`, not a third destination. |
| `/w` opens a shared Soundprint | A finished result can be opened from its link. The token is the URL fragment. The page plays that piece and does not offer deletion. |
| No global Walk / Soundprint / How it works navigation | Movement through the product is the flow above, plus Start another walk from the Soundprint. |
| Sponsors and Provenance are not public sections | The application does not show those headings. |
| Technical provenance stays internal | Fixture files, developer docs, and submission evidence keep source, mode, model identity, and rights notes. |
| Developer fixture controls stay off the public pages | State pickers, mode badges, and raw mode names are not part of the public experience. |
| Public language is plain | A person who does not write software can follow every sentence. |
| Examples stay honest | An example, a practice state, and a simpler stand-in are labeled as such. None of them is called a finished live recording. |
| A manual break is not a movement event | Pause walk creates a gap between recording segments. It is not converted into distance or a musical pause. |
| Results are visual first | Route, movement ribbon, event composition, and compact stat visuals lead; text explains them and remains the accessible alternative. |
| Theme follows the device, then an explicit choice | Daylight is the light theme. Nocturne Pulse is the dark theme. The header shows a sun or a moon. The button name is Light theme or Dark theme, and the icon is hidden from assistive technology. |

The Hook is unchanged: a sharp turn is meant to change the melody's direction, and a pause is meant to become a musical break. Until generated audio is actually heard and checked, the page says the change is planned.

## What the built shell does

`/` and `/studio` follow this contract. `/about` redirects to `/#how-it-works`. `/w` opens a finished Soundprint for someone who has the link. The public pages do not show a state picker, a fixture banner, Sponsors, or Provenance. Pause and resume, the visual recap, and the walker are on these pages. A light device opens Daylight. A dark device opens Nocturne Pulse. The header button stores `light` or `dark` in `localStorage` under `footwork-theme` and that choice wins on the next visit.

Phase 1 generation is still practice. Ending a practice walk opens the generation screen, but nothing is sent to a model or a music studio. The result that follows is the example, labeled Example walk. A real walk is not called "Generated from your walk" until a later phase returns a non-example result.

## Pages

### `/` — Understand and walk

Order on the page:

1. What Footwork is, in a few sentences, with Start walking and Hear an example. Hear an example opens the labeled example on `/studio`.
2. `#how-it-works`: a short explanation of the walk, the music, privacy limits, and what this build does not do yet.
3. Hear what a moment does: three cards for a turn, a pause, and a pace change. Each Preview is an illustration the person starts. Nothing plays by itself.
4. Before you go: location, what is recorded, and the other limits already on the page.
5. The recording screen, after Start walking: active time, the 1 minute 30 second readiness line, a plain signal word, Pause walk, and Hold to end walk. While paused: active time, break time, Resume walk, and Hold to end walk.

Start walking is the primary action. Hear an example is secondary and visibly an example.

### `/studio` — Hear the Soundprint

On a phone the page is one reading order. At desktop width the album art sits beside the title and player.

1. Album hero: large privacy-safe route art, one honest label, the track title, a short journey sentence, the primary player, a compact share action when a link exists, and a line that the displayed route is abstracted and contains no coordinates. The label is Example walk or Generated from your walk.
2. Journey at a glance: active time, total time, distance, and accepted movement moments.
3. The journey: one dominant frame with the route, playhead, event markers, and the current chapter. A Now playing line names the chapter and, when playback is on a moment, that moment.
4. What shaped the music: up to five event cards. Choosing or focusing a card or a route marker selects both and seeks the shared audio clock. The route, ribbon, cards, and Now playing line stay within 500 ms of that clock.
5. Movement ribbon: a compact song-length overview with pace, gaps, chapters, events, and the playhead.
6. Journey pattern: the accepted counts of turns, detected pauses, loops, and pace changes. It is not a quality score. Few moments and no moments have their own sentences.
7. Optional quality and generation details: one closed disclosure. It is not a provenance panel. Example, simpler-version, and studio-recording labels stay honest.

A phone shows a sticky mini player after the hero player scrolls away. It uses the same audio element and clock. There is one audio element on the result. The hero route draws once when the result appears. The walker moves only while that audio is playing and the page is visible. Reduced motion shows the finished route, the current marker, the progress position, and the text without animated travel.

No Sponsors section. No Provenance section. No generation picker. Technical provenance stays in the result object, the fixture, and these notes. The page may say, in plain words, that a musical change is planned. It does not print `synthetic_fixture`, `mapping_status`, stage ids, or a percent complete.

Start another walk returns to `/`.

### `/about`

A visit to `/about`, including a reload, opens `/#how-it-works` on the landing page. In-app navigation to `/about` does the same. How it works is not a separate page.

## Copy

Public sentences use everyday words.

| Avoid in public copy | Say instead |
|---|---|
| Fixture, synthetic, provenance, schema | Example, practice, or your walk |
| Provider, generation job, quota | The music service, making your Soundprint, today's limit |
| Mapping status planned | This change is planned. It has not been heard in the music yet. |
| Gemma, ElevenLabs, Render as headings | In How it works only: an open music model shapes the walk, a music studio records the piece, and the public link hosts the page. Say when an example did not call them. |

Buttons and status lines name the action or the situation. Color is never the only signal. The selected or active moment also has words, including Now when playback is on that moment.

## State model

The public pages use these states.

| State | Plain name |
|---|---|
| `ready` | Ready |
| `checking_location` | Checking location |
| `permission_denied` | Permission denied |
| `recording` | Recording |
| `pausing` | Pausing walk |
| `paused` | Walk paused |
| `resuming` | Finding your location again |
| `ending` | Ending |
| `processing` | Processing |
| `complete` | Complete |
| `recoverable_error` | Recoverable error |
| `unsupported_browser` | Unsupported browser |
| `offline_or_interrupted` | Offline or interrupted session |

Processing stage ids, in order, are internal and are not shown as labels: `reading_walk`, `finding_moments`, `shaping_music`, `recording_piece`.

Public stage lines, in that same order: Reading your walk. Finding meaningful moments. Turning them into music. Creating your track.

The existing generation boundary is 180 seconds (AC-08). The page shows the elapsed time and the active stage. It does not show a percent. If that time passes, or the attempt reports `timed_out`, the page shows "Making the piece took too long." and offers Try again. It does not invent a finished track.

Error codes the interface understands:

| Code | Public line |
|---|---|
| `location_denied` | This site cannot use your location yet. |
| `unsupported` | This browser cannot record a walk. |
| `offline` | You appear to be offline. |
| `interrupted` | The page was hidden. Missing time was not filled in. |
| `trace_too_short` | That walk was too short to shape a piece. |
| `trace_unclear` | The location was too unclear to trust. |
| `generation_limit` | The studio has reached today's generation limit. Hear the example or try tomorrow. |
| `install_allowance` | This phone has made today's pieces. New pieces are available tomorrow. |
| `arrangement_unavailable` | The music plan is unavailable. A simpler version can still be made. |
| `music_unavailable` | The studio recording is unavailable. Your simpler version is ready. |
| `timed_out` | Making the piece took too long. |

No account balance is shown. No stack trace, coordinate, or secret is shown.

### Ready

- The person sees what a walk becomes, Start walking, and Hear an example.
- Actions: Start walking, Hear an example, read How it works.
- Data: none.
- Phase 1: this is the landing copy. Start walking does not request location. Hear an example opens the labeled example.
- Real behavior: the landing remains. Phase 2 connects Start walking to the recording adapter.
- Accessibility: Start walking is a button with a visible focus style. The example is labeled as an example in text.

### Checking location

- The person sees that the phone is being checked for a location fix. No duration or distance is invented.
- Actions: Cancel, which returns to Ready.
- Data: a permission request or the wait for a first fix. No route yet.
- Phase 1: a labeled practice state. It does not call the location API.
- Real behavior: Phase 2.
- Accessibility: the wait is a text status. Cancel stays available. A spinner is not the only indicator.

### Permission denied

- The person sees that location is blocked, how to allow it in the browser settings, and Hear an example.
- Actions: Hear an example, Try again after settings change.
- Data: the denial class only.
- Phase 1: practice copy. It does not open a location prompt.
- Real behavior: Phase 2 reads the real permission result.
- Accessibility: an alert, plus a next action. The next action is not color alone.

### Recording

- The person sees Recording, active time, the line "Walk for at least 1 min 30 sec of active movement for a reliable Soundprint.", progress such as "0:54 of 1:30 minimum." or "Minimum time reached.", a plain signal word (clear, weak, or lost), Pause walk, and Hold to end walk. Ending before 90 seconds asks for confirmation and still finishes the walk. The page asks them to keep this tab open. It does not show a fitness dashboard.
- Actions: Pause walk or Hold to end walk.
- Data: local samples grouped into ordered recording segments, a monotonic active clock, and either a screen wake lock or a visible warning that the screen may sleep.
- Phase 1 target: the practice port demonstrates pause, paused restoration, resume, and end. It does not call geolocation or pretend that fixture time is a real walk.
- Real behavior: Phase 2, through geolocation, Wake Lock, IndexedDB, and a monotonic timer. The page must not promise recording after the phone is locked.
- Accessibility: Recording is a text status. Pause and End walk are named, reachable by keyboard, and not distinguished only by color.

### Pausing, paused, and resuming

- The person sees Walk paused, active time, current break time, and the sentence "Movement is not being recorded. Your walk is saved on this phone."
- Actions: Resume walk or Hold to end walk.
- Data: an explicit manual-break interval between recording segments. No samples, distance, or active time are invented during the break.
- Phase 1 target: practice states and restoration fixtures preserve whether the walk is paused. Resume waits through the Finding your location again state.
- Real behavior: Phase 2 stops the position watch, persists the open draft, and reacquires a usable fix before starting a new segment. It never draws a movement line across the break.
- Accessibility: the paused state is announced once in text. The recording pulse and travelling character stop. Reduced motion uses the same static state.

### Ending

- The person sees that the walk is being finished and checked for length and clarity.
- Actions: wait.
- Data: the location watch has stopped and the local draft is closed for writing.
- Phase 1: practice copy only.
- Real behavior: Phase 2 quality check. A walk that fails becomes Recoverable error, not a fake Soundprint.
- Accessibility: one status says "Saving your walk on this phone…" and then "Walk saved. Turning your movement into music…" before the generation stages. The page does not jump onward in silence.

### Processing

- The person sees that their Soundprint is being made, with the four stage lines above and the elapsed time.
- Actions: wait. Hear an example stays available and is labeled as a separate example, not as this walk's result.
- Data: one generation attempt and the current stage id. The id is not the label.
- Phase 1: practice stages on a short timer, plus the same 180 second check a live attempt will use. Nothing is sent to a model or a music studio. The finished example stays hidden so the screen does not look successful.
- Real behavior: Phase 3 reports the same stage ids or an error code. It does not send a percent. Repeating the same finished walk does not start a second piece. Retry is a button the person presses, not an automatic loop. The transport is not fixed here.
- Accessibility: the current stage is one text status, and it changes only when the stage changes. The elapsed time is not a live announcement. Motion is optional.

### Complete

- The person sees the Soundprint in the order above. The label is Example walk for an example, or Generated from your walk for a later non-example result.
- Actions: Play, Pause, Replay, scrub, choose a moment, Start another walk. About this example can be opened.
- Data: the result contract in `frontend/src/contracts/types.ts` includes `movement_summary`. The Soundprint page renders those published totals and withholds a speed or pace when the summary leaves it empty. Provenance stays off the public page.
- Phase 1 target: the synthetic fixtures carry recording segments, manual breaks, uncertain gaps, pace buckets, event counts, and limited-quality states. The example shown on the page is one continuous constructed route, so it does not draw a line across a gap. Its sound remains the browser sketch. Under the player, an example says it was made in the browser and is not a studio recording. A simpler version made from a walk says that, and a studio recording says it was recorded from the walk. Planned musical changes stay planned for the example.
- Real behavior: Phase 3 fills the same screen from a real walk. A simpler version and a cached example stay labeled Example walk when their mode is an example mode.
- Accessibility: one audio clock drives the route, timeline, and story. At chosen moments they stay within 500 ms. The active moment is named, not only colored. Playback time is visible and is not announced on every tick. Reduced motion still shows the place in the piece as text.

### Recoverable error

- The person sees one sentence for the error code and one next step.
- Actions: Start again, Hear an example, and Try again only when the code is safe to retry (`timed_out`, `arrangement_unavailable`, `music_unavailable`). A short or unclear walk does not offer Try again as if the same trace would succeed.
- Data: the error code. No coordinates.
- Phase 1: practice messages. A provider-style failure does not show a completed studio piece.
- Real behavior: Phase 2 for location and trace errors. Phase 3 for generation errors and the explicit retry.
- Accessibility: an alert and a named next action.

### Unsupported browser

- The person sees that this browser cannot record a walk, and what is missing, in plain words. Hear an example still works.
- Actions: Hear an example.
- Data: the failed capability check only.
- Phase 1: practice copy. The unsupported practice fixture shows this state. The page does not inspect the real browser.
- Real behavior: Phase 2, before Start walking calls location.
- Accessibility: the reason is text.

### Offline or interrupted session

- The person sees that the connection dropped or the page was hidden, what is still on this phone, and that missing positions were not invented.
- Actions: Continue the walk when a draft is still open, otherwise Start again. Hear an example when a piece cannot be made offline.
- Data: the local draft and any gap mark.
- Phase 1: a paused practice draft is stored in `sessionStorage` under `footwork-practice-draft` and is restored only while its status is paused. Hiding the page during recording does not write a break and does not keep a recording draft. Hiding the page while paused keeps the paused draft. Nothing is written to IndexedDB.
- Real behavior: Phase 2 saves and restores the draft and records gaps. Phase 3 does not start generation while offline.
- Accessibility: when the person returns, the interruption is announced in text.

## Interface responsibilities

These are roles, not HTTP paths. Phase 3 chooses how a request moves. This document does not add endpoints.

The page owns what the person sees. Adapters own the device and the music services.

Recording adapter, implemented in Phase 2:

- Check that this browser can record.
- Ask for a location fix, and report denial or an unsupported browser.
- Start and stop the watch.
- Pause the watch into an explicit manual-break interval, persist the paused draft, and reacquire a usable fix before opening a new recording segment.
- Keep a monotonic elapsed time.
- Hold a screen wake lock when the browser allows it, and say so when it does not.
- Save and restore the draft on this phone.
- Report hidden-page gaps without filling positions.

Generation adapter, implemented in Phase 3:

- Start one attempt from a finished local draft.
- Report one of the stage ids above, an error code, or a result. Do not report a percent, and do not make the stage id the public sentence.
- Stop or return `timed_out` at the 180 second boundary.
- Treat a repeat of the same finished walk as the same attempt.
- Retry only when the person asks, and only for `timed_out`, `arrangement_unavailable`, and `music_unavailable`.

The Soundprint contract includes an honest movement summary: active and elapsed duration, manual-break duration, within-segment distance, pace buckets, recording segments, manual and uncertain gaps, event counts, optional return proximity, and a plain quality grade. The Soundprint page renders that summary. It does not add calories, heart rate, steps, elevation, or health advice. Public rendering does not show a provenance panel, sponsor block, raw coordinate, confidence decimal, or processing payload.

Phase 1 practice uses `sessionStorage` key `footwork-generation`. The public page has no control that sets it. `run` plays the four stages. An error code shows that recovery state. After one practice attempt, `footwork-generation-complete` keeps a second ending from starting another piece. Direct `/studio` and Hear an example leave the key unset and show the example.

## Design research

These references guided the original Night Trail Studio direction and the Nocturne Pulse theme now used on the public pages. They are not layouts to copy. The locked stack stays. No component library, WebGL runtime, or new product dependency is approved by this research.

The full research decision matrix, prompt briefs, motion storyboard, and planned execution steps are in `Docs/PHASE_1_UI_UX_PLAN.md`.

The chosen tokens, logo files, and controls are recorded in `Docs/HANDOFF_2.md` under frontend polishing step 2. The landing and practice recording journey are step 3. The generation screen and Soundprint are step 4. `/system` is an unlinked catalog for the controls.

| Reference | Use |
|---|---|
| [SaaSFrame](https://saasframe.io) | Study mobile onboarding, progress, and generation states: one primary action, a clear wait, and a recovery action. |
| [Relume](https://relume.io) | Check the landing order: explanation, primary action, secondary example, then How it works. |
| [Godly](https://godly.design) | Art direction for the hero, the logotype, and social previews. Not a layout to copy. |
| [21st.dev](https://21st.dev) | Borrow composition ideas for a player, a route frame, or a story card only when the idea fits the existing CSS. |
| [Watermelon UI](https://ui.watermelon.sh/) | Check theming and the anatomy of an accessible control: name, focus, target size, and text status. |
| [Motion Primitives](https://motion-primitives.com/) | Use motion only to show a state change. The route already follows the audio clock. |
| [Haikei](https://haikei.app/) | If a background is needed, export one static SVG. No generated animation runtime. |
| [ThreeUI](https://threeui.com/browse?sort=recent) | Look only for depth, contrast, and framing. Do not add Three.js, shaders, or WebGL to the core journey. |
| [TasteSkill](https://www.tasteskill.dev/) | Avoid a generic template: one dominant route, plain type, and no decorative sections that repeat the same story. |

Reduced motion keeps a static route, the active marker, and text. Playback must still make sense with motion off.

## Later phases

### Phase 2 — recording adapters

Real geolocation, Screen Wake Lock, IndexedDB recovery, recording segments, pause/resume persistence, usable-fix reacquisition, and monotonic active/elapsed timers. Public states covered: Checking location, Permission denied, Recording, Paused, Resuming, Ending, Unsupported browser, and Offline or interrupted session, plus trace errors that become Recoverable error. The public Render shell remains the first activity of this phase, before the adapters.

### Phase 3 — generation contract

Backend processing uses the stage ids and error codes in this file. The public sentences stay separate from those ids. Retry is explicit. A live attempt ends or falls back at 180 seconds and does not invent a percent. Starting generation for the same finished walk is idempotent. This file does not name routes, methods, or payload shapes. Example results stay labeled Example walk. A later non-example result uses Generated from your walk. Provenance remains on the result and out of the public page.

### Phase 4 — release checks

Integration of the rebaselined journey, accessibility, performance, and device regression at 390 px and 1280 px. Fixes only. No new public sections.

### Phase 5 — final product polish

This is the last public-product phase, and `final-product-polish` implements it. Automated checks passed on October 12, 2026. The public host does not serve it until the user deploys it.

- There is no raw-coordinate download, warning, or practice footer sentence.
- Recording shows `Walk for at least 1 min 30 sec of active movement for a reliable Soundprint.` and progress to that line. Ending remains available.
- After ending, one status announces saving and then `Walk saved. Turning your movement into music…` before the existing generation stages.
- One anonymous browser installation can be admitted for eight jobs in a day when the separate global provider budget permits it. No device fingerprint is created.
- The theme control is a sun or moon icon. Its accessible name is still the action.
- The landing shows three turn, pause, and pace cards. Each preview starts only when the person asks.
- `/studio` is the album hero, journey stage, sticky single-clock player, Now playing label, moment and composition visuals, and quiet details described above.
- Result animation follows loading, playback, or selection. Reduced motion keeps the finished route, marker, progress, and text.

The public result contains no literal map, coordinates, health metrics, raw export, internal mode name, sponsor block, provenance panel, or second audio clock. Accepted raw local drafts are removed after the server admits the job. Feature freeze is restored for further product changes. Provider-budget confirmation, a real-phone review, and deployment remain with the user.

### Phase 6 — evidence outside the app

Sponsor roles and technical provenance are written into the README and the submission evidence. They are not added back to the application as public sections.
