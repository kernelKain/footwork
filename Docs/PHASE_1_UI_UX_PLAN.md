# Phase 1 UI/UX extension plan

**Status:** Approved direction; documentation only. No frontend behavior or styling is implemented by this plan.
**Planning date:** October 9, 2026
**Phase:** P1 — Complete frontend experience
**Current branch:** `build/experience`

This plan extends the existing Phase 1 frontend work. It keeps the two public destinations, the current React/TypeScript/Vite stack, the shared audio clock, the privacy rules, and the honest example labels. It adds a pause-and-resume journey, a more expressive visual system, richer visual results, and purposeful motion.

## 1. Outcome

Phase 1 should end with a fixture-complete experience that can answer four questions immediately:

1. What will Footwork do with my walk?
2. Is my walk recording, paused, or safely resumed?
3. What happened during the journey?
4. How did those movements shape the music?

The target is a creative outdoor music experience, not a conventional fitness dashboard and not a generic AI landing page.

## 2. Scope and constraints

### In Phase 1

- Add a clear pause-and-resume interaction to the practice recording flow.
- Specify the real recording semantics that the Phase 2 adapter must preserve.
- Replace the green-led art direction with the Nocturne Pulse theme below.
- Add a compact animated walker/runner motif before, during, and after the walk.
- Redesign the Soundprint result around visual journey analytics.
- Extend the result contract and fixture plan for derivable movement summaries.
- Keep the route, result charts, story, and audio player on one shared clock.
- Verify accessibility, reduced motion, responsive behavior, and performance.

### Still out of scope

- Calories, heart rate, step count, cadence, or training advice.
- Elevation claims unless a later validated input supplies reliable elevation.
- Street maps, geocoding, exact coordinates, or exact start/end locations.
- Accounts, leaderboards, streaks, social feeds, or public result links.
- WebGL, Three.js, shader backgrounds, autoplay video, or a continuous full-screen animation.
- Installing a new component system merely to copy a reference layout.

## 3. Experience principles

1. **One story, three visual layers.** Route shape, movement rhythm, and musical response are separate views of the same walk.
2. **A break is not a failure.** Pausing is a normal state with a confident primary Resume action.
3. **Show first, explain second.** Charts and route behavior carry the result; short labels explain the visual rather than replacing it.
4. **No invented precision.** Every displayed metric must be directly measured or derived from accepted samples and must include an honest quality state.
5. **Motion communicates state.** Animation shows recording, pausing, generation, playback, or a detected event. Decorative motion never competes with a core action.
6. **The interface remains calm outdoors.** Large targets, strong contrast, low reading burden, safe-area spacing, and sunlight-readable critical actions remain mandatory.

## 4. Visual direction — Nocturne Pulse

The current Night Trail Studio foundation is structurally sound, but its green-led palette feels muted and too uniform. Nocturne Pulse keeps the dark outdoor atmosphere and changes the identity to a multi-signal system inspired by night running, topographic traces, and music visualizers.

### Candidate palette

These are design candidates, not production tokens until contrast is measured in the implementation step.

| Role           | Candidate | Use                                         |
| -------------- | --------- | ------------------------------------------- |
| Background     | `#080C18` | Full-page night field                       |
| Surface        | `#11182A` | Cards and recording panels                  |
| Raised surface | `#18233A` | Player and focused result panels            |
| Primary text   | `#F7F7F2` | Headings and critical labels                |
| Muted text     | `#B9C2D6` | Supporting copy after contrast verification |
| Route cyan     | `#53E6D8` | Route, location quality, movement line      |
| Music violet   | `#A78BFA` | Waveform, composition, audio state          |
| Moment amber   | `#FFB45C` | Turns, loops, pace changes, highlights      |
| Pause blue     | `#73B7FF` | User-controlled break and detected rests    |
| Stop coral     | `#FF6B6B` | End walk and destructive actions only       |

The signature gradient is route cyan → music violet → moment amber. It appears only in the hero transformation, selected result moments, and cover art. Ordinary controls use solid colors so state remains legible.

### Graphic language

- Thin topographic contour lines at very low contrast.
- One bold privacy-safe route as the main visual object.
- Circular beat markers and square chapter markers derived from the existing logo.
- Large editorial numerals for time and distance; supporting labels remain short.
- Opaque surfaces with crisp borders. Avoid a page full of translucent glass cards.
- Static SVG texture from a tool such as Haikei is allowed after file-size and contrast review.

### Theme variants considered

