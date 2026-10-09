import { useEffect, useRef, useState } from "react";

function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function HoldButton({
  label,
  confirmLabel,
  holdMs = 2000,
  onConfirm,
}: {
  label: string;
  confirmLabel: string;
  holdMs?: number;
  onConfirm: () => void;
}) {
  const [armed, setArmed] = useState(false);
  const [progress, setProgress] = useState(0);
  const frame = useRef(0);
  const started = useRef(0);

  useEffect(() => {
    return () => cancelAnimationFrame(frame.current);
  }, []);

  const stop = () => {
    cancelAnimationFrame(frame.current);
    setProgress(0);
  };

  const tick = (now: number) => {
    const next = Math.min(1, (now - started.current) / holdMs);
    setProgress(next);
    if (next >= 1) {
      stop();
      onConfirm();
      return;
    }
    frame.current = requestAnimationFrame(tick);
  };

  const startHold = () => {
    if (prefersReducedMotion()) return;
    cancelAnimationFrame(frame.current);
    started.current = performance.now();
    frame.current = requestAnimationFrame(tick);
  };

  const confirm = () => {
    if (prefersReducedMotion()) {
      if (!armed) {
        setArmed(true);
        return;
      }
      setArmed(false);
      onConfirm();
      return;
    }
    stop();
  };

  return (
    <button
      type="button"
      className="ui-button ui-button-destructive ui-hold"
      aria-pressed={armed}
      onPointerDown={startHold}
      onPointerUp={stop}
      onPointerLeave={stop}
      onKeyDown={(event) => {
        if (event.repeat) return;
        if (event.key === " " || event.key === "Enter") startHold();
      }}
      onKeyUp={(event) => {
        if (event.key === " " || event.key === "Enter") stop();
      }}
      onClick={confirm}
    >
      <span className="ui-hold-track" aria-hidden="true">
        <span className="ui-hold-fill" style={{ transform: `scaleX(${progress})` }} />
      </span>
      {armed ? confirmLabel : label}
    </button>
  );
}
