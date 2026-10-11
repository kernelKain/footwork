import type { Chapter, MovementEvent, MovementSummary, RoutePoint } from "../contracts/types";
import { nowPlayingLine } from "./journeyModel";
import { RouteFigure } from "./RouteFigure";

/** Render the route and current musical moment using the shared playback time. */
export function JourneyStage({
  points,
  events,
  summary,
  chapters,
  durationMs,
  timeMs,
  playing,
  story,
  routeTitle,
  selectedId,
  onSeek,
  onSelect,
}: {
  points: RoutePoint[];
  events: MovementEvent[];
  summary: MovementSummary;
  chapters: Chapter[];
  durationMs: number;
  timeMs: number;
  playing: boolean;
  story: string;
  routeTitle: string;
  selectedId: string | null;
  onSeek: (timeMs: number) => void;
  onSelect: (eventId: string) => void;
}) {
  const line = nowPlayingLine(chapters, events, durationMs, timeMs);
  return (
    <section
      className="journey-stage stack"
      aria-labelledby="journey-stage-title"
      data-story-time={Math.round(timeMs)}
    >
      <h2 id="journey-stage-title">The journey</h2>
      <p className="now-playing" key={line}>
        {line}
      </p>
      <RouteFigure
        points={points}
        events={events}
        summary={summary}
        timeMs={timeMs}
        playing={playing}
        onSeek={onSeek}
        selectedId={selectedId}
        onSelect={onSelect}
        title={routeTitle}
      />
      <p>{story}</p>
    </section>
  );
}
