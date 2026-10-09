import type { MovementSummary } from "../contracts/types";
import { formatTime } from "./formatTime";
import { formatDistance, momentCount, paceLine, returnLine } from "./journeyModel";

export function JourneyGlance({ summary }: { summary: MovementSummary }) {
  const proximity = returnLine(summary);
  const tiles = [
    { label: "Active time", value: formatTime(summary.active_duration_ms), mark: "active" },
    { label: "Total time", value: formatTime(summary.elapsed_duration_ms), mark: "elapsed" },
    { label: "Distance", value: `${formatDistance(summary.distance_m)} m`, mark: "distance" },
    { label: "Movement moments", value: String(momentCount(summary)), mark: "moments" },
  ];
  return (
    <section className="stack" aria-labelledby="glance-title">
      <h2 id="glance-title">Journey at a glance</h2>
      <dl className="glance-grid">
        {tiles.map((tile) => (
          <div key={tile.mark} className={`glance-tile glance-${tile.mark}`}>
            <dt>{tile.label}</dt>
            <dd>{tile.value}</dd>
          </div>
        ))}
      </dl>
      <p>{paceLine(summary)}</p>
      {proximity ? <p>{proximity}</p> : null}
    </section>
  );
}
