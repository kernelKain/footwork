# Footwork frontend experience

Public information architecture, copy, and interface contract for the polishing work. This document does not change the running screens. A later step implements it.

When this file disagrees with an older screen list in `Docs/HANDOFF_1.md` or a broader idea in `Docs/PRODUCT_CONCEPT.md`, this file wins for the public pages. `Docs/HANDOFF_1.md` still wins for the Hook, acceptance criteria, stack, privacy rules, and phase order.

## Product flow

Understand Footwork → Start walking → Record safely → End walk → Generate → Hear the Soundprint

One page introduces the product and holds the walk. A second page is the Soundprint the person hears. How it works stays on the first page.

## Decisions

| Decision | Meaning |
|---|---|
| `/` is the landing and the recording entry | The person understands Footwork and starts, records, and ends a walk here. |
| `/studio` is the Soundprint | Play, the route, the graph, and the story live here after generation, and for a clearly labeled example. |
| `/about` redirects to `/#how-it-works` | How it works is a section on `/`, not a third destination. The redirect is not built yet. |
| No global Walk / Soundprint / How it works navigation | Movement through the product is the flow above, plus Start another walk from the Soundprint. |
| Sponsors and Provenance are not public sections | The application does not show those headings. |
| Technical provenance stays internal | Fixture files, developer docs, and submission evidence keep source, mode, model identity, and rights notes. |
| Developer fixture controls stay off the public pages | State pickers, mode badges, and raw mode names are not part of the public experience. |
| Public language is plain | A person who does not write software can follow every sentence. |
| Examples stay honest | An example, a practice state, and a simpler stand-in are labeled as such. None of them is called a finished live recording. |

The Hook is unchanged: a sharp turn is meant to change the melody's direction, and a pause is meant to become a musical break. Until generated audio is actually heard and checked, the page says the change is planned.

## What the built shell still does

The code on `build/experience` is behind this contract. It still has:

- Header links named Walk, Soundprint, and How it works.
- A separate `/about` page.
- A mode badge and preview-state buttons.
- Public Sponsors and Provenance sections on `/studio`.

Those stay until a later polishing step removes them. This file does not authorize pretending they are already gone.

## Pages

### `/` — Understand and walk

Order on the page:

1. What Footwork is, in a few sentences.
2. Start walking.
3. Hear an example, which opens the labeled example on `/studio`.
4. While recording: time, a plain signal word, and End walk.
5. `#how-it-works`: a short explanation of the walk, the music, privacy limits, and what this build does not do yet.

Start walking is the primary action. Hear an example is secondary and visibly an example.

### `/studio` — Hear the Soundprint

Order on the page:

1. An honest label: your walk, an example, or a simpler version.
2. Play and the scrubber.
3. The route.
4. The route-to-music explanation and the short story.
5. Start another walk, which returns to `/`.

No Sponsors section. No Provenance section. Technical fields from the result contract stay in data. The page may say, in plain words, that a musical change is planned or that it was heard. It does not print `synthetic_fixture`, `mapping_status`, or other internal names.

### `/about`

Keep the route until the redirect exists, so old links do not break. The eventual behavior is a redirect to `/#how-it-works`. Do not add new public content that exists only on `/about`.

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

The public journey uses these states. Internal preview names in the current shell are not this model.

| State | Plain name |
|---|---|
| `ready` | Ready |
| `checking_location` | Checking location |
| `permission_denied` | Permission denied |
| `recording` | Recording |
| `ending` | Ending |
| `processing` | Processing |
| `complete` | Complete |
| `recoverable_error` | Recoverable error |
| `unsupported_browser` | Unsupported browser |
| `offline_or_interrupted` | Offline or interrupted session |

Processing stage codes, in order: `reading_walk`, `shaping_music`, `recording_piece`.

Public stage lines: Reading the walk. Shaping the music. Recording the piece.

Error codes the interface understands:

| Code | Public line |
|---|---|
| `location_denied` | This site cannot use your location yet. |
| `unsupported` | This browser cannot record a walk. |
| `offline` | You appear to be offline. |
| `interrupted` | The page was hidden. Missing time was not filled in. |
| `trace_too_short` | That walk was too short to shape a piece. |
| `trace_unclear` | The location was too unclear to trust. |
| `generation_limit` | Today's limit for new pieces has been reached. |
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

- The person sees Recording, the elapsed time, a plain signal word (clear, weak, or lost), and End walk. The page asks them to keep this tab open. It does not show a fitness dashboard.
- Actions: End walk.
- Data: local samples, a monotonic clock for elapsed time, and either a screen wake lock or a visible warning that the screen may sleep.
- Phase 1: practice copy. No samples are stored and the clock does not pretend a walk is happening.
- Real behavior: Phase 2, through geolocation, Wake Lock, IndexedDB, and a monotonic timer. A short hold on End walk may be added there so a pocket tap does not stop the walk. The page must not promise recording after the phone is locked.
- Accessibility: Recording is a text status. End walk is large, named, and reachable by keyboard.

