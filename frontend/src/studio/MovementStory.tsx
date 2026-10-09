import type { MovementEvent, StoryCard } from "../contracts/types";
import { formatTime } from "./formatTime";

export function MovementStory({
  cards,
  events,
  timeMs,
  onSeek,
}: {
  cards: StoryCard[];
  events: MovementEvent[];
  timeMs: number;
  onSeek: (timeMs: number) => void;
}) {
  return (
    <section className="stack" aria-labelledby="story-title" data-story-time={Math.round(timeMs)}>
      <h2 id="story-title">Movement Story</h2>
      <ol className="story-list">
        {cards.map((card) => {
          const event = events.find((item) => item.id === card.event_id);
          const offset = event?.audio_offset_ms ?? 0;
          const active = event !== undefined && Math.abs(timeMs - offset) <= 500;
          return (
            <li key={card.id} className={active ? "is-active" : undefined}>
              <button type="button" onClick={() => onSeek(offset)}>
                {active ? <span>Now</span> : null}
                <span>{card.text}</span>
                <time dateTime={`PT${Math.floor(offset / 1000)}S`}>{formatTime(offset)}</time>
              </button>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
