import type { RefObject } from "react";
import { formatTime } from "./formatTime";

export function SoundprintPlayer({
  source,
  durationMs,
  timeMs,
  playing,
  playbackError,
  audioRef,
  onToggle,
  onSeek,
}: {
  source: string;
  durationMs: number;
  timeMs: number;
  playing: boolean;
  playbackError: string | null;
  audioRef: RefObject<HTMLAudioElement | null>;
  onToggle: () => void;
  onSeek: (timeMs: number) => void;
}) {
  return (
    <section className="player panel" aria-labelledby="player-title">
      <h2 id="player-title">Playback</h2>
      <p>
        Deterministic sketch generated in the browser. The tone falls until the corner, then rises.
        The hold is silent. This is not ElevenLabs audio.
      </p>
      <div className="player-controls">
        <button type="button" className="action" onClick={onToggle}>
          {playing ? "Pause" : "Play"}
        </button>
        <span className="mono">
          {formatTime(timeMs)} / {formatTime(durationMs)}
        </span>
      </div>
      <input
        className="scrubber"
        type="range"
        min={0}
        max={durationMs}
        step={100}
        value={timeMs}
        aria-label="Scrub Soundprint"
        onInput={(event) => onSeek(Number(event.currentTarget.value))}
      />
      {playbackError ? <p role="alert">{playbackError}</p> : null}
      <audio ref={audioRef} src={source} preload="auto" aria-hidden="true" />
    </section>
  );
}
