# Music and hosting evidence

This note records only the technical behavior needed to understand the running
system. Account, billing, workspace, and provider-request identifiers are not
kept in the repository.

## Eleven Music

- The configured `music_v2_5` model returned valid MPEG audio from an
  instrumental composition plan.
- A multi-section arrangement also returned decodable audio.
- Requests use section labels and instrumental style constraints rather than
  lyrics or artist imitation.
- An ambiguous timeout is not retried automatically because the first request
  may still have completed.
- Route Sketch remains available when music rendering fails.

## Public service

The application is available at <https://footwork-m6g0.onrender.com/>. Render
serves the built React application and FastAPI from one service. The deployment
blueprint keeps live generation disabled by default; the service owner must
explicitly enable it after configuring provider values.

## Provider boundary

The API sends Eleven Music only a plan that has already passed the Gemma response
schema and event-reference checks. Raw coordinates and browser recording data are
not part of the music request.
