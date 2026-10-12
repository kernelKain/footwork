# Final product and implementation handoff

This is the current overview of Footwork. It combines the useful product,
frontend, and final-polish notes that were previously spread across separate
planning files.

## Product summary

Footwork is a mobile-first outdoor music studio. It records a walk, finds
meaningful movement patterns, turns those patterns into musical direction, and
presents the result as a synchronized **Soundprint**.

The experience is designed around one promise: the movement should be visible
in both the explanation and the sound.

## Public pages

- `/` introduces Footwork, starts a real walk, and offers a prepared example.
- `/studio` shows recording progress, generation states, and the Soundprint.
- `/about` opens the explanation section on the landing page.
- `/w` opens a shared Soundprint when the link is still valid.

There is no account system, social feed, route gallery, health dashboard, or
literal map.

## Recording journey

1. The person starts a walk and reads a short location explanation.
2. The browser asks for location access and begins collecting samples.
3. Recording shows active movement, connection quality, and a clear end action.
4. The person can pause and resume. A manual break is separate from a naturally
   detected pause in the route.
5. Ending the walk saves and submits the recording before generation begins.
6. The result opens on the Soundprint page.

The interface recommends enough active movement to create a useful result, but
it still allows the person to end early. Recoverable failures explain what to do
next instead of leaving the screen in a loading state.

## Visual experience

Footwork has two themes:

- **Nocturne Pulse** uses dark navy surfaces, cyan routes, violet music, amber
  movement markers, blue pauses, and coral for ending a walk.
- **Daylight** uses warm light surfaces and deeper versions of the same colors.

The theme control is an icon with an accessible name. Device preference is used
until the person chooses a theme.

A small walker connects the landing, recording, processing, and playback states.
Decorative motion stops when reduced motion is requested. Focus, status, and
other useful feedback remain clear without animation.

## Movement analysis

The backend cleans the recorded samples before using them. It removes invalid
points, rejects impossible jumps, reduces stationary drift, and groups accepted
points into a simpler route.

From that route it detects events such as:

- Meaningful turns
- Natural pauses
- Pace changes
- Loops and returning patterns
- Gaps between manually recorded segments

Small GPS changes do not become individual musical events.

## Movement-to-music rules

| Movement event | Intended musical effect                           |
| -------------- | ------------------------------------------------- |
| Turn           | Change melodic direction                          |
| Pause          | Hold, rest, or thin the arrangement               |
| Faster pace    | Increase rhythmic energy                          |
| Slower pace    | Simplify or soften the arrangement                |
| Loop           | Bring back an earlier motif                       |
| Open ending    | Finish without pretending the route returned home |

These rules shape both the deterministic Route Sketch and the plan sent to the
music provider. The interface describes a mapping as heard only when it belongs
to a reviewed recording; otherwise it describes the mapping as planned.

## Soundprint

The final result is one music page rather than a dashboard of unrelated cards.
It includes:

- An album-style hero with one primary audio player
- A privacy-safe route drawing
- A movement ribbon aligned to playback
- A “Now playing” explanation for the current section
- Movement moments that explain what shaped the piece
- A short written journey summary
- Compact movement and composition counts
- A sticky mobile player that controls the same audio element

The player, route, ribbon, and text all use one clock. Scrubbing the audio moves
the visual state; the visuals do not run on independent timers.

## Generation flow

1. FastAPI validates the recording and extracts an anonymous event timeline.
2. The Hugging Face service asks Gemma for a constrained JSON arrangement.
3. The backend rejects unknown events, unsupported moods, and invalid styles.
4. Only a valid arrangement can be compiled for Eleven Music.
5. The returned audio is checked before the Soundprint is marked ready.

When a provider is unavailable or returns an invalid result, Footwork uses the
Route Sketch instead of inventing a successful studio recording. The prepared
example is a separate asset and does not call either provider.

## Data boundaries

- Raw coordinates stay in the recording and processing boundary.
- External providers receive an anonymous movement timeline or validated music
  plan, not the original route.
- Provider keys stay on the server.
- Public links use an unguessable capability and do not contain location data.
- Accepted browser drafts are cleared after submission.
- Server-side quotas use digests rather than storing browser installation keys.

These measures reduce exposure but do not make a recognizable route anonymous
in every possible context.

## Responsive and accessible behavior

- Core controls are usable with a keyboard.
- Status updates are announced to assistive technology.
- Color is not the only way a state is communicated.
- The result remains understandable when motion is reduced.
- Phone layouts avoid horizontal overflow and keep the active player reachable.
- Desktop layouts add space without changing the journey or audio behavior.

## Failure behavior

The public interface has specific states for denied permission, unsupported
browsers, interrupted recording, weak route quality, arrangement failure, music
failure, and generation limits. Each state explains whether the person can retry,
use a Route Sketch, or hear the prepared example.

Unknown provider outcomes are not retried automatically because an unseen music
request may still have succeeded.

## Verification

Automated coverage checks the movement pipeline, API contracts, provider
validation, fallbacks, recording recovery, themes, reduced motion, responsive
layouts, accessibility, and single-clock playback.

Manual release checks should still cover:

- A real outdoor recording on the target phone and browser
- Location denial and interrupted-network recovery
- Audible review of several movement-to-music moments
- A shared result in a separate browser session
- The deployed health endpoint and live provider configuration

## Source guide

| Area                 | Location               |
| -------------------- | ---------------------- |
| React interface      | `frontend/src/`        |
| Browser journeys     | `frontend/tests/`      |
| FastAPI service      | `backend/app/`         |
| Backend tests        | `backend/tests/`       |
| Gemma Space          | `hf-space/`            |
| Deployment blueprint | `deploy/render.yaml`   |
| Synthetic fixtures   | `fixtures/synthetic/`  |
| Architecture guide   | `Docs/architecture.md` |
| Provider evidence    | `Docs/evidence/`       |

## Future ideas

Possible later work includes more musical moods, native background recording,
more detailed movement stories, and stronger human-review tooling. These are not
part of the current product contract.
