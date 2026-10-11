import type { GenerationMode } from "../contracts/types";
import { formatTime } from "./formatTime";

export type PlayerSound = "example" | "sketch" | "studio";

export function playerSound(generated: boolean, mode: GenerationMode): PlayerSound {
  if (!generated) return "example";
  if (mode === "studio_live") return "studio";
  return "sketch";
}

export function playerCaption(sound: PlayerSound): string {
  if (sound === "studio") return "This sound was recorded from your walk.";
  if (sound === "sketch") {
    return "This sound is the simpler version made from your walk. It is not a studio recording.";
  }
  return "This sound is an example made in the browser. It is not a studio recording.";
}

export function SoundprintPlayer({
  durationMs,
  timeMs,
  playing,
  playbackError,
  onToggle,
  onSeek,
  onReplay,
  sound = "example",
}: {
  durationMs: number;
  timeMs: number;
  playing: boolean;
  playbackError: string | null;
  onToggle: () => void;
  onSeek: (timeMs: number) => void;
  onReplay: () => void;
  sound?: PlayerSound;
}) {
  return (
    <div className="player">
      <div className="player-controls">
        <button type="button" className="ui-button ui-button-playback" onClick={onToggle}>
          {playing ? "Pause" : "Play"}
        </button>
        <button type="button" className="ui-button ui-button-secondary" onClick={onReplay}>
          Replay
        </button>
        <span className="studio-clock">
          <span className="ui-visually-hidden">Playback time</span>
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
        onChange={(event) => onSeek(Number(event.currentTarget.value))}
        onInput={(event) => onSeek(Number(event.currentTarget.value))}
      />
      <p>{playerCaption(sound)}</p>
      {playbackError ? <p role="alert">{playbackError}</p> : null}
    </div>
  );
}

/** Render compact playback controls driven by the parent player state and clock. */
export function MiniPlayer({
  timeMs,
  durationMs,
  playing,
  nowPlaying,
  onToggle,
}: {
  timeMs: number;
  durationMs: number;
  playing: boolean;
  nowPlaying: string;
  onToggle: () => void;
}) {
  return (
    <div className="mini-player" role="region" aria-label="Mini player">
      <p>{nowPlaying}</p>
      <button
        type="button"
        className="ui-button ui-button-playback"
        aria-label={playing ? "Pause in the mini player" : "Play in the mini player"}
        onClick={onToggle}
      >
        {playing ? "Pause" : "Play"}
      </button>
      <span className="studio-clock">
        {formatTime(timeMs)} / {formatTime(durationMs)}
      </span>
    </div>
  );
}
