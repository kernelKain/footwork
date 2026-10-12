# Real-walk review

A real outdoor walk was used to review the movement pipeline and the resulting
studio track. Raw location data and provider identifiers are intentionally not
stored in the repository.

## What was checked

- The recording contained enough usable movement for analysis.
- Cleaning removed location noise without inventing route events.
- The sanitized summary contained turns, pauses, or pace changes that matched the
  remembered walk.
- The generated result could be played in the Soundprint.
- Reviewers could compare audible changes with the movement timeline.

## Safe review process

1. Keep the original recording in a local, ignored directory.
2. Run the movement exporter in preview mode.
3. Confirm that the detected events match the walk.
4. Export only the coordinate-free summary if a fixture is needed.
5. Listen for several movement-to-music mappings and record pass/fail notes
   without adding location or provider account data.

Example preview command:

```bash
uv run --directory backend python -m app.movement.export_fixture /path/to/private-walk.json
```

Add `--approve` only after checking the preview. Never commit the original walk.
