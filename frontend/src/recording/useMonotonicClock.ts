import { useCallback, useEffect, useRef, useState } from "react";
import { runWhileVisible } from "../ui/motionGuard";

export function useMonotonicClock(running: boolean): number {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!running) return;
    const started = performance.now();
    let shownSecond = -1;
    return runWhileVisible((now) => {
      const next = now - started;
      const second = Math.floor(next / 1000);
      if (second !== shownSecond) {
        shownSecond = second;
        setElapsed(next);
      }
      return true;
    });
  }, [running]);

  return elapsed;
}

/**
 * A clock that can be stopped and read on the same click.
 * `displayMs` advances once per second while running and is 0 while stopped.
 * `read` returns the latest frame, including the partial second, and returns
 * 0 once the clock is stopped so a stored duration is not added twice.
 */
export function useRunningOffset(running: boolean): { displayMs: number; read: () => number } {
  const [displayMs, setDisplayMs] = useState(0);
  const readMs = useRef(0);
  const runningRef = useRef(running);
  runningRef.current = running;

  useEffect(() => {
    if (!running) {
      readMs.current = 0;
      setDisplayMs(0);
      return;
    }
    const started = performance.now();
    let shownSecond = -1;
    return runWhileVisible((now) => {
      const next = now - started;
      readMs.current = next;
      const second = Math.floor(next / 1000);
      if (second !== shownSecond) {
        shownSecond = second;
        setDisplayMs(next);
      }
      return true;
    });
  }, [running]);

  const read = useCallback(() => (runningRef.current ? readMs.current : 0), []);
  return { displayMs: running ? displayMs : 0, read };
}

export function formatClock(elapsedMs: number): string {
  const total = Math.max(0, Math.floor(elapsedMs / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}
