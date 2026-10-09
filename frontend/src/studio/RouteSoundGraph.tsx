import type { EventType, SoundprintResult } from "../contracts/types";
import { formatTime } from "./formatTime";

const EVENT_LABELS: Record<EventType, string> = {
  turn: "Turn",
  pause: "Pause",
  pace_change: "Pace change",
  loop: "Loop",
};

function isCurrentChapter(
  timeMs: number,
  startMs: number,
  endMs: number,
  durationMs: number,
): boolean {
  if (timeMs < startMs) {
    return false;
  }
  if (timeMs < endMs) {
    return true;
  }
  return timeMs === durationMs && endMs === durationMs;
}

export function RouteSoundGraph({
  result,
  timeMs,
  onSeek,
}: {
  result: SoundprintResult;
  timeMs: number;
  onSeek: (timeMs: number) => void;
}) {
  const playhead = Math.min(100, Math.max(0, (timeMs / result.duration_ms) * 100));
  return (
    <section className="stack" aria-labelledby="graph-title">
      <h2 id="graph-title">Route–Sound Graph</h2>
      <p>
        Intended musical mappings. The word planned means the relationship has not been measured in
        audio.
      </p>
      <div className="graph-track" aria-hidden="true">
        <span
          className="graph-playhead"
          style={{ left: `${playhead}%` }}
          data-time-ms={Math.round(timeMs)}
        />
      </div>
      <div className="chapter-row">
        {result.chapters.map((chapter) => {
          const current = isCurrentChapter(
            timeMs,
            chapter.start_ms,
            chapter.end_ms,
            result.duration_ms,
          );
          return (
            <span key={chapter.id} className={current ? "is-active" : undefined}>
              {chapter.title}
              {current ? <span> Now</span> : null}
              <span className="mono"> {formatTime(chapter.start_ms)}</span>
            </span>
          );
        })}
      </div>
      <ol className="mapping-list">
        {result.events.map((event) => {
          const check = result.mapping_verification.find((item) => item.event_id === event.id);
          const active = Math.abs(timeMs - event.audio_offset_ms) <= 500;
          return (
            <li key={event.id}>
              <button
                type="button"
                className={active ? "is-active" : undefined}
                onClick={() => onSeek(event.audio_offset_ms)}
              >
                <span>{EVENT_LABELS[event.type]}</span>
                {active ? <span>Now</span> : null}
                <span>{check?.status ?? "planned"}</span>
                <span>{check?.note}</span>
                <time dateTime={`PT${Math.floor(event.audio_offset_ms / 1000)}S`}>
                  {formatTime(event.audio_offset_ms)}
                </time>
              </button>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
