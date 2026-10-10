import type { MovementEvent, MovementSummary, RoutePoint } from "../contracts/types";
import { useOnstage } from "../ui/motionGuard";
import { WalkerMark } from "../ui/Walker";
import { drawnSpans, eventIsCurrent, paceLine, playbackPoint } from "./journeyModel";

const MARKER_LABELS: Record<MovementEvent["type"], string> = {
  turn: "Turn marker",
  pause: "Detected pause marker",
  pace_change: "Pace change marker",
  loop: "Loop marker",
};

export function RouteFigure({
  points,
  events,
  summary,
  timeMs,
  playing,
  onSeek,
  title = "Example route",
}: {
  points: RoutePoint[];
  events: MovementEvent[];
  summary: MovementSummary;
  timeMs: number;
  playing: boolean;
  onSeek: (timeMs: number) => void;
  title?: string;
}) {
  const stageRef = useOnstage<HTMLElement>();
  const spans = drawnSpans(points, summary);
  const start = points[0];
  const end = points[points.length - 1];
  const cursor = playbackPoint(points, summary, timeMs);
  const pace = paceLine(summary);

  return (
    <figure ref={stageRef} className="route-figure">
      <svg
        className="route-layer"
        viewBox="0 0 100 100"
        role="img"
        aria-labelledby="route-title route-desc"
      >
        <title id="route-title">{title}</title>
        <desc id="route-desc">
          A privacy-safe route with separate recording segments. Manual breaks and uncertain
          intervals stay disconnected. It is not a map of a real place.
        </desc>
        {spans.map((span) =>
          span.kind === "segment" ? (
            <polyline
              key={span.id}
              className="route-path"
              data-kind="segment"
              data-pace={span.pace}
              points={span.points}
              pathLength={100}
            />
          ) : (
            <polyline
              key={span.id}
              className="route-gap"
              data-kind={span.kind}
              points={span.points}
            >
              <title>
                {span.kind === "break"
                  ? "Break. Not movement."
                  : "Uncertain interval. Not movement."}
              </title>
            </polyline>
          ),
        )}
        {start ? (
          <circle className="route-start" cx={start.x * 100} cy={start.y * 100} r="2.4">
            <title>Start</title>
          </circle>
        ) : null}
        {end ? (
          <circle className="route-end" cx={end.x * 100} cy={end.y * 100} r="3.2">
            <title>Finish</title>
          </circle>
        ) : null}
      </svg>
      <svg className="route-layer" viewBox="0 0 100 100" role="group" aria-label="Route markers">
        {events.map((event) => (
          <Marker
            key={event.id}
            event={event}
            points={points}
            summary={summary}
            active={eventIsCurrent(timeMs, event)}
            onSeek={onSeek}
          />
        ))}
        <g
          className={playing ? "route-cursor is-playing" : "route-cursor"}
          data-time-ms={Math.round(timeMs)}
          transform={`translate(${cursor.x * 100} ${cursor.y * 100}) scale(0.22) translate(-12 -28)`}
        >
          <title>Route position</title>
          <WalkerMark pose="playback" />
        </g>
      </svg>
      <figcaption>
        Example route. The filled circle is the start and the ring is the finish. Amber marks a turn
        or a pace change, blue marks a detected pause, and a loop uses a ring. The walker follows
        the music. {pace}
      </figcaption>
    </figure>
  );
}

function Marker({
  event,
  points,
  summary,
  active,
  onSeek,
}: {
  event: MovementEvent;
  points: RoutePoint[];
  summary: MovementSummary;
  active: boolean;
  onSeek: (timeMs: number) => void;
}) {
  const point = playbackPoint(points, summary, event.audio_offset_ms);
  const cx = point.x * 100;
  const cy = point.y * 100;
  const label = MARKER_LABELS[event.type];
  const seek = () => onSeek(event.audio_offset_ms);
  return (
    <g
      role="button"
      tabIndex={0}
      aria-label={label}
      className={active ? "route-marker is-current" : "route-marker"}
      onClick={seek}
      onKeyDown={(keyEvent) => {
        if (keyEvent.key === "Enter" || keyEvent.key === " ") {
          keyEvent.preventDefault();
          seek();
        }
      }}
    >
      <title>
        {label}
        {active ? " Now" : ""}
      </title>
      {event.type === "pause" ? (
        <rect className="route-pause" x={cx - 2.2} y={cy - 2.2} width="4.4" height="4.4" />
      ) : null}
      {event.type === "pace_change" ? (
        <polygon
          className="route-pace"
          points={`${cx},${cy - 2.6} ${cx + 2.6},${cy} ${cx},${cy + 2.6} ${cx - 2.6},${cy}`}
        />
      ) : null}
      {event.type === "loop" ? <circle className="route-loop" cx={cx} cy={cy} r="2.6" /> : null}
      {event.type === "turn" ? <circle className="route-turn" cx={cx} cy={cy} r="2.2" /> : null}
    </g>
  );
}
