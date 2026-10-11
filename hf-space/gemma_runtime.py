"""Call the pinned Gemma checkpoint. Importing this module does not download weights."""

from __future__ import annotations

import json
import re

MODEL_ID = "google/gemma-4-E2B-it"
MODEL_REVISION = "3e22461f65e89153144f8adb70e3b8c2cc9845a7"
_MAX_NEW_TOKENS = 256
_SYSTEM = (
    "You write one instrumental arrangement plan. "
    "Reply with one JSON object and no other text. "
    "The only keys are mood, style, and event_refs. "
    "mood must be warm_cinematic. "
    "style is 1 to 6 unique words chosen from: instrumental, sparse, warm, cinematic, "
    "rising, falling, held, brighter, quieter, pulse. "
    "style must be a JSON array and must include instrumental, "
    "for example [\"instrumental\", \"cinematic\"]. Never return style as one word. "
    "event_refs lists event ids from the timeline, each id at most once. "
    "Do not include coordinates, timestamps, or an explanation."
)

_PROCESSOR = None
_MODEL = None
_LOAD_ERROR: str | None = None
_SECRET = re.compile(r"\b(?:hf_|sk-)[A-Za-z0-9_\-]+")


def prompt_timeline(timeline: dict) -> dict:
    """Keep only the anonymous fields the model is allowed to see."""
    events = []
    raw_events = timeline.get("events")
    if isinstance(raw_events, list):
        for event in raw_events:
            if not isinstance(event, dict):
                continue
            events.append(
                {
                    "id": event.get("id"),
                    "type": event.get("type"),
                    "audio_offset_ms": event.get("audio_offset_ms"),
                }
            )
    body: dict = {"schema_version": timeline.get("schema_version"), "events": events}
    duration = timeline.get("duration_ms")
    if isinstance(duration, int):
        body["duration_ms"] = duration
    repair = timeline.get("repair")
    if isinstance(repair, dict) and isinstance(repair.get("errors"), list):
        codes = [str(item) for item in repair["errors"][:8]]
        body["repair"] = {"errors": codes}
    return body


def preload_gemma() -> str | None:
    """Load the checkpoint and place it on CUDA. ZeroGPU requires that placement at startup."""
    global _PROCESSOR, _MODEL, _LOAD_ERROR
    if _MODEL is not None:
        return None
    try:
        import torch
        from transformers import AutoModelForMultimodalLM, AutoProcessor

        _PROCESSOR = AutoProcessor.from_pretrained(MODEL_ID, revision=MODEL_REVISION)
        _MODEL = AutoModelForMultimodalLM.from_pretrained(
            MODEL_ID,
            revision=MODEL_REVISION,
            dtype=torch.bfloat16,
        )
        _MODEL.to("cuda")
        _MODEL.eval()
    except Exception as exc:
        _PROCESSOR = None
        _MODEL = None
        _LOAD_ERROR = _failure_text(exc)
        return _LOAD_ERROR
    _LOAD_ERROR = None
    return None


def _generate_plan(timeline: dict) -> str:
    """Return the decoded reply from the checkpoint loaded at startup."""
    if _LOAD_ERROR is not None:
        raise RuntimeError(_LOAD_ERROR)
    if _PROCESSOR is None or _MODEL is None:
        raise RuntimeError("Gemma weights were not loaded at startup")
    import torch

    processor, model = _PROCESSOR, _MODEL
    messages = [
        {"role": "system", "content": _SYSTEM},
        {
            "role": "user",
            "content": json.dumps(prompt_timeline(timeline), separators=(",", ":")),
        },
    ]
    inputs = processor.apply_chat_template(
        messages,
        tokenize=True,
        return_dict=True,
        return_tensors="pt",
        add_generation_prompt=True,
        enable_thinking=False,
    ).to(model.device)
    input_len = inputs["input_ids"].shape[-1]
    with torch.inference_mode():
        outputs = model.generate(**inputs, max_new_tokens=_MAX_NEW_TOKENS, do_sample=False)
    decoded = processor.decode(outputs[0][input_len:], skip_special_tokens=False)
    text = _final_text(decoded)
    parsed = _parsed_text(processor, decoded, inputs["input_ids"])
    if parsed:
        text = parsed
    if not text.strip():
        raise RuntimeError("empty model reply")
    return text


def _failure_text(exc: BaseException) -> str:
    """Return a short error that cannot carry a token."""
    text = _SECRET.sub("[redacted]", f"{type(exc).__name__}: {exc}")
    text = " ".join(text.split())
    return text[:180]


def _parsed_text(processor: object, decoded: str, prefix: object) -> str:
    """Return the processor's final answer when it exposes one."""
    try:
        parsed = processor.parse_response(decoded, prefix=prefix)
    except Exception:
        return ""
    if isinstance(parsed, str):
        return parsed.strip()
    if isinstance(parsed, dict):
        content = parsed.get("content") or parsed.get("text")
        if isinstance(content, str):
            return content.strip()
    return ""


def _final_text(decoded: str) -> str:
    """Drop a thought channel and keep the answer that follows it."""
    marker = "<channel|>"
    text = decoded.split(marker)[-1] if marker in decoded else decoded
    return text.replace("<|think|>", "").strip()


def complete_with_gemma(timeline: dict) -> str:
    """Generate one reply from the pinned checkpoint, with thinking disabled."""
    return _generate_plan(timeline)


try:
    import spaces
except ImportError:
    pass
else:
    complete_with_gemma = spaces.GPU(duration=60)(complete_with_gemma)