| Direction              | Decision                                                                                                      |
| ---------------------- | ------------------------------------------------------------------------------------------------------------- |
| Green-only Night Trail | Retire as the primary identity; it does not separate route, music, pause, and event meanings strongly enough. |
| Bright fitness white   | Reject; it makes Footwork feel like another workout tracker and weakens the music-studio character.           |
| Heavy neon cyberpunk   | Reject; it harms outdoor readability and would encourage effects that compete with the route.                 |
| Nocturne Pulse         | Use; it supplies distinct semantic colors while preserving the existing dark, mobile-first shell.             |

## 5. Pause and resume journey

### User-visible behavior

During recording, show two distinct actions:

- **Pause walk** — a secondary action that pauses capture without finishing the journey.
- **Hold to end walk** — the existing destructive completion action.

Paused state:

- Heading: **Walk paused**.
- Primary action: **Resume walk**.
- Secondary destructive action: **End walk** using the same hold/confirmation protection.
- Status line: **Movement is not being recorded. Your walk is saved on this phone.**
- Show active walking time and current break time as separate values.
- The animated walker settles into a static resting pose. There is no recording pulse.

Resume state:

- Recheck support, connectivity, and a usable location fix before capture restarts.
- Say **Finding your location again** while waiting.
- Do not draw a route segment across the break.
- Return to Recording only after a usable fix is accepted.

### Data semantics

A user-controlled recording break and a naturally detected pause are different concepts.

| Concept        | Meaning                                                                          | Musical treatment                                                             |
| -------------- | -------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Manual break   | The user pressed Pause walk. Samples are intentionally absent.                   | Excluded from movement analysis by default; displayed as a break gap.         |
| Detected pause | The recording stayed active and movement remained within the detector threshold. | May become a musical rest when confidence is adequate.                        |
| Visibility gap | The page became hidden or the platform interrupted sampling.                     | Shown as uncertain, never treated as intentional movement or a musical event. |

The recording draft should eventually keep ordered segments and break intervals rather than one continuous line. Active duration sums recorded segments. Elapsed duration includes manual breaks. Distance sums accepted movement within each segment and never bridges a gap.

### State additions

```text
recording
  Pause walk -> pausing -> paused
  Hold to end -> ending

paused
  Resume walk -> resuming -> recording
  Hold to end -> ending

resuming
  usable fix -> recording
  cancel or failure -> paused with a next action
```

Phase 1 implements these states against the practice port and fixtures. Phase 2 replaces the practice behavior with Geolocation, Wake Lock, and IndexedDB while preserving this contract.

## 6. Result information architecture

The result remains one mobile reading order. Desktop may place the player and route beside the analytics, but it must not become a dense multi-column dashboard.

### A. Soundprint hero

- Track title and honest Example walk / Generated from your walk label.
- Album-like cover built from the route fingerprint.
- Play, pause, replay, scrub, current time, and duration.
- One-sentence summary only.
- On first reveal, the route resolves into a waveform; playback then owns all continuing motion.

### B. Journey at a glance

Four visual stat tiles, displayed as large values with miniature visual marks:

- Active time.
- Total elapsed time.
- Distance.
- Movement moments: meaningful turns + detected pauses + loops + pace changes.

If a value is unavailable or low-confidence, show **Not enough clear data** instead of a fabricated number.

### C. Route fingerprint

- Privacy-safe segmented route.
- Route color encodes relative pace from calm to energetic.
- Manual breaks appear as disconnected endpoints joined only by a labeled dotted gap, never a straight movement line.
- Start, finish, turn, detected pause, loop, and pace-change markers.
- Playback moves the existing runner glyph along the route.
- Selecting a marker seeks the shared audio clock.

### D. Movement ribbon

A horizontal visual timeline aligned with the song:

- Band height represents relative movement intensity.
- Cyan represents accepted movement.
- Blue gaps represent manual breaks.
- Hatched gaps represent uncertain/hidden-page intervals.
- Amber/violet accents show where movement influenced the composition.
- Chapter boundaries and playback cursor share the audio time scale.

This replaces long repeated text about every chapter.

### E. Movement-to-music moments

Use three to five high-quality event cards, each with a compact visual pair:

- Left: route/event shape.
- Right: music response glyph or mini waveform.
- Center connector: **Turn → melody changed direction**, **Pause → musical break**, **Faster stretch → energy rose**, or **Loop → motif returned**.

Cards remain buttons that seek playback. The active card gains a visible Now label and a non-color state.

### F. Journey composition

A radial or stacked-bar summary of the event mix:

- Turns.
- Detected pauses.
- Pace changes.
- Loops.

This is a count/distribution visual, not a quality score. Do not imply that more events means a better walk.

### G. Quality and details

A closed disclosure contains:

