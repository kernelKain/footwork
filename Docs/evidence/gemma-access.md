# Gemma access proof

Recorded October 9, 2026, then updated October 11, 2026. A named Gemma call on the Space returned one validated arrangement. Latency and quota were not measured. The plan has not yet been sent to Eleven Music.

| Check | Result |
|---|---|
| Model | `google/gemma-4-E2B-it` |
| Revision in local environment | `3e22461f65e89153144f8adb70e3b8c2cc9845a7` |
| Public metadata | Not private, not gated, Apache-2.0. The public revision matches the local environment. |
| Hugging Face token | Present in `backend/.env`. The value is not recorded here. |
| App environment | `APP_ENV=local`. `PUBLIC_BASE_URL=http://127.0.0.1:8000`. |
| Space | `https://kernelkain-footwork.hf.space` |
| Space record | Public Gradio Space `kernelKain/footwork`. Hardware `zero-a10g`. The app file is deployed. |
| Generation | One validated plan on October 11, 2026. The input and output are below. |
| Latency | Not measured. |
| Quota | Not measured. |
| Arrangement hash | None. |
| Fallback | Route Sketch remains the result when a reply is blocked or invalid. |

## Checked call

Input sent to `/arrange`:

```json
{"schema_version":"1","duration_ms":60000,"events":[{"id":"turn-1","type":"turn","audio_offset_ms":12000},{"id":"pause-1","type":"pause","audio_offset_ms":30000}]}
```

Output returned by the Space:

```json
{"schema_version":"1","status":"valid","code":"validated","model_id":"google/gemma-4-E2B-it","model_revision":"3e22461f65e89153144f8adb70e3b8c2cc9845a7","arrangement":{"mood":"warm_cinematic","style":["instrumental","warm","cinematic","rising"],"event_refs":["turn-1"]},"fallback":null,"message":"A validated arrangement was generated."}
```

The plan cites the turn and does not cite the pause. That still matches the schema. `style` includes `instrumental`.

On October 11, 2026 the user confirmed the studio path is on. Commit `481b2c2` asks this Space for a plan before any studio render. Commit `b895304` accepts a one-word style. The Render service at https://footwork-m6g0.onrender.com/ has `GENERATION_ENABLED` set to `true`, and the Eleven key is in that dashboard. A validated plan is the only request sent to Eleven. This checked plan was not sent to Eleven.
