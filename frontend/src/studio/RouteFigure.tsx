import type { MovementEvent, RoutePoint } from "../contracts/types";
import { pointOnRoute } from "./routePosition";

const EVENT_LABELS: Record<MovementEvent["type"], string> = {
  turn: "Turn",
  pause: "Pause",
  pace_change: "Pace change",
  loop: "Loop",
};

export function RouteFigure({
  points,
  events,
  timeMs,
}: {
  points: RoutePoint[];
  events: MovementEvent[];
  timeMs: number;
}) {
  const poly = points.map((point) => `${point.x * 100},${point.y * 100}`).join(" ");
  const start = points[0];
  const end = points[points.length - 1];
  const cursor = pointOnRoute(points, timeMs);

  return (
    <figure className="route-figure">
      <svg viewBox="0 0 100 100" role="img" aria-labelledby="route-title route-desc">
        <title id="route-title">Example route</title>
        <desc id="route-desc">
          An example path with a start, an end, a turn, a pause, and a change in pace. It is not a
          map of a real place.
        </desc>
        <polyline className="route-path" points={poly} />
        {start ? (
          <circle className="route-start" cx={start.x * 100} cy={start.y * 100} r="2.4" />
        ) : null}
        {end ? <circle className="route-end" cx={end.x * 100} cy={end.y * 100} r="3.2" /> : null}
        {events.map((event) => {
          const point = pointOnRoute(points, event.audio_offset_ms);
          const cx = point.x * 100;
          const cy = point.y * 100;
          if (event.type === "pause") {
            return (
              <rect
                key={event.id}
                className="route-pause"
                x={cx - 2.2}
                y={cy - 2.2}
                width="4.4"
                height="4.4"
              >
                <title>{EVENT_LABELS[event.type]}</title>
              </rect>
            );
          }
          if (event.type === "pace_change") {
            return (
              <polygon
                key={event.id}
                className="route-pace"
                points={`${cx},${cy - 2.6} ${cx + 2.6},${cy} ${cx},${cy + 2.6} ${cx - 2.6},${cy}`}
              >
                <title>{EVENT_LABELS[event.type]}</title>
              </polygon>
            );
          }
          return (
            <circle key={event.id} className="route-turn" cx={cx} cy={cy} r="2.2">
              <title>{EVENT_LABELS[event.type]}</title>
            </circle>
          );
        })}
        <circle
          className="route-cursor"
          cx={cursor.x * 100}
          cy={cursor.y * 100}
          r="3.1"
          data-time-ms={Math.round(timeMs)}
        >
          <title>Route position</title>
        </circle>
      </svg>
      <figcaption>
        Example route. The filled circle is the start and the ring is the end. Gold marks a turn, a
        square marks a pause, and a diamond marks a change in pace. The outlined circle follows the
        music.
      </figcaption>
    </figure>
  );
}