- Location clarity summary.
- Any excluded gaps.
- Why a metric is unavailable.
- Example/studio provenance in plain language.

Raw coordinates, confidence decimals, provider payloads, and internal mode names remain hidden.

## 7. Analytics that can be derived honestly

The result contract should add a `movement_summary` assembled from accepted samples and detector output.

| Field                      | Visual use                         | Rule                                                                          |
| -------------------------- | ---------------------------------- | ----------------------------------------------------------------------------- |
| `active_duration_ms`       | Active-time tile                   | Sum accepted recorded segments.                                               |
| `elapsed_duration_ms`      | Total-time tile                    | First accepted start to final end, including manual breaks.                   |
| `manual_break_duration_ms` | Ribbon and pause comparison        | Sum explicit user pauses only.                                                |
| `distance_m`               | Distance tile                      | Sum within accepted segments; never bridge gaps.                              |
| `average_moving_speed_mps` | Relative pace label                | Divide accepted distance by active duration; hide when quality is inadequate. |
| `pace_series`              | Route gradient and movement ribbon | Downsampled relative pace buckets with quality flags.                         |
| `recording_segments`       | Segmented route                    | Separate capture intervals with no invented connector.                        |
| `break_intervals`          | Blue ribbon gaps                   | Explicit manual breaks.                                                       |
| `uncertain_intervals`      | Hatched ribbon gaps                | Visibility or signal gaps.                                                    |
| `event_counts`             | Journey composition                | Count accepted detector events by type.                                       |
| `return_proximity`         | Ending badge                       | Optional normalized near-start result, not an address or coordinate.          |
| `quality_grade`            | Details disclosure                 | Plain `clear`, `mixed`, or `limited`, backed by thresholds defined in P2.     |

Do not add calories, step count, heart rate, elevation, health advice, or comparisons with other users.

## 8. Motion system

### Before the walk

- A compact SVG walker follows an F-shaped route once as the hero enters.
- The route then settles into a static mark; it does not loop continuously beside the Start walking button.
- On small screens, the visual stays above or behind the copy without pushing the primary action below the first comfortable viewport.

### Recording and pause

- Recording: a small stride cycle and route tick move at a calm cadence.
- Weak signal: cadence slows and the route tick becomes dotted; the text status remains authoritative.
- Paused: the character becomes still and the route pulse stops.
- Resume: one short reacquisition sweep, then the recording cadence returns.

### Generation

The same figure moves through four transformations rather than four unrelated loaders:

1. Route points appear — Reading your walk.
2. Important markers light — Finding meaningful moments.
3. The route bends into a staff/waveform — Turning them into music.
4. Cover art and player resolve — Creating your track.

The active stage remains text. The animation cannot imply a percentage.

### Result

- Intro: route draws once and visual stats count to their final values only when motion is allowed.
- Playback: the walker, route cursor, movement ribbon, and active event follow the shared audio clock.
- Events: one restrained ripple or pulse confirms a turn, pause, pace change, or loop.
- No independent decorative timer is allowed on the result page.

### Reduced motion and performance

- With `prefers-reduced-motion: reduce`, show the final route, static character, active marker, text stage, and numeric values immediately.
- Preserve short press/focus feedback; remove travel, parallax, looping motion, and animated counting.
- Pause decorative work while the document is hidden or the visual is offscreen.
- Prefer inline SVG, CSS transforms, and opacity. Do not animate layout-affecting properties on every frame.
- Use the existing audio `requestAnimationFrame` only while playback is active.

## 9. Research decisions

The supplied resources are references, not dependencies or layouts to copy.

