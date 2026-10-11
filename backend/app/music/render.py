"""Compile a 60-second instrumental plan and render it once.

Composition-plan mode is sent without ``force_instrumental`` and without a
text prompt. A timeout or lost response is not sent again. Each turn flips the
melodic direction, each pace change keeps a brighter pulse, each pause is a
hold, and each loop brings the opening line back.
"""

import array
import hashlib
import json
import subprocess
import tempfile
from collections.abc import Callable, Mapping, Sequence
from dataclasses import dataclass
from pathlib import Path

import httpx

MODEL_ID = "music_v2_5"
TARGET_MS = 60_000
MIN_CHUNK_MS = 3_000
MAX_CHUNKS = 10
MIN_CHUNKS = 3
PAUSE_MS = 10_000
MIN_DURATION_MS = 44_500
MAX_DURATION_MS = 60_500
COMPOSE_URL = "https://api.elevenlabs.io/v1/music"
TIMEOUT_SECONDS = 90.0

_PRIORITY = {"turn": 0, "pause": 1, "pace_change": 2, "loop": 3}
_LABEL = {
    "opening": "[Opening]",
    "turn": "[Turn]",
    "pause": "[Hold]",
    "pace_change": "[Pace]",
    "loop": "[Return]",
    "continue": "[Continue]",
}
_HOLD = ("held", "quieter", "sparse")
_ENERGY = ("pulse", "brighter")
_BASE_STYLES = (
    "instrumental",
    "warm cinematic",
    "acoustic ensemble",
    "clear production",
    "moderate tempo",
    "no lead vocal",
)
_NEGATIVE = ("vocals", "lyrics", "singing", "speech", "spoken word")


@dataclass(frozen=True)
class HttpResult:
    kind: str
    status: int | None
    content: bytes
    headers: Mapping[str, str]


@dataclass(frozen=True)
class MusicReceipt:
    status: str
    code: str | None
    model_id: str
    request_sha256: str
    song_id: str | None
    byte_length: int
    duration_ms: int | None
    attempts: int
    audio: bytes | None

    def __repr__(self) -> str:
        """Return a concise repr with status, attempts, and code."""
        return f"MusicReceipt(status={self.status!r}, attempts={self.attempts}, code={self.code!r})"


def compile_chunks(
    events: Sequence[Mapping[str, object]],
    styles: Sequence[str],
) -> list[dict[str, object]]:
    """Build the composition-plan chunks for the events and requested styles."""
    edges, kinds = _edges(events)
    chunks: list[dict[str, object]] = []
    direction = "falling"
    energy = False
    motif = False
    turns = 0
    for index, start in enumerate(edges[:-1]):
        kind = kinds.get(start, "continue")
        if kind == "turn":
            direction = "rising" if direction == "falling" else "falling"
            motif = False
            turns += 1
        elif kind == "pace_change":
            energy = True
        elif kind == "loop":
            motif = True
        movement, text = _movement(kind, direction, energy, motif, turns)
        chunks.append(
            {
                "text": text,
                "duration_ms": edges[index + 1] - start,
                "positive_styles": _styles(styles, movement, leading=index == 0),
                "negative_styles": list(_NEGATIVE),
                "context_adherence": "high",
            }
        )
    return chunks


def request_body(chunks: Sequence[Mapping[str, object]]) -> dict[str, object]:
    """Wrap the chunks into the Eleven Music composition-plan request body."""
    return {"model_id": MODEL_ID, "composition_plan": {"chunks": list(chunks)}}


