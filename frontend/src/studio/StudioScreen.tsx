import { useCallback, useEffect, useMemo, useState } from "react";
import type { DemoFixture, GenerationMode, SoundprintResult } from "../contracts/types";
import { Disclosure } from "../ui/Disclosure";
import { StatusChip } from "../ui/StatusChip";
import { GenerationExperience, GenerationRecovery, LiveJobPanel } from "./GenerationExperience";
import {
  markGenerationFinished,
  readGenerationRequest,
  requestGenerationRetry,
  type GenerationErrorCode,
} from "./generationContract";
import { JourneyComposition } from "./JourneyComposition";
import { JourneyGlance } from "./JourneyGlance";
import { clarityLine, drawnSpans, gapLines, speedLine } from "./journeyModel";
import { MomentCards } from "./MomentCards";
import { MovementRibbon } from "./MovementRibbon";
import { MovementStory } from "./MovementStory";
import { RouteFigure } from "./RouteFigure";
import { SoundprintPlayer } from "./SoundprintPlayer";
import { synthesizeSketchWav } from "./sketchAudio";
import { useAudioClock } from "./useAudioClock";

type StudioView =
  | { name: "running"; forcedTimeout: boolean; live: boolean }
  | { name: "error"; code: GenerationErrorCode }
  | { name: "example"; note: "direct" | "practice" | "repeat" }
  | { name: "piece"; result: SoundprintResult; audioUrl: string | null };

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
  if (request.kind === "live") return { name: "running", forcedTimeout: false, live: true };
  if (request.kind === "run") return { name: "running", forcedTimeout: false, live: false };
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
  const displayed = view.name === "piece" ? view.result : result;
  const sketchUrl = useMemo(() => {
    const wav = synthesizeSketchWav(displayed.duration_ms, displayed.events);
    return URL.createObjectURL(new Blob([wav], { type: "audio/wav" }));
  }, [displayed]);
  useEffect(() => {
    return () => URL.revokeObjectURL(sketchUrl);
  }, [sketchUrl]);
  const playbackUrl = view.name === "piece" && view.audioUrl ? view.audioUrl : sketchUrl;
  const clock = useAudioClock(playbackUrl, displayed.duration_ms);
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
    setView({ name: "running", forcedTimeout: false, live: false });
  }, []);
  const showPiece = useCallback((piece: SoundprintResult, audioUrl: string | null) => {
    markGenerationFinished();
    setView({ name: "piece", result: piece, audioUrl });
  }, []);
  const failLive = useCallback((code: GenerationErrorCode) => {
    setView({ name: "error", code });
  }, []);
  const generated = view.name === "piece";
  const label = resultLabel(displayed.mode);
  const coverSpans = drawnSpans(displayed.route.points, displayed.movement_summary);

  return (
    <div className="studio">
      <audio ref={clock.audioRef} src={playbackUrl} preload="auto" aria-hidden="true" />
      {view.name === "running" && view.live ? (
        <LiveJobPanel onPiece={showPiece} onError={failLive} onExample={leavePractice} />
      ) : null}
      {view.name === "running" && !view.live ? (
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
      {view.name === "example" || view.name === "piece" ? (
        <div className="studio-layout">
          <div className="studio-stage">
            <section className="studio-hero" aria-labelledby="studio-title">
              <StatusChip label={label} tone="music" />
              <div className="studio-cover" aria-hidden="true">
                <svg viewBox="0 0 100 100">
                  {coverSpans.map((span) =>
                    span.kind === "segment" ? (
                      <polyline
                        key={span.id}
                        className="route-path cover-signature"
                        data-pace={span.pace}
                        points={span.points}
                        pathLength={100}
                      />
                    ) : (
                      <polyline key={span.id} className="route-gap" points={span.points} />
                    ),
                  )}
                </svg>
              </div>
              <h1 id="studio-title">{generated ? "Your Soundprint" : "Corner and pause"}</h1>
              {generated ? (
                <p>
                  {displayed.mode === "studio_live"
                    ? "This track was recorded from your walk."
                    : "This is a simpler version made from your walk."}
                </p>
              ) : (
                <>
                  <p>A corner, a quiet hold, and a quicker stretch.</p>
                  <p>This is an example, not a recorded walk.</p>
                </>
              )}
              {view.name === "example" && view.note === "practice" ? (
                <p>This practice did not make a new track. You are hearing the example.</p>
              ) : null}
              {view.name === "example" && view.note === "repeat" ? (
                <p>This practice already finished. You are hearing the example.</p>
              ) : null}
              <SoundprintPlayer
                durationMs={displayed.duration_ms}
                timeMs={clock.timeMs}
                playing={clock.playing}
                playbackError={clock.playbackError}
                onToggle={clock.toggle}
                onSeek={clock.seek}
                onReplay={clock.replay}
              />
            </section>
            <JourneyGlance summary={displayed.movement_summary} />
            <RouteFigure
              points={displayed.route.points}
              events={displayed.events}
              summary={displayed.movement_summary}
              timeMs={clock.timeMs}
              playing={clock.playing}
              onSeek={clock.seek}
              title={generated ? "Your route" : "Example route"}
            />
            <MovementRibbon
              summary={displayed.movement_summary}
              chapters={displayed.chapters}
              events={displayed.events}
              durationMs={displayed.duration_ms}
              timeMs={clock.timeMs}
            />
            <MomentCards events={displayed.events} timeMs={clock.timeMs} onSeek={clock.seek} />
            <JourneyComposition summary={displayed.movement_summary} />
            <MovementStory
              chapters={displayed.chapters}
              durationMs={displayed.duration_ms}
              timeMs={clock.timeMs}
              summary={STORY}
            />
            <Disclosure title={generated ? "About this piece" : "About this example"}>
              <p>{clarityLine(displayed.movement_summary)}</p>
              {gapLines(displayed.movement_summary).map((line) => (
                <p key={line}>{line}</p>
              ))}
              <p>{speedLine(displayed.movement_summary)}</p>
              {generated ? (
                <p>
                  {displayed.mode === "studio_live"
                    ? "A studio recorded this track from your walk."
                    : "A studio did not record this simpler version."}
                </p>
              ) : (
                <>
                  <p>This is an example, not a recorded walk.</p>
                  <p>The sound was made in the browser. It is not a studio recording.</p>
                  <p>
                    The musical changes are planned and have not been heard in a finished recording.
                  </p>
                </>
              )}
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
