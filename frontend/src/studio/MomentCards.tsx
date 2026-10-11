import type { MovementEvent, MovementSummary } from "../contracts/types";
import { formatTime } from "./formatTime";
import {
  cardCopy,
  eventIsCurrent,
  momentCount,
  momentPresence,
  visibleEvents,
} from "./journeyModel";

const PRESENCE = {
  none: "No accepted moments shaped this piece.",
  few: "Only a few accepted moments shaped this piece.",
  several: "Choose a moment to hear where it sits in the piece.",
};

/** Render movement-to-music cards that select moments and seek the shared player. */
export function MomentCards({
  events,
  summary,
  timeMs,
  selectedId = null,
  onSeek,
  onSelect,
}: {
  events: MovementEvent[];
  summary: MovementSummary;
  timeMs: number;
  selectedId?: string | null;
  onSeek: (timeMs: number) => void;
  onSelect?: (eventId: string) => void;
}) {
  const cards = visibleEvents(events);
  const presence = momentPresence(momentCount(summary));
  return (
    <section className="stack" aria-labelledby="graph-title">
      <h2 id="graph-title">What shaped the music</h2>
      <p>{PRESENCE[presence]}</p>
      <ol className="mapping-list">
        {cards.map((event) => {
          const active = eventIsCurrent(timeMs, event);
          const copy = cardCopy(event);
          return (
            <li key={event.id}>
              <button
                type="button"
                data-event-id={event.id}
                className={
                  active || selectedId === event.id ? "moment-card is-active" : "moment-card"
                }
                onClick={() => {
                  onSelect?.(event.id);
                  onSeek(event.audio_offset_ms);
                }}
                onFocus={() => onSelect?.(event.id)}
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
