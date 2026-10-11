import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { DemoFixture, GenerationMode, SoundprintResult } from "../contracts/types";
import { createDraftStore } from "../recording/draftStore";
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
import { JourneyStage } from "./JourneyStage";
import { clarityLine, drawnSpans, gapLines, nowPlayingLine, speedLine } from "./journeyModel";
import { MomentCards } from "./MomentCards";
import { MovementRibbon } from "./MovementRibbon";
import { MiniPlayer, playerSound, SoundprintPlayer } from "./SoundprintPlayer";
import { shareUrl } from "./liveJob";
import { synthesizeSketchWav } from "./sketchAudio";
import { useAudioClock } from "./useAudioClock";

type StudioView =
  | { name: "running"; forcedTimeout: boolean; live: boolean }
  | { name: "error"; code: GenerationErrorCode }
  | { name: "example"; note: "direct" | "practice" | "repeat" }
  | { name: "piece"; result: SoundprintResult; audioUrl: string | null };

type OpenedPiece = { result: SoundprintResult; audioUrl: string | null };

type StudioScreenProps = {
  fixture: DemoFixture;
  onNavigate: (event: { preventDefault: () => void; currentTarget: { href: string } }) => void;
  opened?: OpenedPiece;
};

const STORY =
  "The path goes forward, waits, and then continues. The music is meant to follow that shape.";

function studioTitle(shared: boolean, generated: boolean): string {
  if (shared) return "Shared Soundprint";
  if (generated) return "Your Soundprint";
  return "Corner and pause";
}

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

