import type { ReactNode } from "react";
import type { RecordingPort } from "./practicePort";
import { formatClock } from "./useMonotonicClock";
import { HoldButton } from "../ui/HoldButton";
import { RecordingIndicator } from "../ui/RecordingIndicator";
import { StatusChip } from "../ui/StatusChip";
import { TimerDisplay } from "../ui/TimerDisplay";

type Navigate = (event: { preventDefault: () => void; currentTarget: { href: string } }) => void;

type RecordingPhase =
  | "checking_location"
  | "recording"
  | "ending"
  | "finished"
  | "permission_denied"
  | "unsupported_browser"
  | "offline"
  | "interrupted";

export function RecordingView({
  phase,
  elapsedMs,
  port,
  onCancel,
  onEnd,
  onRetry,
  onNavigate,
}: {
  phase: RecordingPhase;
  elapsedMs: number;
  port: RecordingPort;
  onCancel: () => void;
  onEnd: () => void;
  onRetry: () => void;
  onNavigate: Navigate;
}) {
  if (phase === "checking_location") {
    return (
      <section className="recording-view" aria-labelledby="check-title">
        <h1 id="check-title">Checking location</h1>
        <p role="status">
          Checking this phone for a location fix. This practice is not using your location.
        </p>
        <div className="walk-dock">
          <button type="button" className="ui-button ui-button-secondary" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </section>
    );
  }

  if (phase === "permission_denied") {
    return (
      <Recovery
        title="Location is off"
        onNavigate={onNavigate}
        action="Try again"
        onAction={onRetry}
      >
        <p>This site cannot use your location yet.</p>
        <p>
          Allow location for this site in the browser settings, then try again. This practice did
          not open a location prompt.
        </p>
      </Recovery>
    );
  }

  if (phase === "unsupported_browser") {
    return (
      <Recovery title="This browser cannot record a walk" onNavigate={onNavigate}>
        <p>A real walk needs a browser that can share your location.</p>
        <p>This practice did not ask for location. You can still hear an example.</p>
      </Recovery>
    );
  }

  if (phase === "offline") {
    return (
      <Recovery
        title="You appear to be offline"
        onNavigate={onNavigate}
        action="Start again"
        onAction={onRetry}
      >
        <p>This practice did not save a walk. Hear an example when you can play it.</p>
      </Recovery>
    );
  }

  if (phase === "interrupted") {
    return (
      <Recovery
        title="The page was hidden"
        onNavigate={onNavigate}
        action="Start again"
        onAction={onRetry}
      >
        <p>Missing time was not filled in. Nothing was stored on this phone.</p>
      </Recovery>
    );
  }

  if (phase === "ending" || phase === "finished") {
    const finished = phase === "finished";
    return (
      <section className="recording-view" aria-labelledby="end-title">
        <h1 id="end-title">{finished ? "Practice walk finished" : "Finishing"}</h1>
        <p role="status">
          Finishing this practice walk. Nothing is being saved. No location was stored.
        </p>
        {finished ? (
          <div className="actions">
            <button type="button" className="ui-button ui-button-primary" onClick={onRetry}>
              Start again
            </button>
            <ExampleLink onNavigate={onNavigate} />
          </div>
        ) : null}
      </section>
    );
  }

  const reveal = Math.min(1, elapsedMs / 20000);
  return (
    <section className="recording-view" aria-labelledby="record-title">
      <h1 id="record-title">Practice walk</h1>
      <RecordingIndicator />
      <TimerDisplay label="Elapsed time" value={formatClock(elapsedMs)} />
      <StatusChip label={port.signalLabel()} tone="live" />
      <p>{port.wakeLockLabel()}</p>
      <p>Keep this tab open. This practice does not read or save your location.</p>
      <figure className="practice-route">
        <svg viewBox="0 0 240 72" role="img" aria-label="Practice route. Not your location.">
          <title>Practice route. Not your location.</title>
          <path
            className="ui-route-line practice-route-line"
            d="M16 52 C 48 52 64 20 108 20 H 210"
            pathLength={100}
            strokeDasharray={100}
            strokeDashoffset={100 * (1 - Math.max(reveal, 0.08))}
          />
          <circle className="ui-waypoint" cx="16" cy="52" r="5" />
        </svg>
        <figcaption>Practice route. Not your location.</figcaption>
      </figure>
      <div className="walk-dock">
        <HoldButton
          indicator="ring"
          label="Hold to end walk"
          confirmLabel="Confirm end walk"
          onConfirm={onEnd}
        />
      </div>
    </section>
  );
}

function ExampleLink({ onNavigate }: { onNavigate: Navigate }) {
  return (
    <a className="ui-button ui-button-secondary" href="/studio" onClick={onNavigate}>
      Hear an example
    </a>
  );
}

function Recovery({
  title,
  children,
  onNavigate,
  action,
  onAction,
}: {
  title: string;
  children: ReactNode;
  onNavigate: Navigate;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <section className="recording-view" role="alert" aria-labelledby="recovery-title">
      <h1 id="recovery-title">{title}</h1>
      {children}
      <div className="actions">
        {action && onAction ? (
          <button type="button" className="ui-button ui-button-primary" onClick={onAction}>
            {action}
          </button>
        ) : null}
        <ExampleLink onNavigate={onNavigate} />
      </div>
    </section>
  );
}
