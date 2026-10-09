# Footwork

> **Every walk writes a song.**

**Brand line:** Your route is the score. Your movement is the performance.

The public journey for this build is: Understand Footwork, start walking, record safely, end the walk, generate, and hear the Soundprint. Page structure, plain-language copy, and the interface states are in `Docs/FRONTEND_EXPERIENCE.md`. Where this concept is broader than that file or `Docs/HANDOFF_1.md` — extra moods, MapLibre, or a longer track — those implementation documents win.

## Current public experience

This is what the application shows now.

- `/` explains Footwork and holds the practice walk. Start walking opens a readiness sheet. The practice does not ask for location and does not hold the screen awake. A paused practice keeps its time and segments on this phone. It does not save a location route.
- Ending the practice opens generation on `/studio`. The wait names four stages and an elapsed time. It does not show a percent. The result is the labeled example.
- `/studio` is the Soundprint: hero, glance totals, a segmented route, a movement ribbon, movement-to-music cards, composition counts, a short walk story, and optional details. Hear an example opens that same example. A small walker marks ready, recording, paused, generation, and playback.
- `/about` opens How it works on `/`.
- There is no global Walk / Soundprint / How it works navigation, no Sponsors section, and no Provenance section. Sponsor roles and technical provenance stay in this file, `Docs/HANDOFF_1.md`, and `README.md`.
- The pages use two themes with the same roles. Nocturne Pulse is the dark theme: midnight and cobalt surfaces, cyan for the route, violet for music and playback, amber for movement moments, blue for a pause, and coral only for ending a walk. Daylight is the light theme: warm paper surfaces and deeper versions of those same colors so text and controls stay readable. The header switches them. The device choice is the default.

Mood choice, Pocket Mode, a public share link, and a desktop QR code are later product ideas. They are not controls on these pages.

## Planned Phase 1 experience extension

`Docs/PHASE_1_UI_UX_PLAN.md` is the spec for the October 9, 2026 extension. Pause and resume, Nocturne Pulse, Daylight, the movement summary, the walker, and the visual recap are on this branch.

- Recording has Pause walk, Resume walk, separate active and break timers, and restoration of a paused draft on this phone.
- A manual break creates a gap between recording segments. It is not counted as movement and is not the same as a naturally detected pause that may influence the music.
- The public pages use Nocturne Pulse. The walker and the visual journey recap are on the current screens.
- One small walker carries the person from landing to recording, pause, generation, and synchronized playback. Motion stays state-driven and has a static reduced-motion equivalent.
- The Soundprint is a visual journey recap with at-a-glance stats, a segmented route, a movement ribbon, movement-to-music moments, an event-composition visual, and a short story.
- Visual analytics stay limited to data in the validated movement summary: active and elapsed time, manual-break time, within-segment distance, relative pace, accepted event counts, gaps, and a plain quality state. Calories, heart rate, steps, elevation, and health advice remain out of scope.

The extension is planned as steps P1.7–P1.13. Its estimated 290 minutes still need an explicit budget decision because the original 20-hour plan was already fully allocated. P1.7 was not a separate implementation step; those decisions are the plan document.

## Product Summary

Footwork is a mobile-first outdoor music studio that transforms a real walk or run into a polished instrumental song and an interactive **Soundprint** showing exactly how the person's movement shaped the music.

Unlike a fitness tracker, Footwork does not reduce the journey to distance, calories, and pace. Unlike a playlist application, it does not merely play unrelated music during the walk. The physical journey becomes the source material for the composition.

## Target User

Footwork is initially designed for casual walkers, runners, travellers, students, and creative-technology users who want something more meaningful than another activity summary.

Users do not need musical knowledge. They only need a phone and a willingness to take a 5-minute to 3-hour walk or run.

## The Problem

Existing activity applications record useful statistics but rarely preserve the character of a journey. Turns, pauses, repeated paths, pace changes, elevation, and the return home disappear into a conventional route map.

AI music generators can create songs from text, but the result is disconnected from the person's real physical experience.

Footwork connects these two worlds by making movement responsible for the musical structure.

---

## Core User Experience

### Before the Walk

The user opens Footwork on their phone. In the current build they read the landing page, start a labeled practice walk, and can hear the example. A later recording build is planned to:

1. Grant precise-location permission after a plain explanation.
2. Keep this tab open.
3. Tell the person to keep the screen awake when the browser cannot hold it.
4. Tap Start walking.

**Supported later moods, not chosen in the current build:**

- Warm Cinematic
- Bright Electronic
- Peaceful Ambient

### During the Walk

The current practice shows Recording, active walking time, a plain signal, Pause walk, and Hold to end walk. A paused practice shows the current break separately and can be restored in this tab. It does not track location. A later recording build is planned to enter Pocket Mode:

