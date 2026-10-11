import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "../ui/Button";
import { momentExamples, momentPreviewWav, type MomentExampleId } from "./momentExamples";

/** Render illustrated movement previews with one shared audio element and URL cleanup. */
export function MomentExamples() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const urlRef = useRef<string | null>(null);
  const tokenRef = useRef(0);
  const [active, setActive] = useState<MomentExampleId | null>(null);

  /** Pause preview audio, detach its source, and revoke the current object URL. */
  const release = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.removeAttribute("src");
    }
    if (urlRef.current) {
      URL.revokeObjectURL(urlRef.current);
      urlRef.current = null;
    }
  }, []);

  /** Invalidate pending playback, release preview resources, and clear the active selection. */
  const stop = useCallback(() => {
    tokenRef.current += 1;
    release();
    setActive(null);
  }, [release]);

  useEffect(() => {
    /** Stop the preview when the document becomes hidden. */
    const onVisibility = () => {
      if (document.hidden || document.visibilityState === "hidden") stop();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      tokenRef.current += 1;
      release();
    };
  }, [release, stop]);

  /** Toggle a preview while invalidating playback callbacks from earlier selections. */
  const toggle = (id: MomentExampleId) => {
    const audio = audioRef.current;
    if (!audio) return;
    if (active === id) {
      stop();
      return;
    }
    tokenRef.current += 1;
    const token = tokenRef.current;
    release();
    const url = URL.createObjectURL(new Blob([momentPreviewWav(id)], { type: "audio/wav" }));
    urlRef.current = url;
    audio.src = url;
    audio.onended = () => {
      if (tokenRef.current === token) setActive(null);
    };
    setActive(id);
    void audio.play().then(
      () => {
        if (tokenRef.current !== token) audio.pause();
      },
      () => {
        if (tokenRef.current === token) stop();
      },
    );
  };

  return (
    <section aria-labelledby="moment-title">
      <h2 id="moment-title">Hear what a moment does</h2>
      <p>These previews are illustrations, not generated pieces.</p>
      <div className="moment-cards">
        {momentExamples.map((example) => {
          const playing = active === example.id;
          return (
            <article
              key={example.id}
              className="moment-card"
              aria-labelledby={`moment-${example.id}`}
            >
              <h3 id={`moment-${example.id}`}>{example.title}</h3>
              <svg
                viewBox="0 0 264 132"
                role="img"
                aria-label={example.figureLabel}
                focusable="false"
              >
                <line
                  className="moment-align"
                  x1={example.align}
                  x2={example.align}
                  y1="12"
                  y2="124"
                />
                {example.routes.map((route) => (
                  <path key={route} className="ui-route-line" d={route} data-part="route" />
                ))}
                {example.samples.map((x) => (
                  <circle
                    key={`sample-${x}`}
                    className="moment-sample"
                    cx={x}
                    cy="40"
                    r="4"
                    data-part="sample"
                  />
                ))}
                {example.contour ? (
                  <path className="moment-contour" d={example.contour} data-part="contour" />
                ) : null}
                {example.silence ? (
                  <line
                    className="moment-silence"
                    x1={example.silence.x1}
                    x2={example.silence.x2}
                    y1="112"
                    y2="112"
                    data-part="silence"
                  />
                ) : null}
                {example.bars.map((bar) => (
                  <rect
                    key={`bar-${bar.x}`}
                    className="ui-wave-bar"
                    x={bar.x}
                    y={118 - bar.height}
                    width="8"
                    height={bar.height}
                    rx="2"
                    data-part="pulse"
                  />
                ))}
              </svg>
              <p>{example.copy}</p>
              <Button
                variant="secondary"
                aria-pressed={playing}
                aria-label={playing ? example.stopLabel : example.previewLabel}
                onClick={() => toggle(example.id)}
              >
                {playing ? "Stop" : "Preview"}
              </Button>
            </article>
          );
        })}
      </div>
      <audio ref={audioRef} preload="none" data-moment-preview="" aria-hidden="true" />
    </section>
  );
}
