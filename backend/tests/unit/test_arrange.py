from datetime import UTC, datetime, timedelta

from app.arrange.gemma import (
    MODEL_ID,
    generate_arrangement,
    parse_arrangement,
)

START = datetime(2026, 10, 10, 12, 0, tzinfo=UTC)
EVENTS = (
    {"id": "turn-corner", "type": "turn", "audio_offset_ms": 12_000},
    {"id": "pause-hold", "type": "pause", "audio_offset_ms": 30_000},
)


class Clock:
    def __init__(self) -> None:
        self.instant = START

    def __call__(self) -> datetime:
        return self.instant


class FakeClient:
    def __init__(self, responses: list[object]) -> None:
        self.responses = list(responses)
        self.calls: list[dict[str, object]] = []
        self.fail_at: int | None = None

    def arrange(self, timeline: dict[str, object]) -> object:
        self.calls.append(timeline)
        if self.fail_at == len(self.calls):
            raise TimeoutError("queue expired")
        return self.responses.pop(0)


def test_a_valid_plan_is_accepted_without_a_repair() -> None:
    client = FakeClient([_plan()])
    outcome = _generate(client)

    assert outcome.status == "valid"
    assert outcome.arrangement == _plan()
    assert outcome.fallback is None
    assert outcome.code is None
    assert outcome.model_id == MODEL_ID
    assert outcome.attempts == 1
    assert outcome.extra_attempts == 0
    assert len(client.calls) == 1
    assert "latitude" not in str(client.calls[0])
    assert "summary" not in str(client.calls[0])


def test_invalid_output_is_repaired_once() -> None:
    client = FakeClient([{"mood": "warm_cinematic"}, _plan()])
    reserved: list[int] = []
    outcome = _generate(client, reserve_repair=lambda: reserved.append(1) or True)

    assert outcome.status == "valid"
    assert outcome.attempts == 2
    assert outcome.extra_attempts == 1
    assert reserved == [1]
    assert client.calls[1]["events"] == client.calls[0]["events"]
    assert client.calls[1]["repair"] == {"errors": ["shape", "style", "event_refs"]}


def test_a_second_invalid_plan_falls_back_without_claiming_success() -> None:
    client = FakeClient([{"style": ["vocals"]}, {"style": ["https://example.invalid"]}])
    outcome = _generate(client)

    assert outcome.status == "degraded"
    assert outcome.arrangement is None
    assert outcome.fallback == "route_sketch"
    assert outcome.code == "arrangement_unavailable"
    assert outcome.attempts == 2
    assert "https://example.invalid" not in str(client.calls[1])
    assert "studio_live" not in str(outcome)


def test_a_transport_failure_is_not_retried() -> None:
    client = FakeClient([])
    client.fail_at = 1
    outcome = _generate(client)

    assert outcome.status == "degraded"
    assert outcome.reason == "provider_failed"
    assert outcome.attempts == 1
    assert outcome.extra_attempts == 0
    assert len(client.calls) == 1


def test_repair_is_skipped_when_budget_deadline_or_reservation_refuses_it() -> None:
    exhausted = FakeClient([{"mood": "nope"}])
    outcome = _generate(exhausted, attempts_used=4, gpu_seconds_used=240)
    assert outcome.reason == "plan_invalid"
    assert len(exhausted.calls) == 1

    clock = Clock()

    class Slow(FakeClient):
        def arrange(self, timeline: dict[str, object]) -> object:
            clock.instant += timedelta(seconds=80)
            return super().arrange(timeline)

    late = Slow([{"mood": "nope"}])
    outcome = generate_arrangement(
        EVENTS,
        late,
        attempts_used=1,
        gpu_seconds_used=60,
        now=clock,
        deadline=START + timedelta(seconds=100),
    )
    assert len(late.calls) == 1
    assert outcome.extra_attempts == 0

    blocked = FakeClient([{"mood": "nope"}])
    outcome = _generate(blocked, reserve_repair=lambda: False)
    assert len(blocked.calls) == 1
    assert outcome.arrangement is None


def test_location_fields_never_reach_the_provider() -> None:
    client = FakeClient([_plan()])
    events = ({**EVENTS[0], "latitude": 12.9716}, EVENTS[1])
    outcome = _generate(client, events=events)

    assert outcome.reason == "timeline_rejected"
    assert outcome.attempts == 0
    assert client.calls == []


def test_a_fenced_plan_is_validated_locally() -> None:
    fenced = 'Sure\n```json\n{"mood":"warm_cinematic","style":["instrumental"],"event_refs":["turn-corner"]}\n```'
    plan, errors = parse_arrangement(fenced, {"turn-corner", "pause-hold"})

    assert errors == []
    assert plan == {
        "mood": "warm_cinematic",
        "style": ["instrumental"],
        "event_refs": ["turn-corner"],
    }


def test_pace_ids_are_renamed_into_the_shared_pattern() -> None:
    client = FakeClient(
        [
            {
                "mood": "warm_cinematic",
                "style": ["instrumental"],
                "event_refs": ["pace-1"],
            }
        ]
    )
    outcome = generate_arrangement(
        ({"id": "pace_change", "type": "pace_change", "audio_offset_ms": 4_000},),
        client,
        attempts_used=1,
        gpu_seconds_used=60,
        now=lambda: START,
        deadline=START + timedelta(seconds=90),
    )

    assert client.calls[0]["events"] == [
        {"id": "pace-1", "type": "pace_change", "audio_offset_ms": 4_000}
    ]
    assert outcome.status == "valid"


def _generate(client: FakeClient, **overrides: object):
    events = overrides.pop("events", EVENTS)
    return generate_arrangement(
        events,  # type: ignore[arg-type]
        client,
        attempts_used=int(overrides.pop("attempts_used", 1)),  # type: ignore[arg-type]
        gpu_seconds_used=int(overrides.pop("gpu_seconds_used", 60)),  # type: ignore[arg-type]
        now=lambda: START,
        deadline=START + timedelta(minutes=3),
        reserve_repair=overrides.pop("reserve_repair", None),  # type: ignore[arg-type]
    )


def _plan() -> dict[str, object]:
    return {
        "mood": "warm_cinematic",
        "style": ["instrumental", "sparse"],
        "event_refs": ["turn-corner", "pause-hold"],
    }
