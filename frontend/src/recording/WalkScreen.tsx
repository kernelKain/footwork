import { useState } from "react";
import { StateMessage } from "../components/StateMessage";
import { StatePicker } from "../components/StatePicker";

const WALK_STATES = [
  { id: "empty", label: "Empty" },
  { id: "permission", label: "Permission" },
  { id: "loading", label: "Waiting for position" },
  { id: "invalid", label: "Invalid trace" },
  { id: "interrupted", label: "Page hidden" },
] as const;

type WalkStateId = (typeof WALK_STATES)[number]["id"];

type WalkScreenProps = {
  onNavigate: (event: { preventDefault: () => void; currentTarget: { href: string } }) => void;
};

export function WalkScreen({ onNavigate }: WalkScreenProps) {
  const [state, setState] = useState<WalkStateId>("empty");
  return (
    <div className="stack">
      <section className="stack" aria-labelledby="walk-title">
        <h1 id="walk-title">Footwork</h1>
        <p className="lede">
          A recorded walk becomes a short instrumental piece and a Soundprint that moves with it. A
          sharp turn is meant to change the melody&apos;s direction. A pause is meant to become a
          musical break.
        </p>
        <div className="actions">
          <a className="action" href="/studio" onClick={onNavigate}>
            Play example
          </a>
          <a className="action secondary" href="/about" onClick={onNavigate}>
            How it works
          </a>
        </div>
      </section>
      {state === "empty" ? (
        <section className="panel" aria-labelledby="recording-title">
          <h2 id="recording-title">Recording</h2>
          <p>No walk is stored on this device.</p>
          <p className="muted">
            Duration and signal quality appear here only after a real recording starts. This preview
            does not request location access.
          </p>
        </section>
      ) : null}
      {state === "permission" ? (
        <StateMessage title="Permission" tone="alert">
          <p>Location access was denied.</p>
          <p>
            In the browser settings for this site, allow location, then return and start again. This
            preview did not open a location prompt.
          </p>
          <p>
            <a className="action" href="/studio" onClick={onNavigate}>
              Play example
            </a>
          </p>
        </StateMessage>
      ) : null}
      {state === "loading" ? (
        <StateMessage title="Waiting for position" tone="status">
          <p>Waiting for a position fix.</p>
          <p>
            Duration and signal stay blank until a real fix arrives. This preview is not locating
            you.
          </p>
        </StateMessage>
      ) : null}
      {state === "invalid" ? (
        <StateMessage title="Invalid trace" tone="alert">
          <p>
            This trace cannot become a Soundprint. The movement was too short and the position
            quality was too poor to score. No events were invented.
          </p>
          <p>
            <a className="action" href="/studio" onClick={onNavigate}>
              Play example
            </a>
          </p>
        </StateMessage>
      ) : null}
      {state === "interrupted" ? (
        <StateMessage title="Page hidden" tone="alert">
          <p>The page was in the background. The gap is marked, and no positions were filled in.</p>
          <p>Return to this tab before recording continues. This preview is not recording.</p>
        </StateMessage>
      ) : null}
      <StatePicker
        legend="Show recording preview states"
        note="These states are a fixture. They do not request location or store a walk."
        options={WALK_STATES}
        value={state}
        onChange={setState}
      />
    </div>
  );
}
