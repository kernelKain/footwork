import type { DemoFixture, EventType } from "../contracts/types";
import { formatTime } from "./formatTime";
import { RouteFigure } from "./RouteFigure";

const EVENT_LABELS: Record<EventType, string> = {
  turn: "Turn",
  pause: "Pause",
  pace_change: "Pace change",
  loop: "Loop",
};

export function StudioScreen({ fixture }: { fixture: DemoFixture }) {
  const { result } = fixture;
  return (
    <div className="stack">
      <section className="stack" aria-labelledby="studio-title">
        <h1 id="studio-title">Soundprint</h1>
        <p className="fixture-banner panel" role="status">
          <strong>Synthetic fixture.</strong> {fixture.purpose}
        </p>
      </section>
      <RouteFigure points={result.route.points} events={result.events} />
      <section className="stack" aria-labelledby="events-title">
        <h2 id="events-title">Movement events</h2>
        <p className="mono">
          Duration {formatTime(result.duration_ms)}. Audio is not included in this fixture.
        </p>
        <ol className="event-list">
          {result.events.map((event) => (
            <li key={event.id}>
              <span>{EVENT_LABELS[event.type]}</span>
              <time dateTime={`PT${Math.floor(event.audio_offset_ms / 1000)}S`}>
                {formatTime(event.audio_offset_ms)}
              </time>
            </li>
          ))}
        </ol>
      </section>
      <section className="panel" aria-labelledby="provenance-title">
        <h2 id="provenance-title">Provenance</h2>
        <p>Mapping status: planned. These relationships are intended, not measured.</p>
        <p className="muted">{result.quality.summary}</p>
        <p className="muted">{result.provenance.rights_note}</p>
      </section>
    </div>
  );
}
