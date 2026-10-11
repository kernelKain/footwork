import type { Chapter, MovementEvent, MovementSummary } from "../contracts/types";
import { eventIsCurrent, ribbonBands, ribbonLines, ribbonTicks } from "./journeyModel";

const MARKS: Record<MovementEvent["type"], string> = {
  turn: "Turn",
  pause: "Detected pause",
  pace_change: "Pace change",
  loop: "Loop",
};

export function MovementRibbon({
  summary,
  chapters,
  events,
  durationMs,
  timeMs,
}: {
  summary: MovementSummary;
  chapters: Chapter[];
  events: MovementEvent[];
  durationMs: number;
  timeMs: number;
}) {
  const bands = ribbonBands(summary, durationMs);
  const ticks = ribbonTicks(durationMs);
  const lines = ribbonLines(summary, durationMs, events);
  const playhead = durationMs <= 0 ? 0 : Math.min(100, Math.max(0, (timeMs / durationMs) * 100));
  return (
    <section className="stack" aria-labelledby="ribbon-title">
      <h2 id="ribbon-title">Movement ribbon</h2>
      <p>
        A compact view of the whole piece. Taller cyan means a faster stretch. Blue is a manual
        break. Hatching is an uncertain gap. Amber marks are moments.
      </p>
      <div className="ribbon" aria-hidden="true">
        {bands.map((band) => (
          <span
            key={band.id}
            className={`ribbon-band ribbon-${band.kind}`}
            data-kind={band.kind}
            style={{
              left: `${band.start}%`,
              width: `${Math.max(band.width, 0)}%`,
              height: band.intensity === null ? "42%" : `${28 + band.intensity * 72}%`,
            }}
          />
        ))}
        {chapters.map((chapter) => (
          <span
            key={chapter.id}
            className="ribbon-chapter"
            style={{ left: `${(chapter.start_ms / durationMs) * 100}%` }}
          />
        ))}
        {events.map((event) => (
          <span
            key={event.id}
            className={eventIsCurrent(timeMs, event) ? "ribbon-event is-current" : "ribbon-event"}
            style={{ left: `${(event.audio_offset_ms / durationMs) * 100}%` }}
            title={MARKS[event.type]}
          />
        ))}
        <span
          className="graph-playhead"
          style={{ left: `${playhead}%` }}
          data-time-ms={Math.round(timeMs)}
        />
      </div>
      <ol className="ribbon-scale" aria-label="Song time">
        {ticks.map((tick) => (
          <li key={tick.id}>{tick.label}</li>
        ))}
      </ol>
      <ul className="ribbon-readout" aria-label="What the ribbon shows">
        {lines.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
    </section>
  );
}
