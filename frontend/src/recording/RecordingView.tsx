import { useEffect, useRef, type ReactNode } from "react";
import type { RecordingPort } from "./practicePort";
import { practiceRoutePieces, type PracticeDraft } from "./practiceDraft";
import { formatClock } from "./useMonotonicClock";
import { HoldButton } from "../ui/HoldButton";
import { Walker } from "../ui/Walker";
import { RecordingIndicator } from "../ui/RecordingIndicator";
import { StatusChip } from "../ui/StatusChip";
import { TimerDisplay } from "../ui/TimerDisplay";

type Navigate = (event: { preventDefault: () => void; currentTarget: { href: string } }) => void;

export type RecordingPhase =
  | "checking_location"
  | "recording"
  | "pausing"
  | "paused"
  | "resuming"
  | "ending"
  | "finished"
  | "permission_denied"
  | "unsupported_browser"
  | "offline"
  | "interrupted";

export type WalkClocks = {
  activeMs: number;
  breakMs: number;
  currentBreakMs: number;
  elapsedMs: number;
};

export function RecordingView({
  phase,
  clocks,
  draft,
  liveSegmentMs,
  port,
  resumeNote,
  onCancel,
  onPause,
  onResume,
  onCancelResume,
  onEnd,
  onRetry,
  onNavigate,
}: {
  phase: RecordingPhase;
  clocks: WalkClocks;
  draft: PracticeDraft | null;
  liveSegmentMs: number;
  port: RecordingPort;
  resumeNote: string | null;
  onCancel: () => void;
  onPause: () => void;
  onResume: () => void;
  onCancelResume: () => void;
  onEnd: () => void;
  onRetry: () => void;
  onNavigate: Navigate;
}) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const pauseRef = useRef<HTMLButtonElement>(null);
  const resumeRef = useRef<HTMLButtonElement>(null);
  const previousPhase = useRef(phase);

  useEffect(() => {
    const from = previousPhase.current;
    previousPhase.current = phase;
    if (from === phase) {
      if (phase === "paused") resumeRef.current?.focus();
      return;
    }
    if (phase === "pausing") {
      headingRef.current?.focus();
      return;
    }
    if (phase === "paused") {
      resumeRef.current?.focus();
      return;
    }
    if (phase === "resuming") {
      headingRef.current?.focus();
      return;
    }
    if (phase === "recording" && from === "resuming") pauseRef.current?.focus();
  }, [phase]);

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

  const activeMs = Math.round(clocks.activeMs);
  const breakMs = Math.round(clocks.breakMs);
  const currentBreakMs = Math.round(clocks.currentBreakMs);

  return (
    <section
      className="recording-view"
      aria-labelledby="walk-title"
      data-active-ms={activeMs}
      data-break-ms={breakMs}
      data-current-break-ms={currentBreakMs}
      data-elapsed-ms={activeMs + breakMs}
    >
      <div className="walk-title-row">
        <Walker pose={phase === "recording" ? "stride" : "still"} />
        <h1 id="walk-title" tabIndex={-1} ref={headingRef}>
          {headingFor(phase)}
        </h1>
      </div>
      {phase === "recording" ? <RecordingIndicator /> : null}
      {phase === "pausing" ? <p role="status">Pausing this practice walk.</p> : null}
      {phase === "paused" ? (
        <p role="status">Movement is not being recorded. Your walk is saved on this phone.</p>
      ) : null}
      {phase === "resuming" ? (
        <p role="status">Finding your location again. This practice is not using your location.</p>
      ) : null}
      {resumeNote && phase === "paused" ? <p role="alert">{resumeNote}</p> : null}
      <WalkClocks clocks={clocks} showBreak={phase !== "recording"} />
      {phase === "recording" ? (
        <>
          <StatusChip label={port.signalLabel()} tone="live" />
          <p>{port.wakeLockLabel()}</p>
          <p>Keep this tab open. This practice does not read or save your location.</p>
        </>
      ) : null}
      {draft ? (
        <PracticeRoute draft={draft} moving={phase === "recording"} liveMs={liveSegmentMs} />
      ) : null}
      {phase === "recording" ? (
        <div className="walk-dock">
          <button
            ref={pauseRef}
            type="button"
            className="ui-button ui-button-secondary"
            onClick={onPause}
          >
            Pause walk
          </button>
          <EndWalk onEnd={onEnd} />
        </div>
      ) : null}
      {phase === "paused" ? (
        <div className="walk-dock">
          <button
            ref={resumeRef}
            type="button"
            className="ui-button ui-button-primary"
            onClick={onResume}
          >
            Resume walk
          </button>
          <EndWalk onEnd={onEnd} />
        </div>
      ) : null}
      {phase === "resuming" ? (
        <div className="walk-dock">
          <button type="button" className="ui-button ui-button-secondary" onClick={onCancelResume}>
            Cancel
          </button>
        </div>
      ) : null}
    </section>
  );
}

function headingFor(phase: "recording" | "pausing" | "paused" | "resuming"): string {
  if (phase === "pausing") return "Pausing walk";
  if (phase === "paused") return "Walk paused";
  if (phase === "resuming") return "Finding your location again";
  return "Practice walk";
}

function WalkClocks({ clocks, showBreak }: { clocks: WalkClocks; showBreak: boolean }) {
  return (
    <>
      <TimerDisplay
        label="Active walking time"
        value={formatClock(clocks.activeMs)}
        clock="active"
      />
      {showBreak ? (
        <TimerDisplay
          label="Current break time"
          value={formatClock(clocks.currentBreakMs)}
          clock="break"
        />
      ) : null}
      <p className="ui-visually-hidden" data-clock="elapsed">
        Elapsed time {formatClock(clocks.elapsedMs)}
      </p>
    </>
  );
}

function PracticeRoute({
  draft,
  moving,
  liveMs,
}: {
  draft: PracticeDraft;
  moving: boolean;
  liveMs: number;
}) {
  const pieces = practiceRoutePieces(draft);
  const lastId = draft.segments[draft.segments.length - 1]?.id;
  const hasBreak = pieces.some((piece) => piece.kind === "break");
  return (
    <figure className="practice-route">
      <svg viewBox="0 0 240 72" role="img" aria-label="Practice route. Not your location.">
        <title>Practice route. Not your location.</title>
        {pieces.map((piece) => {
          if (piece.kind === "break") {
            return (
              <path key={piece.id} data-kind="break" className="practice-break" d={piece.d}>
                <title>Break. Not movement.</title>
              </path>
            );
          }
          const segment = draft.segments.find((item) => item.id === piece.id);
          const duration = moving && piece.id === lastId ? liveMs : (segment?.durationMs ?? 0);
          const reveal = Math.max(Math.min(1, duration / 20000), 0.08);
          return (
            <path
              key={piece.id}
              data-kind="segment"
              className="ui-route-line practice-route-line"
              d={piece.d}
              pathLength={100}
              strokeDasharray={100}
              strokeDashoffset={100 * (1 - reveal)}
            />
          );
        })}
        <circle className="ui-waypoint" cx="16" cy="52" r="5" />
      </svg>
      <figcaption>
        Practice route. Not your location.
        {hasBreak ? " The dotted gap is a break, not movement." : ""}
      </figcaption>
    </figure>
  );
}

function EndWalk({ onEnd }: { onEnd: () => void }) {
  return (
    <HoldButton
      indicator="ring"
      label="Hold to end walk"
      confirmLabel="Confirm end walk"
      onConfirm={onEnd}
    />
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
