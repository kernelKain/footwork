import { useEffect, useRef, type RefObject } from "react";

/** Runs a frame loop only while the document is visible. Returning false stops it. */
export function runWhileVisible(step: (now: number) => boolean): () => void {
  let frame = 0;
  let stopped = false;

  const schedule = () => {
    if (stopped || document.hidden) return;
    frame = requestAnimationFrame((now) => {
      if (stopped || document.hidden) return;
      if (!step(now) || stopped) return;
      schedule();
    });
  };

  const onVisibility = () => {
    document.documentElement.classList.toggle("is-background", document.hidden);
    if (document.hidden) {
      cancelAnimationFrame(frame);
      return;
    }
    schedule();
  };

  document.addEventListener("visibilitychange", onVisibility);
  schedule();
  return () => {
    stopped = true;
    cancelAnimationFrame(frame);
    document.removeEventListener("visibilitychange", onVisibility);
  };
}

/** Marks an element on stage only while it is in view and the document is visible. */
export function useOnstage<T extends Element>(): RefObject<T | null> {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    let intersecting = false;
    const apply = () => {
      document.documentElement.classList.toggle("is-background", document.hidden);
      node.classList.toggle("is-onstage", intersecting && !document.hidden);
    };
    const observer = new IntersectionObserver(([entry]) => {
      intersecting = Boolean(entry?.isIntersecting);
      apply();
    });
    observer.observe(node);
    document.addEventListener("visibilitychange", apply);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", apply);
      node.classList.remove("is-onstage");
    };
  }, []);

  return ref;
}
