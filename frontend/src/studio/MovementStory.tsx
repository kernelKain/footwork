import type { Chapter } from "../contracts/types";
import { currentChapter } from "./RouteSoundGraph";

export function MovementStory({
  chapters,
  durationMs,
  timeMs,
  summary,
}: {
  chapters: Chapter[];
  durationMs: number;
  timeMs: number;
  summary: string;
}) {
  const place = currentChapter(chapters, durationMs, timeMs);
  return (
    <section className="stack" aria-labelledby="story-title" data-story-time={Math.round(timeMs)}>
      <h2 id="story-title">Walk story</h2>
      <p>{summary}</p>
      <p>
        {place ? place.title : "The piece"}
        {place ? " Now" : ""}
      </p>
    </section>
  );
}
