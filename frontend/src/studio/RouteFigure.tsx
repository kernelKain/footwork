import type { MovementEvent, RoutePoint } from "../contracts/types";

const EVENT_LABELS: Record<MovementEvent["type"], string> = {
  turn: "Turn",
  pause: "Pause",
  pace_change: "Pace change",
  loop: "Loop",
};

function pointAt(points: RoutePoint[], time: number): RoutePoint | null {
  let best: RoutePoint | null = null;
  let bestDelta = Number.POSITIVE_INFINITY;
  for (const point of points) {
    const delta = Math.abs(point.t_ms - time);
    if (delta < bestDelta) {
      best = point;
      bestDelta = delta;
    }
  }
  return best;
}

export function RouteFigure({ points, events }: { points: RoutePoint[]; events: MovementEvent[] }) {
  const poly = points.map((point) => `${point.x * 100},${point.y * 100}`).join(" ");
  const marks = events.filter((event) => event.type === "turn" || event.type === "pause");

  return (
    <figure className="route-figure">
      <svg viewBox="0 0 100 100" role="img" aria-labelledby="route-title route-desc">
        <title id="route-title">Synthetic route</title>
        <desc id="route-desc">
          A constructed path with a corner and a pause. It is not a map of a real place.
        </desc>
        <polyline className="route-path" points={poly} />
        {marks.map((event) => {
          const point = pointAt(points, event.audio_offset_ms);
          if (!point) return null;
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
          return (
            <circle key={event.id} className="route-turn" cx={cx} cy={cy} r="2.2">
              <title>{EVENT_LABELS[event.type]}</title>
            </circle>
          );
        })}
      </svg>
      <figcaption>
        Synthetic route. The line is the path. The circle is a turn and the square is a pause. Both
        musical mappings are planned, not heard.
      </figcaption>
    </figure>
  );
}
