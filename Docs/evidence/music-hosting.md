# Music and hosting access

Recorded October 9, 2026. One short Eleven Music generation succeeded. No Render service existed on that date. The public service confirmed on October 11, 2026 is in the Public service section below.

| Check | Result |
|---|---|
| ElevenLabs key | Present in `backend/.env`. The value is not recorded. |
| Account read | `GET /v1/user` and `GET /v1/user/subscription` returned 401. The key is missing the `user_read` permission, so tier and balance were not read. |
| Model | `music_v2_5`, sent explicitly. |
| Request | One composition-plan chunk, 3000 ms, instrumental styles, no lyric text and no artist names. `force_instrumental` was not sent. |
| Request SHA-256 | `7658928e848e246b59b2ac87d02667c283d476f3051d1145cfcdb47bc7cf1e77` |
| Response | HTTP 200, `audio/mpeg`, 48528 bytes. |
| Provider song id | `OKldGOIYKQQ3rmFF7OXM` |
| Decoded duration | 3.030188 seconds, measured with `ffprobe`. |
| Local file | `artifacts/eleven-proof.mp3`, ignored by git. |
| Balance | Not visible with this key. No second request was made. |
| Render CLI | `render` v2.28.0 at `~/.local/bin/render`. `render whoami` succeeded. |
| Render workspace | Active workspace name `My Workspace`, id `tea-da16h79t0dsc73b4d4hg`, type team. |
| Existing services | One unsuspended web service on plan `1c-2g` in Singapore, and one static site. Neither is a Footwork service. |
| Footwork service | Not created. |
| Render credit | $50, stated by the user on October 9, 2026. The CLI still cannot read the Billing page. |
| Planning estimate | About $25 per month for 1 CPU / 2 GB. Five days is about $4.17 of compute before storage or bandwidth. |
| Hosting choice | One paid web service on plan `1c-2g` (1 CPU / 2 GB), covered by the stated $50 credit. No Footwork service has been created yet. |
| New spend | No new purchase and no new Render service. One minimum-length music request used the existing key. |

Studio generation is possible with this key. A Route Sketch remains the fallback when a later Studio request fails. This 3-second file is an access proof, not the 45–60 second demonstration track.

## Public service

On October 11, 2026 the user confirmed the studio path is on. The Render service is https://footwork-m6g0.onrender.com/. Its dashboard has `GENERATION_ENABLED` set to `true`, and the Eleven key is present there. A validated Gemma plan is the only request sent to Eleven. The committed blueprint still lists `GENERATION_ENABLED` as `false`. No new song id was recorded for this confirmation.

## Timed arrangement render

Recorded October 10, 2026. One 60-second composition-plan render succeeded on the first attempt. No second request was made.

| Check | Result |
|---|---|
| Model | `music_v2_5`, sent explicitly. |
| Request | Four chunks totaling 60000 ms. Section labels only. Negative styles exclude vocals, lyrics, and speech. No prompt and no `force_instrumental`. |
| Request SHA-256 | `5100159eda409713310806b37b8199cbf25cbc3929a06bf56456407b08c84e19` |
| Response | HTTP 200, `audio/mpeg`, 960515 bytes. |
| Provider song id | `6JZhKLyXn9BrPEPAnUQC` |
| Decoded duration | 60.029375 seconds, measured with `ffprobe`. |
| Local file | `artifacts/eleven-arrangement.mp3`, ignored by git. |
| Retry | Not attempted. A timeout or lost response stays a single attempt. |
| Balance | Still not visible with this key. |