def render_arrangement(
    events: Sequence[Mapping[str, object]],
    styles: Sequence[str],
    post: Callable[[dict[str, object]], HttpResult],
    inspect: Callable[[bytes], tuple[bool, int | None]],
) -> MusicReceipt:
    """Compose, post, and validate a single music render attempt, never retried."""
    body = request_body(compile_chunks(events, styles))
    digest = hashlib.sha256(
        json.dumps(body, sort_keys=True, separators=(",", ":")).encode()
    ).hexdigest()
    result = post(body)
    if result.kind in {"timeout", "transport"}:
        return _failed(digest, "music_unavailable", 0, None)
    status = result.status or 0
    if status != 200:
        return _failed(digest, "music_unavailable", 0, _song_id(result.headers))
    ok, duration_ms = inspect(result.content)
    song_id = _song_id(result.headers)
    if not ok or duration_ms is None or not MIN_DURATION_MS <= duration_ms <= MAX_DURATION_MS:
        return MusicReceipt(
            "degraded",
            "music_unavailable",
            MODEL_ID,
            digest,
            song_id,
            len(result.content),
            duration_ms,
            1,
            None,
        )
    return MusicReceipt(
        "rendered",
        None,
        MODEL_ID,
        digest,
        song_id,
        len(result.content),
        duration_ms,
        1,
        result.content,
    )


def post_eleven(body: dict[str, object], api_key: str) -> HttpResult:
    """Post the composition request to Eleven Music and classify the outcome."""
    try:
        response = httpx.post(
            COMPOSE_URL,
            params={"output_format": "mp3_44100_128"},
            headers={"xi-api-key": api_key, "Accept": "audio/mpeg"},
            json=body,
            timeout=TIMEOUT_SECONDS,
        )
    except httpx.TimeoutException:
        return HttpResult("timeout", None, b"", {})
    except httpx.TransportError:
        return HttpResult("transport", None, b"", {})
    return HttpResult("http", response.status_code, response.content, dict(response.headers))


def inspect_mpeg(data: bytes) -> tuple[bool, int | None]:
    """Check that the MPEG audio has a valid duration and is audible."""
    if len(data) < 128:
        return False, None
    with tempfile.TemporaryDirectory() as directory:
        path = Path(directory) / "piece.mp3"
        path.write_bytes(data)
        duration_ms = _duration_ms(path)
        audible = _audible(path)
    if duration_ms is None or not audible:
        return False, duration_ms
    return True, duration_ms


def _failed(digest: str, code: str, size: int, song_id: str | None) -> MusicReceipt:
    """Build a degraded MusicReceipt for a failed render attempt."""
    return MusicReceipt("degraded", code, MODEL_ID, digest, song_id, size, None, 1, None)


def _movement(
    kind: str, direction: str, energy: bool, motif: bool, turns: int
) -> tuple[list[str], str]:
    """Return the styles and section label for one chunk, carrying earlier changes forward."""
    if kind == "pause":
        return (list(_HOLD), "[Hold]")
    if motif and kind != "turn":
        movement = ["falling", "opening motif"]
        if energy:
            movement.extend(_ENERGY)
        text = "[Motif returns]" if kind == "loop" else "[Motif continues]"
        return (movement, text)
    movement = [direction]
    if energy:
        movement.extend(_ENERGY)
    return (movement, _section_text(kind, direction, turns))


def _section_text(kind: str, direction: str, turns: int) -> str:
    """Name a section. The first turn keeps the original label."""
    if kind == "opening":
        return "[Opening]"
    if kind == "turn" and turns == 1:
        return "[Turn]"
    if kind == "turn":
        return "[Turn rising]" if direction == "rising" else "[Turn falling]"
    if kind == "pace_change":
        return "[Pace brighter]"
    return _LABEL.get(kind, "[Continue]")


