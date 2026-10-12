# Implementation decisions

This is a short record of the decisions that guided the build. It replaces the
old phase-by-phase plan. Current product behavior is documented in
[HANDOFF_2.md](HANDOFF_2.md).

## Chosen stack

| Area              | Choice                  | Reason                                             |
| ----------------- | ----------------------- | -------------------------------------------------- |
| Interface         | React, TypeScript, Vite | Fast mobile UI with typed contracts                |
| Browser tests     | Playwright and axe-core | User-flow and accessibility checks                 |
| API               | FastAPI and Pydantic    | Clear Python validation and HTTP contracts         |
| Movement analysis | Python and NumPy        | Route cleaning and deterministic event detection   |
| Arrangement       | Gemma on Hugging Face   | Open-weight model for structured musical direction |
| Music             | Eleven Music            | Instrumental rendering from a validated plan       |
| Hosting           | Render                  | One public service for the frontend and API        |

## Important boundaries

- The browser owns location permission and the active recording draft.
- The backend validates and cleans movement before building an event timeline.
- Gemma receives movement events, not raw coordinates.
- Eleven Music receives only a validated arrangement.
- The route, player, ribbon, and current-moment text share one playback clock.
- Route Sketch uses the same movement timeline when live music is unavailable.
- The prepared example is always labeled as an example.

## Build approach

The interface and fixture contracts were built first. Real recording and backend
processing then replaced the fixtures without changing the public result shape.
Provider integrations were added behind validation and fallback paths. Final
work focused on recording clarity, accessibility, synchronized playback, and a
single coherent Soundprint page.

## Quality checks

The repository includes:

- Backend unit and API tests
- Python linting
- TypeScript type checking and linting
- Browser journeys at phone and desktop widths
- Accessibility checks
- Tests for recording recovery, synchronization, provider failures, and quotas

Run the commands in the main [README](../README.md#checks) before deploying.
