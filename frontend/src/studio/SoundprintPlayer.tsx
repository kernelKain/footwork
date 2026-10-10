import { formatTime } from "./formatTime";

export function SoundprintPlayer({
  durationMs,
  timeMs,
  playing,
  playbackError,
  onToggle,
  onSeek,
  onReplay,
}: {
  durationMs: number;
  timeMs: number;
  playing: boolean;
  playbackError: string | null;
  onToggle: () => void;
  onSeek: (timeMs: number) => void;
  onReplay: () => void;
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
      <p>This sound is an example made in the browser. It is not a studio recording.</p>
      {playbackError ? <p role="alert">{playbackError}</p> : null}
    </div>
  );
}
