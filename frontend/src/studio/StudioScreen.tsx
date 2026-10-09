import { useCallback, useEffect, useMemo, useState } from "react";
import type { DemoFixture, GenerationMode } from "../contracts/types";
import { Disclosure } from "../ui/Disclosure";
import { StatusChip } from "../ui/StatusChip";
import { GenerationExperience, GenerationRecovery } from "./GenerationExperience";
import {
  markGenerationFinished,
  readGenerationRequest,
  requestGenerationRetry,
  type GenerationErrorCode,
} from "./generationContract";
import { MovementStory } from "./MovementStory";
import { RouteFigure } from "./RouteFigure";
import { RouteSoundGraph } from "./RouteSoundGraph";
import { SoundprintPlayer } from "./SoundprintPlayer";
import { synthesizeSketchWav } from "./sketchAudio";
import { useAudioClock } from "./useAudioClock";

type StudioView =
  | { name: "running"; forcedTimeout: boolean }
  | { name: "error"; code: GenerationErrorCode }
  | { name: "example"; note: "direct" | "practice" | "repeat" };

type StudioScreenProps = {
  fixture: DemoFixture;
  onNavigate: (event: { preventDefault: () => void; currentTarget: { href: string } }) => void;
};

const STORY =
  "The path goes forward, waits, and then continues. The music is meant to follow that shape.";

export function resultLabel(mode: GenerationMode): "Example walk" | "Generated from your walk" {
  if (mode === "synthetic_fixture" || mode === "cached_example") return "Example walk";
  return "Generated from your walk";
}

function initialView(): StudioView {
  const request = readGenerationRequest();
  if (request.kind === "run") return { name: "running", forcedTimeout: false };
  if (request.kind === "error") return { name: "error", code: request.code };
  return { name: "example", note: request.repeat ? "repeat" : "direct" };
}

function clearGenerationRequest(): void {
  try {
    sessionStorage.removeItem("footwork-generation");
  } catch {
    return;
  }
}

export function StudioScreen({ fixture, onNavigate }: StudioScreenProps) {
  const { result } = fixture;
  const [view, setView] = useState<StudioView>(initialView);
  const sketchUrl = useMemo(() => {
    const wav = synthesizeSketchWav(result.duration_ms, result.events);
    return URL.createObjectURL(new Blob([wav], { type: "audio/wav" }));
  }, [result]);
  useEffect(() => {
    return () => URL.revokeObjectURL(sketchUrl);
  }, [sketchUrl]);
  const clock = useAudioClock(sketchUrl, result.duration_ms);
  const showExample = useCallback(() => {
    clearGenerationRequest();
    setView({ name: "example", note: "direct" });
  }, []);
  const finishPractice = useCallback(() => {
    markGenerationFinished();
    setView({ name: "example", note: "practice" });
  }, []);
  const leavePractice = useCallback(() => {
    markGenerationFinished();
    setView({ name: "example", note: "direct" });
  }, []);
  const retry = useCallback(() => {
    requestGenerationRetry();
    setView({ name: "running", forcedTimeout: false });
  }, []);
  const label = resultLabel(result.mode);
  const poly = result.route.points.map((point) => `${point.x * 100},${point.y * 100}`).join(" ");

  return (
    <div className="studio">
      <audio ref={clock.audioRef} src={sketchUrl} preload="auto" aria-hidden="true" />
      {view.name === "running" ? (
        <GenerationExperience
          forcedTimeout={view.forcedTimeout}
          onComplete={finishPractice}
          onExample={leavePractice}
          onRetry={retry}
        />
      ) : null}
      {view.name === "error" ? (
        <GenerationRecovery code={view.code} onExample={showExample} onRetry={retry} />
      ) : null}
      {view.name === "example" ? (
        <div className="studio-layout">
          <div className="studio-stage">
            <section className="studio-hero" aria-labelledby="studio-title">
              <StatusChip label={label} tone="music" />
              <div className="studio-cover" aria-hidden="true">
                <svg viewBox="0 0 100 100">
                  <polyline className="route-path" points={poly} />
                </svg>
              </div>
              <h1 id="studio-title">Corner and pause</h1>
              <p>A corner, a quiet hold, and a quicker stretch.</p>
              <p>This is an example, not a recorded walk.</p>
              {view.note === "practice" ? (
                <p>This practice did not make a new track. You are hearing the example.</p>
              ) : null}
              {view.note === "repeat" ? (
                <p>This practice already finished. You are hearing the example.</p>
              ) : null}
              <SoundprintPlayer
                durationMs={result.duration_ms}
                timeMs={clock.timeMs}
                playing={clock.playing}
                playbackError={clock.playbackError}
                onToggle={clock.toggle}
                onSeek={clock.seek}
                onReplay={clock.replay}
              />
            </section>
            <RouteFigure
              points={result.route.points}
              events={result.events}
              timeMs={clock.timeMs}
            />
          </div>
          <div className="studio-story">
            <RouteSoundGraph result={result} timeMs={clock.timeMs} onSeek={clock.seek} />
            <MovementStory
              chapters={result.chapters}
              durationMs={result.duration_ms}
              timeMs={clock.timeMs}
              summary={STORY}
            />
            <Disclosure title="About this example">
              <p>This example lasts one minute and was made for the page.</p>
              <p>The sound was made in the browser. It is not a studio recording.</p>
              <p>
                The musical changes are planned and have not been heard in a finished recording.
              </p>
            </Disclosure>
          </div>
        </div>
      ) : null}
      <p>
        <a className="ui-button ui-button-secondary" href="/" onClick={onNavigate}>
          Start another walk
        </a>
      </p>
    </div>
  );
}
