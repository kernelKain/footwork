# Gemma integration evidence

Footwork uses the pinned `google/gemma-4-E2B-it` checkpoint through the public
Hugging Face Space at <https://kernelkain-footwork.hf.space>.

## Verified behavior

- `/arrange` accepts an anonymous movement-event timeline.
- The model returns a constrained JSON arrangement.
- Every referenced event must exist in the submitted timeline.
- The style must remain inside the allowed instrumental vocabulary.
- Invalid or blocked output is returned as a failure, not replaced with an
  invented model result.
- The application uses Route Sketch when it cannot obtain a valid arrangement.

## Example

Input:

```json
{
  "schema_version": "1",
  "duration_ms": 60000,
  "events": [
    { "id": "turn-1", "type": "turn", "audio_offset_ms": 12000 },
    { "id": "pause-1", "type": "pause", "audio_offset_ms": 30000 }
  ]
}
```

Validated output:

```json
{
  "schema_version": "1",
  "status": "valid",
  "code": "validated",
  "model_id": "google/gemma-4-E2B-it",
  "arrangement": {
    "mood": "warm_cinematic",
    "style": ["instrumental", "warm", "cinematic", "rising"],
    "event_refs": ["turn-1"]
  },
  "fallback": null
}
```

The response references a real input event and remains inside the accepted
schema. Provider credentials and account details are intentionally not recorded
in this repository.
