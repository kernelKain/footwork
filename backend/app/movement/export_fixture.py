"""Turn one private walk file into a coordinate-free fixture.

The input file keeps latitude and longitude and stays outside Git. The written
fixture keeps relative route points, event times, and the movement summary.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from app.jobs.flow import _public_events, _result, _sketch_plan
from app.jobs.privacy import contains_location
from app.movement.clean import RawGap, RawSample, clean_trace
from app.movement.detect import detect_events
from app.movement.sketch import compose_sketch

ROOT = Path(__file__).resolve().parents[3]
FIXTURE_PATH = ROOT / "fixtures" / "sanitized-real" / "seed-walk.json"
REVIEW_PATH = ROOT / "Docs" / "evidence" / "seed-walk-review.md"
_LISTEN = {
    "turn": "The melody changes direction.",
    "pause": "The sound goes quiet.",
    "pace_change": "The sound gets brighter or louder.",
    "loop": "The opening line comes back.",
}


class ExportError(RuntimeError):
    """The private walk cannot become an approved fixture."""


def private_samples(payload: dict[str, object]) -> tuple[list[RawSample], list[RawGap]]:
    """Read either the phone download or the generation request body."""
    listed = payload.get("samples")
    if not isinstance(listed, list) or not listed:
        raise ExportError("The file has no samples.")
    samples: list[RawSample] = []
    for item in listed:
        if not isinstance(item, dict):
            raise ExportError("A sample is not an object.")
        latitude = _number(item, "latitude")
        longitude = _number(item, "longitude")
        accuracy = _number(item, "accuracy_m", "accuracyM")
        timestamp = _number(item, "timestamp_ms", "timestampMs")
        samples.append(RawSample(latitude, longitude, accuracy, timestamp))
    gaps: list[RawGap] = []
    interruptions = payload.get("interruptions")
    if isinstance(interruptions, list):
        for item in interruptions:
            if not isinstance(item, dict) or item.get("open") is True:
                continue
            gaps.append(
                RawGap(_number(item, "start_ms", "startMs"), _number(item, "end_ms", "endMs"))
            )
    return samples, gaps


def sanitized_fixture(payload: dict[str, object]) -> dict[str, object]:
    """Build the approved fixture. Raise when the walk is not useful."""
    samples, gaps = private_samples(payload)
    trace = clean_trace(samples, gaps)
    if not trace.usable:
        raise ExportError(trace.summary)
    detected = detect_events(trace)
    if not detected:
        raise ExportError("This walk did not produce a turn, pause, pace change, or loop.")
    sketch = compose_sketch(trace, detected)
    events = _public_events(sketch.events)
    if not events:
        raise ExportError("The detected moments could not be published.")
    result = _result(
        "seed-walk",
        "route_sketch",
        None,
        sketch,
        events,
        _sketch_plan(events),
        trace,
        ["This fixture is the sanitized walk. It is not the studio recording."],
        "audio/wav",
    )
    provenance = result["provenance"]
    if isinstance(provenance, dict):
        provenance["source_category"] = "sanitized_real"
        provenance["rights_note"] = (
            "Sanitized derivative of one outdoor walk. Coordinates and wall-clock time were removed."
        )
    fixture = {
        "schema_version": "1",
        "label": "sanitized_real",
        "purpose": (
            "Approved sanitized derivative of one outdoor walk. "
            "This file has no coordinates and it is not a studio recording."
        ),
        "manifest": {
            "schema_version": "1",
            "source_category": "sanitized_real",
            "generation_mode": "route_sketch",
            "model_identity": None,
            "asset_hashes": {},
            "rights_note": (
                "Sanitized derivative of one outdoor walk. Coordinates and wall-clock time were removed."
            ),
            "verification": {
                "mapping_status": "automated_sketch_verified",
                "human_reviewed": False,
            },
        },
        "result": result,
    }
    if contains_location(fixture) or _echoes_coordinates(fixture, samples):
        raise ExportError("The sanitized fixture still carried a location. Nothing was written.")
    return fixture


def review_text(fixture: dict[str, object]) -> str:
    """Write the listening sheet. Heard stays blank until a person fills it."""
    result = fixture["result"]
    if not isinstance(result, dict):
        raise ExportError("The fixture has no result.")
    events = result.get("events")
    if not isinstance(events, list):
        events = []
    rows = [
        "| Moment | Song time | Listen for | Heard | Time you heard it |",
        "|---|---|---|---|---|",
    ]
    kinds: set[str] = set()
    for event in events:
        if not isinstance(event, dict):
            continue
        kind = str(event.get("type", ""))
        kinds.add(kind)
        offset = event.get("audio_offset_ms")
        stamp = _clock(offset) if isinstance(offset, int) else ""
        rows.append(
            f"| {event.get('id', kind)} | {stamp} | {_LISTEN.get(kind, 'A change in the piece.')} |  |  |"
        )
    missing = [name for name in ("turn", "pause") if name not in kinds]
    third = "pace_change" in kinds or "loop" in kinds
    gate = (
        "A turn, a pause, and a third moment are in this walk."
        if not missing and third
        else "This walk is missing a turn, a pause, or a third moment, so AC-03 cannot pass on it."
    )
    return "\n".join(
        [
            "# Seed walk review",
            "",
            "The sanitized fixture is `fixtures/sanitized-real/seed-walk.json`.",
            "It has no coordinates. It is not the studio recording.",
            "",
            gate,
            "AC-03 stays open until you hear a studio file of this walk and fill the last two columns",
            "for a turn, a pause, and one more moment. A waveform check does not replace that hearing.",
            "The October 10 file `artifacts/eleven-arrangement.mp3` was not made from this walk.",
            "",
            *rows,
            "",
        ]
    )


def publish(fixture: dict[str, object]) -> None:
    """Write the fixture and the listening sheet."""
    FIXTURE_PATH.parent.mkdir(parents=True, exist_ok=True)
    FIXTURE_PATH.write_text(json.dumps(fixture, indent=2) + "\n", encoding="utf-8")
    REVIEW_PATH.write_text(review_text(fixture), encoding="utf-8")


def main(argv: list[str] | None = None) -> int:
    """Print the detected moments, and write the fixture only when asked."""
    parser = argparse.ArgumentParser(description="Sanitize one private walk file.")
    parser.add_argument("walk", type=Path, help="Private walk JSON. Do not commit this file.")
    parser.add_argument(
        "--approve",
        action="store_true",
        help="Write the sanitized fixture after you accept the printed moments.",
    )
    args = parser.parse_args(argv)
    if not args.walk.is_file():
        print(f"No private walk file at {args.walk}.", file=sys.stderr)
        return 2
    try:
        payload = json.loads(args.walk.read_text(encoding="utf-8"))
        if not isinstance(payload, dict):
            raise ExportError("The walk file must be a JSON object.")
        fixture = sanitized_fixture(payload)
    except (OSError, json.JSONDecodeError, ExportError, TypeError, ValueError) as exc:
        print(str(exc), file=sys.stderr)
        return 2
    result = fixture["result"]
    events = result["events"] if isinstance(result, dict) else []
    print("Detected moments:")
    if isinstance(events, list):
        for event in events:
            if isinstance(event, dict):
                print(
                    f"  {event.get('type')} at {_clock(event.get('audio_offset_ms'))} ({event.get('id')})"
                )
    if not args.approve:
        print("Nothing was written. Re-run with --approve after these moments match the walk.")
        return 0
    publish(fixture)
    print(f"Wrote {FIXTURE_PATH.relative_to(ROOT)}")
    print(f"Wrote {REVIEW_PATH.relative_to(ROOT)}")
    return 0


def _number(item: dict[str, object], *names: str) -> float:
    for name in names:
        value = item.get(name)
        if isinstance(value, bool) or not isinstance(value, (int, float)):
            continue
        return float(value)
    raise ExportError(f"A sample is missing {names[0]}.")


def _echoes_coordinates(fixture: dict[str, object], samples: list[RawSample]) -> bool:
    text = json.dumps(fixture)
    for sample in samples:
        for value in (sample.latitude, sample.longitude):
            if f"{value:.5f}" in text or f"{value:.4f}" in text:
                return True
    return False


def _clock(value: object) -> str:
    if isinstance(value, bool) or not isinstance(value, int):
        return ""
    seconds = value // 1000
    return f"{seconds // 60}:{seconds % 60:02d}"


if __name__ == "__main__":
    raise SystemExit(main())