def _edges(events: Sequence[Mapping[str, object]]) -> tuple[list[int], dict[int, str]]:
    """Compute chunk boundary times and their event kinds from the timeline's events."""
    edges = [0, TARGET_MS]
    kinds = {0: "opening"}
    ordered = sorted(
        (_event(event) for event in events),
        key=lambda item: (item[0], _PRIORITY.get(item[1], 9)),
    )
    for time_ms, kind in ordered:
        if len(edges) - 1 >= MAX_CHUNKS or kind not in _PRIORITY or not _can_split(edges, time_ms):
            continue
        edges.append(time_ms)
        edges.sort()
        kinds[time_ms] = kind
        if kind == "pause" and len(edges) - 1 < MAX_CHUNKS:
            hold_end = time_ms + PAUSE_MS
            if _can_split(edges, hold_end):
                edges.append(hold_end)
                edges.sort()
                kinds[hold_end] = "continue"
    while len(edges) - 1 < MIN_CHUNKS and len(edges) - 1 < MAX_CHUNKS:
        index = max(range(len(edges) - 1), key=lambda item: edges[item + 1] - edges[item])
        if edges[index + 1] - edges[index] < MIN_CHUNK_MS * 2:
            break
        middle = edges[index] + (edges[index + 1] - edges[index]) // 2
        middle = min(max(middle, edges[index] + MIN_CHUNK_MS), edges[index + 1] - MIN_CHUNK_MS)
        if middle in edges:
            break
        edges.insert(index + 1, middle)
        kinds.setdefault(middle, "continue")
    return edges, kinds


def _event(event: Mapping[str, object]) -> tuple[int, str]:
    """Extract the (time_ms, type) pair from an event, defaulting on invalid shape."""
    time_ms = event.get("audio_offset_ms", 0)
    kind = event.get("type", "")
    if isinstance(time_ms, bool) or not isinstance(time_ms, int):
        return 0, ""
    return time_ms, str(kind)


def _can_split(edges: Sequence[int], time_ms: int) -> bool:
    """Return True when inserting a boundary at time_ms keeps chunks at least MIN_CHUNK_MS."""
    if time_ms in edges or time_ms <= 0 or time_ms >= TARGET_MS:
        return False
    previous = max(edge for edge in edges if edge < time_ms)
    following = min(edge for edge in edges if edge > time_ms)
    return time_ms - previous >= MIN_CHUNK_MS and following - time_ms >= MIN_CHUNK_MS


def _styles(styles: Sequence[str], movement: Sequence[str], *, leading: bool) -> list[str]:
    """Assemble the deduplicated, cleaned positive style list for a chunk."""
    chosen: list[str] = []
    source = [style for style in styles if isinstance(style, str)]
    source.extend(_BASE_STYLES if leading else ("instrumental",))
    source.extend(movement)
    for style in source:
        cleaned = " ".join(style.split())
        if cleaned and cleaned not in chosen and "http" not in cleaned and "://" not in cleaned:
            chosen.append(cleaned)
    return chosen[:12]


def _song_id(headers: Mapping[str, str]) -> str | None:
    """Extract the song id from the response headers, if present."""
    folded = {key.lower(): value for key, value in headers.items()}
    for name in ("song-id", "song_id", "x-song-id"):
        value = folded.get(name)
        if value:
            return value
    return None


def _duration_ms(path: Path) -> int | None:
    """Return the audio file's duration in milliseconds via ffprobe, or None if unknown."""
    completed = subprocess.run(
        [
            "ffprobe",
            "-v",
            "error",
            "-show_entries",
            "format=duration",
            "-of",
            "csv=p=0",
            str(path),
        ],
        check=False,
        capture_output=True,
        text=True,
        timeout=15,
    )
    if completed.returncode != 0:
        return None
    try:
        return round(float(completed.stdout.strip()) * 1000)
    except ValueError:
        return None


def _audible(path: Path) -> bool:
    """Return True when the decoded audio has samples above a minimal loudness threshold."""
    completed = subprocess.run(
        ["ffmpeg", "-v", "error", "-i", str(path), "-f", "s16le", "-ac", "1", "-ar", "16000", "-"],
        check=False,
        capture_output=True,
        timeout=20,
    )
    if completed.returncode != 0 or len(completed.stdout) < 4:
        return False
    samples = array.array("h")
    samples.frombytes(completed.stdout[: len(completed.stdout) // 2 * 2])
    return max(abs(sample) for sample in samples) > 200
