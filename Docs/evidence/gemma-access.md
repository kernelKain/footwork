# Gemma access proof

Recorded October 9, 2026. No arrangement was generated.

| Check | Result |
|---|---|
| Model | `google/gemma-4-E2B-it` |
| Revision in local environment | `3e22461f65e89153144f8adb70e3b8c2cc9845a7` |
| Public metadata | Not private, not gated, Apache-2.0. The public revision matches the local environment. |
| Hugging Face token | Present in `backend/.env`. The value is not recorded here. |
| App environment | `APP_ENV=local`. `PUBLIC_BASE_URL=http://127.0.0.1:8000`. |
| Space | `https://kernelkain-footwork.hf.space` |
| Space record | Public Gradio Space `kernelKain/footwork`. Requested hardware `zero-a10g`. Runtime stage `NO_APP_FILE`. |
| Space request | `GET` returned 503. |
| Generation | Not run. Weights were not downloaded. |
| Latency | Not measured. |
| Quota | Not measured. |
| Arrangement hash | None. |
| Fallback | Route Sketch for the current trace, plus a separately labeled cached Studio example when one exists. |

AC-04 stays blocked until the Space has an app file and a named Gemma call returns a validated arrangement.
