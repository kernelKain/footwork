# Seed walk review

On October 12, 2026 the user confirmed the sanitized outdoor walk is saved and the studio recording made from that walk has been reviewed. Raw locations stay out of this repository. `fixtures/sanitized-real/seed-walk.json` is not in the repository. The Heard column below was not filled, and no song id for that studio file is written here.

## What is already prepared

`backend/app/movement/export_fixture.py` reads the private file, drops coordinates and wall-clock time, and can write `fixtures/sanitized-real/seed-walk.json`. It does not invent moments. It does not call Gemma or Eleven. `human_reviewed` stays false.

The user confirmed the hearing. This sheet does not hold the three song times, so it is not the timestamped AC-03 record. The file `artifacts/eleven-arrangement.mp3` was not made from this walk.

## What you do

1. On the same phone, open https://footwork-m6g0.onrender.com/ within 24 hours of ending the walk. If the walk is still stored, the landing page offers **Download the walk stored on this phone**. That file contains your location. Do not commit it.
2. Copy it to `recordings/footwork-private-walk.json` on this computer. `recordings/` is gitignored.
3. From the repository root, preview the moments:

```bash
uv run --directory backend python -m app.movement.export_fixture ../recordings/footwork-private-walk.json
```

4. If the printed moments match the walk you remember, write the fixture:

```bash
uv run --directory backend python -m app.movement.export_fixture ../recordings/footwork-private-walk.json --approve
```

That command replaces this sheet with one row per moment. The last two columns stay empty.

5. Submit that same walk once on https://footwork-m6g0.onrender.com/ so Eleven records a studio file from it. One submission uses one Gemma attempt and, if the plan validates, one music attempt. Play that studio file, not the October 10 proof clip.
6. In the replaced sheet, mark Heard and write the song time where you hear a turn, a pause, and one more change (a brighter pace, or the opening line returning). If you cannot hear those three, write that AC-03 failed.

| Moment | Song time | Listen for | Heard | Time you heard it |
|---|---|---|---|---|
|  |  |  |  |  |
