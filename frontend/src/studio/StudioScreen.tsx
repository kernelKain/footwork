import { useEffect, useMemo } from "react";
import type { DemoFixture, EventType } from "../contracts/types";
import { formatTime } from "./formatTime";
import { RouteFigure } from "./RouteFigure";
import { SoundprintPlayer } from "./SoundprintPlayer";
import { synthesizeSketchWav } from "./sketchAudio";
import { useAudioClock } from "./useAudioClock";

const EVENT_LABELS: Record<EventType, string> = {
  turn: "Turn",
  pause: "Pause",
  pace_change: "Pace change",
  loop: "Loop",
};

export function StudioScreen({ fixture }: { fixture: DemoFixture }) {
  const { result } = fixture;
  const sketchUrl = useMemo(() => {
    const wav = synthesizeSketchWav(result.duration_ms, result.events);
    return URL.createObjectURL(new Blob([wav], { type: "audio/wav" }));
  }, [result]);
  useEffect(() => {
    return () => URL.revokeObjectURL(sketchUrl);
  }, [sketchUrl]);
  const clock = useAudioClock(sketchUrl, result.duration_ms);
  return (
    <div className="stack">
      <section className="stack" aria-labelledby="studio-title">
        <h1 id="studio-title">Soundprint</h1>
        <p className="fixture-banner panel" role="status">
          <strong>Synthetic fixture.</strong> {fixture.purpose}
        </p>
      </section>
      <SoundprintPlayer
        source={sketchUrl}
        durationMs={result.duration_ms}
        timeMs={clock.timeMs}
        playing={clock.playing}
        playbackError={clock.playbackError}
        audioRef={clock.audioRef}
        onToggle={clock.toggle}
        onSeek={clock.seek}
      />
      <RouteFigure points={result.route.points} events={result.events} timeMs={clock.timeMs} />
      <section className="stack" aria-labelledby="events-title">
        <h2 id="events-title">Movement events</h2>
        <p className="mono">Duration {formatTime(result.duration_ms)}.</p>
        <ol className="event-list">
          {result.events.map((event) => {
            const active = Math.abs(clock.timeMs - event.audio_offset_ms) <= 500;
            return (
              <li key={event.id} className={active ? "is-active" : undefined}>
                <button type="button" onClick={() => clock.seek(event.audio_offset_ms)}>
                  <span>{EVENT_LABELS[event.type]}</span>
                  {active ? <span>Now</span> : null}
                  <time dateTime={`PT${Math.floor(event.audio_offset_ms / 1000)}S`}>
                    {formatTime(event.audio_offset_ms)}
                  </time>
                </button>
              </li>
            );
          })}
        </ol>
      </section>
      <section className="panel" aria-labelledby="provenance-title">
        <h2 id="provenance-title">Provenance</h2>
        <p>Mapping status: planned. These relationships are intended, not measured.</p>
        <p className="muted">{result.quality.summary}</p>
        <p className="muted">{result.provenance.rights_note}</p>
      </section>
    </div>
  );
}
