import { useEffect, useState } from "react";

export function useMonotonicClock(running: boolean): number {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!running) return;
    const started = performance.now();
    let frame = 0;
    let shownSecond = -1;
    const tick = (now: number) => {
      const next = now - started;
      const second = Math.floor(next / 1000);
      if (second !== shownSecond) {
        shownSecond = second;
        setElapsed(next);
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [running]);

  return elapsed;
}

export function formatClock(elapsedMs: number): string {
  const total = Math.max(0, Math.floor(elapsedMs / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}
