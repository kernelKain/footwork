import type { RoutePoint } from "../contracts/types";

export function pointOnRoute(points: RoutePoint[], timeMs: number): RoutePoint {
  const first = points[0];
  if (!first) return { x: 0, y: 0, t_ms: 0 };
  if (timeMs <= first.t_ms) return { ...first, t_ms: timeMs };
  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1];
    const next = points[index];
    if (!previous || !next || timeMs > next.t_ms) continue;
    const span = next.t_ms - previous.t_ms;
    const mix = span === 0 ? 0 : (timeMs - previous.t_ms) / span;
    return {
      x: previous.x + (next.x - previous.x) * mix,
      y: previous.y + (next.y - previous.y) * mix,
      t_ms: timeMs,
    };
  }
  const last = points[points.length - 1] ?? first;
  return { ...last, t_ms: timeMs };
}
