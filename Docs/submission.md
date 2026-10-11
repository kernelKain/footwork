# Submission checklist

Hacktoberfest Open-Source AI Challenge, Week 1. The explanation stays unpublished until it is reviewed. Do not publish from this file.

## Links

- Public app: https://footwork-m6g0.onrender.com/
- Repository: https://github.com/kernelKain/footwork
- Architecture: `Docs/architecture.md`
- Diagram source: `Docs/diagrams/architecture.excalidraw`
- Runbook: `Docs/demo-runbook.md`
- Local draft: `Docs/write-ups/footwork-challenge-draft.md`
- Unpublished DEV draft, for editing only: https://dev.to/kernelkain/a-walk-writes-the-instrumental-then-the-soundprint-shows-where-c29-temp-slug-9075242/edit

## Required article tags

`#devchallenge` and `#hf26challenge`. The DEV draft also needs a clear statement that an agent helped write it.

## Checklist

- [x] Public app URL responds. On October 12, 2026, `GET /health` returned status `ok`, API version `v1`, and schema version `1`.
- [x] Landing page shows Start walking, Hear an example, and Hear what a moment does. No coordinate download was offered.
- [x] Hear an example opens `/studio`, labels the piece Example walk, and plays from one control. The route, ribbon, and current moment stay with that audio.
- [x] The theme control switches and keeps Daylight or Nocturne Pulse across a reload. The accessible name is the theme it will activate.
- [ ] Backup video added and checked against `Docs/demo-runbook.md`.
- [ ] Hero screenshot and mobile screenshot added.
- [ ] Architecture diagram exported to PNG.
- [ ] Heard times filled in `Docs/evidence/seed-walk-review.md` for a turn, a pause, and one more change.
- [ ] Real-phone pass of the 1:30 guidance, saving transition, touch targets, sticky player, and animation.
- [ ] A finished share link checked: it opens `/w` and does not contain a location.
- [ ] DEV article reviewed and published by the author. Record the URL here.
- [ ] Sponsor evidence in the article matches `Docs/evidence/gemma-access.md` and `Docs/evidence/music-hosting.md`.

## Still limited

- The seed-walk listening sheet has no heard times and no song id.
- Gemma latency and quota for the checked plan were not measured.
- Eleven balance was not readable with this key.
- The CodeRabbit GitHub App install is still unconfirmed.
- This commit raises the shared daily ceilings to 40 Gemma attempts, 2400 GPU seconds, and 40 music attempts, and keeps one installation at 8 jobs. The public site checked above is the earlier deployed build. `autoDeployTrigger` stays off.
