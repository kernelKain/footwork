import type { MovementSummary } from "../contracts/types";
import { compositionRows, momentCount } from "./journeyModel";

export function JourneyComposition({ summary }: { summary: MovementSummary }) {
  const rows = compositionRows(summary);
  const total = momentCount(summary);
  const widest = Math.max(...rows.map((row) => row.count), 1);
  return (
    <section className="stack" aria-labelledby="composition-title">
      <h2 id="composition-title">Journey composition</h2>
      <p>Counts of accepted moments in this walk.</p>
      {total === 0 ? <p>No accepted moments.</p> : null}
      <ul className="composition-list">
        {rows.map((row) => (
          <li key={row.id}>
            <span>
              {row.label} {row.count}
            </span>
            <span className="composition-track" aria-hidden="true">
              <span
                className={`composition-fill composition-${row.id}`}
                style={{ width: `${(row.count / widest) * 100}%` }}
              />
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