- The interface becomes almost black.
- The browser requests a Screen Wake Lock.
- A small green indicator confirms tracking.
- A large, high-contrast End Walk button remains visible.
- Accidental taps are ignored.
- Location points are stored progressively.
- The user places the phone in their pocket and walks normally.

The screen remains technically awake for reliable browser tracking, but the user does not need to look at or operate it.

A normal web application cannot guarantee continuous tracking after the phone is manually locked. Footwork therefore clearly instructs users to keep the screen awake. True screen-off recording belongs to a future native version. ([Screen Wake Lock documentation](https://developer.mozilla.org/en-US/docs/Web/API/WakeLock/request))

### Ending the Walk

The End Walk button remains readable even at low brightness. To avoid accidental activation, the user holds it for two seconds while a progress ring fills.

The current practice uses that two-second hold, or a second press when motion is reduced. Ending it does not check a real route. It opens the generation wait, then the labeled example. A later build checks route quality before producing a piece from that walk.

---

## Movement-to-Music System

Footwork separates objective movement analysis from artistic musical direction.

### Route Structure

- Starting the walk creates the introduction.
- Meaningful turns change melodic direction.
- Long straight paths create sustained passages.
- Repeated loops become motifs or choruses.
- Retraced paths return earlier musical ideas.
- Pauses create rests, breaks, or breakdowns.
- Elevation gain moves toward a higher register.
- Elevation loss moves toward a lower or calmer register.
- Increased speed raises rhythmic intensity.
- Slowing down simplifies the arrangement.
- Returning near the start creates a resolved outro.
- Ending elsewhere creates an open ending or fade.

Small GPS fluctuations never generate individual notes. Python smooths movement and reacts only to meaningful patterns.

### Musical Principle

> **The route determines what happens, the walker determines how it happens, and the selected mood determines how it sounds.**

---

## Long-Walk Musical Compression

Footwork supports journeys from approximately 5 minutes to 3 hours, but the final track remains short and listenable.

| Journey length | Track length |
|---|---|
| 5–20 minutes | Approximately 45 seconds |
| 20–60 minutes | Approximately 60 seconds |
| 60–120 minutes | Approximately 90 seconds |
| More than 120 minutes | Maximum 120 seconds |

The journey is divided into chronological chapters. Distinctive moments receive more musical time, while long repetitive segments are compressed.

The audio becomes a musical summary, but the graph and animated route preserve the complete accepted journey.

---

## AI and Backend Responsibilities

### Python

Python is the primary backend and handles:

- GPS cleaning
- Impossible-jump rejection
- Stationary-drift filtering
- Direction and speed calculations
- Pause, loop, and retracing detection
- Journey chaptering
- Long-walk compression
- Musical constraints
- Structured-output validation
- Audio-quality checks
- Route and audio synchronization
- Privacy-safe route transformation

### Gemma (`gemma4:e4b`)

Open-weight Gemma acts as the musical director.

It receives an anonymized movement timeline and selected mood, then produces a constrained arrangement plan containing:

- Song sections
- Emotional progression
- Motif and chorus selection
- Instrument roles
- Harmony and rhythm
- Intensity curve
- Section transitions
- Ending style
- Explanations connecting movement to music

Gemma does not generate executable code or unrestricted notes. Python validates every field.

Without Gemma, Footwork can only use a fixed musical template. Gemma provides the personalized interpretation that makes each arrangement distinct.

### ElevenLabs

ElevenLabs is the studio-production engine.

Python converts Gemma's validated arrangement into an Eleven Music composition plan. ElevenLabs then renders the polished instrumental Studio Track.

Its essential roles include:

- Studio-quality music production
- Section-based generation
- Route-derived timing
- Instrumental output
- Mood adherence
- Style Remixes

Eleven Music supports structured composition plans rather than only generic text prompts. ([ElevenLabs composition-plan documentation](https://elevenlabs.io/docs/eleven-api/guides/how-to/music/composition-plans))

### Render

Render makes Footwork available through one public link and hosts:

- Mobile-friendly web application
- Python backend
- Gemma inference service
- Secure ElevenLabs integration
- Result-processing workflow
- Public Soundprint pages

Visitors do not need Ollama, Gemma, or ElevenLabs credentials.

The exact size and memory requirements of `gemma4:e4b` must be tested. If necessary, Footwork will deploy a smaller quantized Gemma checkpoint through the same interface.

### LangSmith

LangSmith provides development evidence through:

- Gemma traces
- Structured-plan validation
- Golden route datasets
- Regression testing
- Latency measurements
- Retry and fallback tracking

Raw coordinates are never sent to LangSmith.

### MapLibre

MapLibre powers the responsive animated route visualization. ([MapLibre documentation](https://maplibre.org/maplibre-gl-js/docs/))

### Open-Source Audio Fallback

If ElevenLabs is unavailable, Footwork produces a simpler deterministic **Route Sketch** through MIDI and an open-source synthesizer.

The Studio Track is the default product output. Route Sketch is a reliability fallback.

---

## Music-Quality Standard

Every published Studio Track must be:

- Instrumental
- Pleasant
- Positive or emotionally neutral
- Melodically coherent
- Harmonically compatible
- Cleanly mixed
- Free from clipping
- Free from harsh noise
- Smoothly transitioned
- Clearly concluded

Python checks duration, excessive silence, clipping, abnormal volume, missing sections, and corrupted output.

If a track fails validation, Footwork retries once using a safer arrangement. If the retry fails, it returns Route Sketch rather than publishing poor audio.

---

## The Soundprint Result

### Studio Track

A polished 45–120 second instrumental track with:

- Original title
- Mood and style
- Duration
- Playback controls
- Download option
- Unique route fingerprint

### Animated Route Score

The privacy-safe route animates in synchronization with the music:

- Active segment glows.
- Turns display melodic markers.
- Faster sections pulse.
- Pauses stop the animation.
- Loops illuminate during the chorus.
- Elevation changes alter colour or height.
- The return journey resolves with the outro.

### Interactive Route–Sound Graph

The graph explains exactly when and why the music changed.

The horizontal axis can display:

- Actual walk time
- Distance travelled
- Compressed musical time

The vertical visualization represents musical pitch, register, tempo, and intensity.

Users can tap, hover, zoom, or scrub to inspect events such as:

- Sharp turn → melody moved upward
- Faster pace → tempo increased
- Repeated loop → chorus began
- Pause → breakdown
- Elevation gain → higher register
- Return journey → resolving outro

Selecting a point moves the music, route animation, and graph playhead to the same moment.

### Movement Story

Footwork summarizes the journey's main creative contributions:

- Main motif
- Chorus
- Breakdown
- Energy peak
- Ending

These appear as the story behind the composition rather than fitness analytics.

---

## Mobile and Desktop Experience

Footwork is mobile-first. The current recording screen uses large labeled controls, a sticky end action above the device safe area, and one column on a phone. At a wide desktop width the Soundprint can keep the player and route beside the timeline.

Pocket Mode, pinch zoom, a copied result link, sharing, and a desktop QR code are not part of the current pages.

---

## Public Sharing and Privacy

Results remain private until the user selects **Create Public Link**.

Anyone with the public link can:

- Play the complete track
- Watch the complete abstract route
- Explore the graph
- Read the Movement Story
- Scrub synchronized playback
- Open the result without an account

The public result never contains:

- Raw GPX data
- Latitude or longitude
- Street names
- Exact starting or ending location
- Original timestamps
- Device data
- User identity

Before publishing, Footwork:

- Removes beginning and ending portions
- Converts coordinates into relative points
- Translates the origin
- Normalizes scale and orientation
- Simplifies geographic details
- Removes maps and street labels
- Publishes only derived movement information

These steps substantially reduce location-reidentification risk, although no transformation can guarantee that a distinctive route will be impossible to recognize. Users preview the sanitized route before publishing.

---

## Viral Mechanics

### Public Soundprints

Users can share a complete creative artifact rather than a statistics screenshot.

Example caption:

> This is the Soundprint of my evening walk.

### Style Remix

The same walk can be rendered in a different musical style while retaining the same chorus, breakdown, route chapters, and ending.

> Same footsteps. Completely different sound.

One prepared Style Remix comparison is included in the hackathon demo. Unlimited live remixing is outside the MVP.

### Movement Remix Challenge

A future feature converts the walk into a coordinate-free movement recipe that someone else can perform anywhere.

No exact route is shared.

---

## Differentiation

The broad walk-to-music concept already exists in products such as [Cadenzio](https://www.cadenzio.app/). Footwork does not claim to invent the entire category.

Its defensible differentiation is the combination of:

- Explainable Route–Sound Graph
- Studio-quality AI music
- Gemma-directed arrangement
- Long-walk musical compression
- Positive audio guardrails
- Complete Movement Story
- Privacy-safe public sharing
- Cross-device exploration
- Open-source fallback pipeline

The graph is the most important differentiator. If it does not accurately explain the movement-to-music relationship, Footwork loses its strongest advantage.

---

## Hackathon MVP

### Essential Capabilities

1. Live mobile location recording
2. Three supported moods
3. Route-event extraction
4. Gemma arrangement generation
5. ElevenLabs Studio Track generation
6. Pleasant-audio validation
7. Animated route
8. Interactive synchronized graph
9. Privacy-safe public Soundprint link
10. Responsive phone and desktop result

### Excluded From the MVP

- Native mobile application
- Guaranteed recording after manual screen lock
- User accounts
- Social feed
- Comments and reactions
- Leaderboards
- Multiplayer walks
- Automatic vertical-video export
- Vocals
- Payments
- Professional music editing
- Unlimited generation
- Large music-style library

---

## Testing Strategy

A hidden Route Replay Mode sends prepared GPS points through the same pipeline used by live tracking.

**Fixtures include:**

- Short walk
- One-hour walk
- Two-hour-ten-minute walk
- Zigzag route
- Circular route
- Repeated loop
- Several pauses
- Long straight path
- Return journey
- Poor GPS accuracy
- Missing coordinates
- Stationary drift
- Impossible jump

Testing covers tracking, route analysis, Gemma output, ElevenLabs audio, synchronization, privacy, mobile layout, desktop layout, and service fallbacks.

---

## Outdoor Validation

Two real tests will be performed:

### Tracking Test

An 8–12 minute familiar route verifies location permission, Wake Lock, Pocket Mode, route accuracy, End Walk, and result generation.

### Showcase Walk

A 20–30 minute route includes:

- Long straight beginning
- Several turns
- One pause
- One loop
- Faster section
- Slower section
- Return near the starting point

The final article records what worked, what failed, and what changed after the field test.

---

## Winning Demo

The memorable ten-second moment is:

1. The Studio Track plays.
2. The animated route reaches a repeated loop.
3. The loop begins pulsing.
4. The graph highlights **Loop → Chorus**.
5. The music enters a recognizable chorus.

The judge can hear the result, see the cause, and understand the product immediately.

**The complete 60-second demonstration shows:**

- Start Walk or prepared route
- Detected movement events
- Gemma arrangement
- ElevenLabs generation
- Studio Track reveal
- Graph interaction
- Style Remix comparison
- Public privacy-safe Soundprint
- Live Render deployment

Cached verified results protect the demo from external-service failure.

---

## Challenge Qualification

Footwork targets the active [Hacktoberfest Open-Source AI Challenge: Week 1](https://dev.to/challenges/hacktoberfest-week1-2026-10-05), closing October 12, 2026 at 12:29 PM IST.

**Recommended categories:**

1. Best Use of Gemma
2. Best Use of ElevenLabs
3. Best Use of Render
4. Overall Challenge

### Why It Fits "Touch Grass"

The user's physical movement is not a bonus or verification step. It is the irreplaceable source material.

The phone remains in the pocket during the main experience, and the user returns to the screen only for the creative result.

### Why It Could Win

- Immediate visual and musical reveal
- Direct theme relevance
- Real outdoor use
- Open-weight AI at the core
- Meaningful sponsor integrations
- Strong backend processing
- Explainable AI behaviour
- Responsible location privacy
- Honest testing story
- Clear product potential

---

## Product Potential

Footwork can expand into:

- Personal musical travel diary
- Creative walking application
- Tourism experiences
- School STEM and arts activities
- Campus wellness programs
- Event installations
- Branded walking campaigns
- Fitness and lifestyle partnerships

A sustainable future business model would provide limited free Studio Tracks and charge for additional generations, remixes, private history, and premium downloads.

Precise location data must never be sold or used for advertising.

---

## Must-Be-True Claim

> Given a valid live-recorded walk with sufficient movement variation and one supported positive mood, Footwork produces a pleasant short instrumental track and a synchronized privacy-safe Soundprint that explains how the complete journey shaped the composition.

---

## Primary Risks

- Gemma may require more Render memory than expected.
- The Ollama model artifact may need deployment adjustment.
- Mobile tracking may vary between browsers.
- ElevenLabs may not follow every composition section precisely.
- Generated music may occasionally fail the pleasantness requirement.
- Route sanitization may not eliminate every reidentification risk.
- The complete workflow may exceed the desired processing time.
- Existing walk-to-music products reduce perceived originality.
- The project barely fits the remaining development window.

---

## Final Priority Order

Protect these four capabilities above everything else:

1. Reliable live tracking
2. Gemma-to-ElevenLabs composition pipeline
3. Pleasant Studio Track
4. Accurate synchronized Route–Sound Graph

Everything else is secondary.

---

## Development Toolchain

Set up in Phase 0. These tools support how Footwork is reviewed, checked, diagrammed, and written up. They are not part of the running application.

| Tool | Role |
|---|---|
| CodeRabbit | Code review on pull requests |
| Entire | Agent session sharing, linked to commits |
| DevRelay | DEV write-ups |
| GitHub Actions | Automated checks |
| Excalidraw | Architecture diagrams |

The locked setup, boundaries, and Phase 0 steps are in `Docs/HANDOFF_1.md`.

---

## Naming Note

**Footwork** was selected despite an existing soccer-training application and its established meaning as a music genre. It has not received formal trademark or domain clearance.
