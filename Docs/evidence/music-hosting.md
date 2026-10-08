# Music and hosting access

Recorded October 9, 2026. One short Eleven Music generation succeeded. No Render service was created.

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
