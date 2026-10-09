import type { Chapter, MovementEvent, MovementSummary } from "../contracts/types";
import { eventIsCurrent, ribbonBands } from "./journeyModel";

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
  const playhead = durationMs <= 0 ? 0 : Math.min(100, Math.max(0, (timeMs / durationMs) * 100));
  return (
    <section className="stack" aria-labelledby="ribbon-title">
      <h2 id="ribbon-title">Movement ribbon</h2>
      <p>
        Cyan bands are accepted movement. Blue gaps are manual breaks. Hatched gaps are uncertain
        intervals. Amber marks show where a moment meets the music.
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
    </section>
  );
}
