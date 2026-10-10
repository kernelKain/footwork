import type { MovementEvent } from "../contracts/types";
import { formatTime } from "./formatTime";
import { cardCopy, eventIsCurrent, visibleEvents } from "./journeyModel";

export function MomentCards({
  events,
  timeMs,
  onSeek,
}: {
  events: MovementEvent[];
  timeMs: number;
  onSeek: (timeMs: number) => void;
}) {
  const cards = visibleEvents(events);
  return (
    <section className="stack" aria-labelledby="graph-title">
      <h2 id="graph-title">Moments in the music</h2>
      <p>Choose a moment to hear where it sits in the piece.</p>
      <ol className="mapping-list">
        {cards.map((event) => {
          const active = eventIsCurrent(timeMs, event);
          const copy = cardCopy(event);
          return (
            <li key={event.id}>
              <button
                type="button"
                className={active ? "moment-card is-active" : "moment-card"}
                onClick={() => onSeek(event.audio_offset_ms)}
              >
                <EventGlyph type={event.type} />
                <span className="moment-copy">
                  <span>{copy.causal}</span>
                  {active ? <span> Now</span> : null}
                  <span>{copy.planned}</span>
                </span>
                <MusicGlyph type={event.type} />
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

function EventGlyph({ type }: { type: MovementEvent["type"] }) {
  return (
    <svg className="moment-glyph" viewBox="0 0 32 32" aria-hidden="true">
      {type === "turn" ? <path className="route-path" d="M6 26 L6 10 L24 10" /> : null}
      {type === "pause" ? (
        <rect className="route-pause" x="10" y="8" width="12" height="16" />
      ) : null}
      {type === "pace_change" ? (
        <polygon className="route-pace" points="16,4 28,16 16,28 4,16" />
      ) : null}
      {type === "loop" ? <circle className="route-loop" cx="16" cy="16" r="8" /> : null}
    </svg>
  );
}

function MusicGlyph({ type }: { type: MovementEvent["type"] }) {
  const bars =
    type === "pause" ? [8, 4, 4, 8] : type === "pace_change" ? [6, 12, 18, 14] : [8, 14, 10, 16];
  return (
    <svg className="moment-glyph" viewBox="0 0 32 32" aria-hidden="true">
      {bars.map((height, index) => (
        <rect
          key={`${type}-bar-${index}`}
          className="moment-wave"
          x={4 + index * 7}
          y={28 - height}
          width="5"
          height={height}
          rx="1"
        />
      ))}
    </svg>
  );
}