### Ending

- The person sees that the walk is being finished and checked for length and clarity.
- Actions: wait.
- Data: the location watch has stopped and the local draft is closed for writing.
- Phase 1: practice copy only.
- Real behavior: Phase 2 quality check. A walk that fails becomes Recoverable error, not a fake Soundprint.
- Accessibility: a text status. The page does not jump onward in silence.

### Processing

- The person sees that their Soundprint is being made, with the three stage lines above.
- Actions: wait. Hear an example stays available and is labeled as a separate example, not as this walk's result.
- Data: one generation attempt and the current stage code.
- Phase 1: practice stages. Nothing is sent to a model or a music studio. The finished example route is hidden so the screen does not look successful.
- Real behavior: Phase 3. Repeating the same finished walk does not start a second piece. Retry is a button the person presses, not an automatic loop. The transport is not fixed here.
- Accessibility: the current stage is text. Motion is optional.

### Complete

- The person sees the Soundprint: play, scrub, route, explanation, and story. The label says your walk, an example, or a simpler version.
- Actions: Play, Pause, scrub, Start another walk.
- Data: the existing result contract in `frontend/src/contracts/types.ts`. Sponsor and provenance objects are not rendered.
- Phase 1: the synthetic example. Its sound is the browser sketch. The page says it is an example and not a studio recording. Planned musical changes stay planned.
- Real behavior: Phase 3 fills the same screen from a real walk, a simpler version, or a separate cached example. Those three stay visually distinct.
- Accessibility: one audio clock drives the route, graph, and story. At chosen moments they stay within 500 ms. The active moment is named, not only colored. Reduced motion still shows the place in the piece as text.

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
- Phase 1: practice copy. The current app does not detect browser support yet.
- Real behavior: Phase 2, before Start walking calls location.
- Accessibility: the reason is text.

### Offline or interrupted session

- The person sees that the connection dropped or the page was hidden, what is still on this phone, and that missing positions were not invented.
- Actions: Continue the walk when a draft is still open, otherwise Start again. Hear an example when a piece cannot be made offline.
- Data: the local draft and any gap mark.
- Phase 1: practice copy. Nothing is stored.
- Real behavior: Phase 2 saves and restores the draft and records gaps. Phase 3 does not start generation while offline.
- Accessibility: when the person returns, the interruption is announced in text.

## Interface responsibilities

These are roles, not HTTP paths. Phase 3 chooses how a request moves. This document does not add endpoints.

The page owns what the person sees. Adapters own the device and the music services.

Recording adapter, implemented in Phase 2:

- Check that this browser can record.
- Ask for a location fix, and report denial or an unsupported browser.
- Start and stop the watch.
- Keep a monotonic elapsed time.
- Hold a screen wake lock when the browser allows it, and say so when it does not.
- Save and restore the draft on this phone.
- Report hidden-page gaps without filling positions.

Generation adapter, implemented in Phase 3:

- Start one attempt from a finished local draft.
- Report a stage code, an error code, or a result.
- Treat a repeat of the same finished walk as the same attempt.
- Retry only when the person asks, and only for the codes listed above.

The result the page already understands remains the Soundprint result contract. Public rendering uses the route, events, chapters, story, duration, and a plain mode label. It does not render provenance or sponsor blocks.

## Design research

These references guided the Night Trail Studio direction. They are not layouts to copy. The locked stack stays. No component library, no WebGL, and no new product dependency.

The chosen tokens, logo files, and controls are recorded in `Docs/HANDOFF_2.md` under frontend polishing step 2. Public pages still use the existing screen structure. `/system` is an unlinked catalog for the controls.

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

Real geolocation, Screen Wake Lock, IndexedDB recovery, and a monotonic timer. Public states covered: Checking location, Permission denied, Recording, Ending, Unsupported browser, and Offline or interrupted session, plus trace errors that become Recoverable error. The public Render shell remains the first activity of this phase, before the adapters.

### Phase 3 — generation contract

Backend processing uses the stage codes and error codes in this file. Retry is explicit. Starting generation for the same finished walk is idempotent. This file does not name routes, methods, or payload shapes. Live results, simpler versions, and cached examples stay separately labeled.

### Phase 4 — release checks

Integration of the rebaselined journey, accessibility, performance, and device regression at 390 px and 1280 px. Fixes only. No new public sections.

### Phase 5 — evidence outside the app

Sponsor roles and technical provenance are written into the README and the submission evidence. They are not added back to the application as public sections.
