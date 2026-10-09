import { useEffect, useMemo, useState } from "react";
import { StatePicker } from "../components/StatePicker";
import type { DemoFixture } from "../contracts/types";
import {
  GENERATION_STATES,
  GenerationStateBody,
  type GenerationStateId,
} from "./GenerationStateBody";
import { MovementStory } from "./MovementStory";
import { RouteFigure } from "./RouteFigure";
import { RouteSoundGraph } from "./RouteSoundGraph";
import { SoundprintPlayer } from "./SoundprintPlayer";
import { synthesizeSketchWav } from "./sketchAudio";
import { useAudioClock } from "./useAudioClock";

type StudioScreenProps = {
  fixture: DemoFixture;
  onNavigate: (event: { preventDefault: () => void; currentTarget: { href: string } }) => void;
};

export function StudioScreen({ fixture, onNavigate }: StudioScreenProps) {
  const { result } = fixture;
  const sketchUrl = useMemo(() => {
    const wav = synthesizeSketchWav(result.duration_ms, result.events);
    return URL.createObjectURL(new Blob([wav], { type: "audio/wav" }));
  }, [result]);
  useEffect(() => {
    return () => URL.revokeObjectURL(sketchUrl);
  }, [sketchUrl]);
  const clock = useAudioClock(sketchUrl, result.duration_ms);
  const [generationState, setGenerationState] = useState<GenerationStateId>("fixture");
  return (
    <div className="stack">
      <section className="stack" aria-labelledby="studio-title">
        <h1 id="studio-title">Soundprint</h1>
      </section>
      {generationState === "fixture" ? null : (
        <GenerationStateBody
          state={generationState}
          onShowFixture={() => setGenerationState("fixture")}
        />
      )}
      <div hidden={generationState !== "fixture"}>
        <div className="stack">
          <p className="fixture-banner panel" role="status">
            <strong>Synthetic fixture.</strong> {fixture.purpose}
          </p>
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
          <RouteSoundGraph result={result} timeMs={clock.timeMs} onSeek={clock.seek} />
          <MovementStory
            cards={result.story.cards}
            events={result.events}
            timeMs={clock.timeMs}
            onSeek={clock.seek}
          />
          <section className="panel" aria-labelledby="sponsors-title">
            <h2 id="sponsors-title">Sponsors</h2>
            <ul>
              <li>
                Gemma is the planned open-weight arrangement director. This synthetic fixture did
                not call Gemma.
              </li>
              <li>
                ElevenLabs is the planned Studio Track producer. This synthetic fixture did not call
                ElevenLabs.
              </li>
              <li>Render is the planned public host. This screen is running locally.</li>
            </ul>
          </section>
          <section className="panel" aria-labelledby="provenance-title">
            <h2 id="provenance-title">Provenance</h2>
            <p className="mono">
              Mode {result.mode}. Mapping status: {result.provenance.mapping_status}.
            </p>
            <p>These relationships are intended, not measured.</p>
            {result.warnings.map((warning) => (
              <p key={warning}>{warning}</p>
            ))}
            <p className="muted">{result.quality.summary}</p>
            <p className="muted">{result.provenance.rights_note}</p>
          </section>
        </div>
      </div>
      <StatePicker
        legend="Show generation preview states"
        note="These states are a fixture. None of them is a live Gemma or ElevenLabs generation."
        options={GENERATION_STATES}
        value={generationState}
        onChange={setGenerationState}
      />
      <p>
        <a className="action secondary" href="/" onClick={onNavigate}>
          Start another walk
        </a>
      </p>
    </div>
  );
}