| Resource group                                                                                                                                          | Use in Footwork                                                                                    | Do not use                                                                           |
| ------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| [Godly](https://godly.website/)                                                                                                                         | Art-direction quality, oversized editorial framing, strong first impression.                       | Copying a gallery layout without the walk flow.                                      |
| [SaaSFrame](https://www.saasframe.io/)                                                                                                                  | State anatomy, onboarding hierarchy, progress and recovery patterns.                               | Turning the product into a settings-heavy SaaS dashboard.                            |
| [Relume](https://www.relume.io/)                                                                                                                        | Validate the landing sequence and component-level page outline.                                    | Importing a new page system or generic marketing sections.                           |
| [21st.dev](https://21st.dev/) and the supplied [Medium review](https://medium.com/vibe-coding/21st-dev-the-future-of-frontend-development-149d05f35db7) | Study card composition, media-player polish, number animation, and source-owned component anatomy. | Installing Tailwind/shadcn or paid MCP tooling for this phase.                       |
| [Motion Primitives](https://motion-primitives.com/)                                                                                                     | Study state transitions and micro-interaction timing.                                              | Adding Motion solely for decorative effects.                                         |
| [Watermelon UI](https://ui.watermelon.sh/)                                                                                                              | Study animated media-player, map, stat, and disclosure patterns.                                   | Copying Tailwind components into the current CSS architecture.                       |
| [ThreeUI](https://threeui.com/)                                                                                                                         | Borrow depth, focal hierarchy, and cinematic staging.                                              | Three.js, shaders, WebGL, or pointer-heavy scenes in the core journey.               |
| [Haikei](https://haikei.app/)                                                                                                                           | Optional static contour/wave SVG in brand colors.                                                  | Runtime generation or animated background noise.                                     |
| [Taste Skill](https://www.tasteskill.dev/)                                                                                                              | Audit-first redesign, explicit typography/spacing/color/motion rules, and anti-template review.    | A style change that ignores the existing product contract.                           |
| AIPRM, FlowGPT, PromptHero, PromptBase, UI Prompt, Design Prompts                                                                                       | Prompt vocabulary and divergent moodboard exploration.                                             | Treating community prompts as usability evidence or copying unverified generated UI. |

### Community evidence

- In [I Built My Own Fitness Dashboard Because the Technogym App Wasn't Cutting It](https://dev.to/kanurag4/i-built-my-own-fitness-dashboard-because-the-technogym-app-wasnt-cutting-it-1fe2), Anurag keeps transformation and aggregation outside chart components. Footwork should follow that separation: `movement_summary` prepares trustworthy values, and visual components render them. A comment also notes that absolute values need context; Footwork supplies personal context such as active versus elapsed time and clear versus uncertain intervals, not population benchmarks it does not have.
- In [React useReducedMotion Hook: Respect prefers-reduced-motion (2026)](https://dev.to/childrentime/react-usereducedmotion-hook-respect-prefers-reduced-motion-2026-58i8), childrentime distinguishes disruptive large-scale motion from short functional feedback. A substantive comment warns that a universal animation-killing selector also removes useful confirmation. Footwork therefore scopes reduced-motion behavior by component: route travel and animated counting stop, while focus, press, and short status confirmation remain.

### Prompt briefs for design exploration

These prompts are for moodboards and wireframes only. Output must be reviewed against this document before implementation.

**Brand board**

> Create a mobile-first brand board for Footwork, an outdoor music studio where a walk becomes a song. Use a midnight-cobalt field, cyan route traces, violet waveform energy, amber event markers, and coral only for ending. Combine topographic contours, a privacy-safe route fingerprint, and restrained editorial typography. Avoid generic SaaS gradients, glass-card overload, fitness rings, streaks, badges, and photorealistic runners.

**Result screen**

> Design a 390 px mobile Soundprint result with an album-like route cover, audio player, four visual journey stats, a segmented pace-colored route, an aligned movement-to-music ribbon, and three tappable event cards that seek playback. The page should feel like a premium music artifact, not a dense health dashboard. Every chart must have a text alternative and a static reduced-motion state.

**Motion storyboard**

> Storyboard one SVG walker and route line across four states: ready, recording, paused, and generating. During generation, transform route points into meaningful markers, then into a waveform and cover. Use short state-driven transitions, no continuous background loop, no camera motion, and provide a static reduced-motion frame for each state.

## 10. Phase 1 execution steps

No step below is implemented by this document.

### P1.7 — Lock the extension contract and art direction

**Estimate:** 30 minutes
**Kind:** Documentation/design
**Proposed commit:** `Plan the pause journey and visual Soundprint extension`

- Align `FRONTEND_EXPERIENCE.md`, the result contract proposal, and visible states.
- Produce one approved Nocturne Pulse token sheet and one result wireframe at 390 px and 1280 px.
- Mark all metrics as measured, derived, unavailable, or forbidden.

**Done when:** There is one visual direction, one result reading order, and no ambiguous analytics field.

### P1.8 — Build the pause and resume interaction

**Estimate:** 45 minutes
**Kind:** Frontend
**Proposed commit:** `Add pause and resume states to the walk journey`

- Add Pause walk, paused, resuming, resume failure, and restoration states to the practice port.
- Separate active time from break time.
- Preserve the hold-to-end safety action in recording and paused states.

**Done when:** The practice journey pauses, survives a reload fixture, resumes without drawing across the break, and remains keyboard- and screen-reader-usable.

### P1.9 — Extend the Soundprint analytics contract and fixture

**Estimate:** 40 minutes
**Kind:** Contract/fixture
**Proposed commit:** `Add honest movement summaries to the Soundprint contract`

- Add `movement_summary`, segments, gaps, pace buckets, event counts, and plain quality state.
- Update validation and the synthetic fixture.
- Add positive and invalid-data tests.

**Done when:** Every proposed visual has typed data, and missing or low-quality data produces an explicit unavailable state.

### P1.10 — Apply Nocturne Pulse across the journey

**Estimate:** 45 minutes
**Kind:** Frontend styling
**Proposed commit:** `Apply the Nocturne Pulse visual system`

- Replace the green-led palette, refine type scale, and add the restrained contour/route graphic language.
- Keep semantic colors consistent across landing, recording, generation, and result.
- Verify text, control, focus, and chart contrast.

**Done when:** The theme is coherent at all target widths and critical status never depends on a gradient or color alone.

### P1.11 — Build the visual journey recap

**Estimate:** 55 minutes
**Kind:** Frontend visualization
**Proposed commit:** `Turn the Soundprint result into a visual journey recap`

- Add at-a-glance stats, segmented route, movement ribbon, event composition, and improved event cards.
- Preserve the player/route/timeline 500 ms synchronization contract.
- Use progressive disclosure for quality details.

**Done when:** A user can understand the journey and its musical influence primarily from visuals, with accessible text alternatives and no invented metrics.

### P1.12 — Add purposeful walker and transformation motion

**Estimate:** 40 minutes
**Kind:** Frontend motion
**Proposed commit:** `Animate the walk to Soundprint transformation`

- Reuse one SVG character motif across ready, recording, paused, generation, and playback.
- Tie result motion to the audio clock and state transitions.
- Supply static reduced-motion states.

**Done when:** Motion explains state and causality, stops when irrelevant, and adds no WebGL or autoplay media.

### P1.13 — Verify the upgraded frontend

**Estimate:** 35 minutes
**Kind:** Verification
**Proposed commit:** `Verify the upgraded walk and Soundprint experience`

- Test 360, 390, 430, 768, and 1280 px.
- Test keyboard, focus order, screen-reader names, contrast, reduced motion, hidden-page behavior, pause restoration, and synchronized seeking.
- Measure build size and slow-mobile landing/result timings against the Step 5 baseline in `HANDOFF_2.md`.

**Done when:** Required checks pass, the result is usable without motion, and regressions or budget exceptions are recorded honestly.

## 11. Priority and cut order

### Must ship in this extension

1. Pause/resume state and honest break semantics.
2. Nocturne Pulse theme and accessible semantic colors.
3. Typed movement summary and visual result hierarchy.
4. Segmented route, movement ribbon, and synchronized event cards.
5. Reduced-motion equivalents and responsive verification.

### Keep if the timebox holds

1. Walker motif across all four journey stages.
2. Journey-composition event visual.
3. Animated numeric entry and route-to-waveform transformation.

### Cut first

1. Extra background texture variants.
2. More than three animated event effects.
3. Secondary theme or light mode.
4. Decorative hover motion on non-interactive surfaces.
5. Any new animation dependency.

## 12. Acceptance checklist

- [ ] Pause walk and Resume walk are separate, reachable actions.
- [ ] Manual breaks are not treated as movement or natural pause events.
- [ ] Reloading/restoring a paused fixture preserves the paused state.
- [ ] Active time, elapsed time, break time, and distance use documented definitions.
- [ ] The route never draws an invented straight segment across a gap.
- [ ] Results visually show route shape, movement rhythm, event mix, and musical influence.
- [ ] The same audio clock drives player, route cursor, ribbon, and active event.
- [ ] No calories, elevation, health claims, or unsupported precision appear.
- [ ] Nocturne Pulse passes contrast checks and has non-color status labels.
- [ ] Animation is state-driven, stops when hidden, and has static reduced-motion equivalents.
- [ ] Core actions remain at least 44 px and usable at 200% text zoom.
- [ ] No horizontal overflow occurs at 360, 390, 430, 768, or 1280 px.
- [ ] No new dependency, WebGL runtime, or remote asset is added without an explicit recorded decision.

## 13. Budget decision required before implementation

The seven planned steps total approximately 290 minutes. The original 20-hour execution plan already allocated the full budget across P0–P5, and the original P1 window is already complete locally. The user has approved the feature direction but has not yet changed the 20-hour ceiling or named later work to remove.

Before P1.7 implementation starts, record one decision:

1. Increase the active-work ceiling by about five hours; or
2. Replace equivalent lower-priority work in later phases; or
3. Use the Must ship list only and stop at a smaller approved timebox.

Do not silently consume release verification, privacy, provider proof, or submission time to fund visual polish.