export function StudioScreen({ fixture, onNavigate, opened }: StudioScreenProps) {
  const { result } = fixture;
  const [view, setView] = useState<StudioView>(() =>
    opened ? { name: "piece", result: opened.result, audioUrl: opened.audioUrl } : initialView(),
  );
  const [shareToken, setShareToken] = useState<string | null>(null);
  const [endedDraftSaved, setEndedDraftSaved] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [heroAway, setHeroAway] = useState(false);
  const heroPlayerRef = useRef<HTMLDivElement>(null);
  const drafts = useMemo(() => createDraftStore(), []);
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
  const showPiece = useCallback(
    (piece: SoundprintResult, audioUrl: string | null, token: string | null) => {
      markGenerationFinished();
      setShareToken(token);
      setView({ name: "piece", result: piece, audioUrl });
    },
    [],
  );
  const failLive = useCallback((code: GenerationErrorCode) => {
    setView({ name: "error", code });
  }, []);
  useEffect(() => {
    if (view.name !== "error") {
      setEndedDraftSaved(false);
      return;
    }
    let cancel = false;
    void drafts.read(Date.now()).then((saved) => {
      if (!cancel) setEndedDraftSaved(saved?.status === "ended");
    });
    return () => {
      cancel = true;
    };
  }, [drafts, view.name]);
  const deleteSavedWalk = useCallback(() => {
    void drafts.clear().then(() => setEndedDraftSaved(false));
  }, [drafts]);
  const generated = view.name === "piece";
  const label = resultLabel(displayed.mode);
  const coverSpans = drawnSpans(displayed.route.points, displayed.movement_summary);
  const playingLine = nowPlayingLine(
    displayed.chapters,
    displayed.events,
    displayed.duration_ms,
    clock.timeMs,
  );
  const showingResult = view.name === "example" || view.name === "piece";
  useEffect(() => {
    const node = heroPlayerRef.current;
    if (!node || !showingResult) return;
    const observer = new IntersectionObserver(
      ([entry]) => setHeroAway(entry.intersectionRatio === 0),
      { threshold: [0, 0.01] },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [showingResult, playbackUrl]);

  return (
    <div className={clock.playing ? "studio is-playing" : "studio"}>
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
        <GenerationRecovery
          code={view.code}
          onExample={showExample}
          onRetry={retry}
          onDeleteSavedWalk={endedDraftSaved ? deleteSavedWalk : undefined}
        />
      ) : null}
      {showingResult ? (
        <>
          <div className="studio-layout studio-result">
            <div className="studio-stage">
              <section className="studio-hero" aria-labelledby="studio-title">
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
                <div className="studio-identity">
                  <StatusChip label={label} tone="music" />
                  <h1 id="studio-title">{studioTitle(Boolean(opened), generated)}</h1>
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
                  <p>The displayed route is abstracted and contains no coordinates.</p>
                  {opened ? (
                    <p>
                      Someone sent you this Soundprint. The link does not contain the walk&apos;s
                      location.
                    </p>
                  ) : null}
                  {view.name === "example" && view.note === "practice" ? (
                    <p>This practice did not make a new track. You are hearing the example.</p>
                  ) : null}
                  {view.name === "example" && view.note === "repeat" ? (
                    <p>This practice already finished. You are hearing the example.</p>
                  ) : null}
                  <div ref={heroPlayerRef}>
                    <SoundprintPlayer
                      durationMs={displayed.duration_ms}
                      timeMs={clock.timeMs}
                      playing={clock.playing}
                      playbackError={clock.playbackError}
                      onToggle={clock.toggle}
                      onSeek={clock.seek}
                      onReplay={clock.replay}
                      sound={playerSound(generated, displayed.mode)}
                    />
                  </div>
                  {shareToken && !opened ? <ShareLink token={shareToken} /> : null}
                </div>
              </section>
              <JourneyGlance summary={displayed.movement_summary} />
              <JourneyStage
                points={displayed.route.points}
                events={displayed.events}
                summary={displayed.movement_summary}
                chapters={displayed.chapters}
                durationMs={displayed.duration_ms}
                timeMs={clock.timeMs}
                playing={clock.playing}
                story={STORY}
                routeTitle={generated ? "Your route" : "Example route"}
                selectedId={selectedEventId}
                onSeek={clock.seek}
                onSelect={setSelectedEventId}
              />
              <MomentCards
                events={displayed.events}
                summary={displayed.movement_summary}
                timeMs={clock.timeMs}
                selectedId={selectedEventId}
                onSeek={clock.seek}
                onSelect={setSelectedEventId}
              />
              <MovementRibbon
                summary={displayed.movement_summary}
                chapters={displayed.chapters}
                events={displayed.events}
                durationMs={displayed.duration_ms}
                timeMs={clock.timeMs}
              />
              <JourneyComposition summary={displayed.movement_summary} />
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
                      The musical changes are planned and have not been heard in a finished
                      recording.
                    </p>
                  </>
                )}
              </Disclosure>
            </div>
          </div>
          {heroAway ? (
            <MiniPlayer
              timeMs={clock.timeMs}
              durationMs={displayed.duration_ms}
              playing={clock.playing}
              nowPlaying={playingLine}
              onToggle={clock.toggle}
            />
          ) : null}
        </>
      ) : null}
      <p>
        <a className="ui-button ui-button-secondary" href="/" onClick={onNavigate}>
          Start another walk
        </a>
      </p>
    </div>
  );
}

function ShareLink({ token }: { token: string }) {
  const url = shareUrl(token);
  const [copied, setCopied] = useState(false);
  return (
    <div className="share-link">
      <p>
        Anyone with this link can open this Soundprint for about an hour. It does not contain your
        location, and it cannot delete the walk.
      </p>
      <input
        readOnly
        value={url}
        aria-label="Share link"
        onFocus={(event) => event.currentTarget.select()}
      />
      <button
        type="button"
        className="ui-button ui-button-secondary"
        onClick={() => {
          void navigator.clipboard.writeText(url).then(
            () => setCopied(true),
            () => setCopied(false),
          );
        }}
      >
        {copied ? "Link copied" : "Copy link"}
      </button>
    </div>
  );
}
