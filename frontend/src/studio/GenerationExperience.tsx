import { useEffect, useState } from "react";
import type { SoundprintResult } from "../contracts/types";
import { readLiveAudio, readLiveJob, readStoredJob } from "./liveJob";
import { runWhileVisible } from "../ui/motionGuard";
import { formatTime } from "./formatTime";
import { GenerationFigure } from "./GenerationFigure";
import {
  GENERATION_ERROR_COPY,
  GENERATION_STAGES,
  RETRYABLE_GENERATION_ERRORS,
  isGenerationTimeout,
  markGenerationFinished,
  practiceRunComplete,
  stageIndexForElapsed,
  type GenerationErrorCode,
  type GenerationStageId,
} from "./generationContract";

export function GenerationExperience({
  forcedTimeout,
  live = false,
  stageId,
  reportedElapsedMs = 0,
  onComplete,
  onExample,
  onRetry,
}: {
  forcedTimeout: boolean;
  live?: boolean;
  stageId?: GenerationStageId;
  reportedElapsedMs?: number;
  onComplete: () => void;
  onExample: () => void;
  onRetry: () => void;
}) {
  const [elapsedMs, setElapsedMs] = useState(0);
  const [stageIndex, setStageIndex] = useState(0);
  const [timedOut, setTimedOut] = useState(forcedTimeout);
  const reported = GENERATION_STAGES.find((item) => item.id === stageId);
  const stage =
    live && reported ? reported : (GENERATION_STAGES[stageIndex] ?? GENERATION_STAGES[0]);
  const shownElapsed = live ? reportedElapsedMs : elapsedMs;

  useEffect(() => {
    if (forcedTimeout || live) return;
    const started = performance.now();
    return runWhileVisible((now) => {
      const elapsed = now - started;
      if (isGenerationTimeout(elapsed, false)) {
        setTimedOut(true);
        return false;
      }
      if (practiceRunComplete(elapsed)) {
        markGenerationFinished();
        onComplete();
        return false;
      }
      const second = Math.floor(elapsed / 1000);
      setElapsedMs((current) => (Math.floor(current / 1000) === second ? current : elapsed));
      setStageIndex((current) => {
        const next = stageIndexForElapsed(elapsed);
        return current === next ? current : next;
      });
      return true;
    });
  }, [forcedTimeout, live, onComplete]);

  if (timedOut) {
    return <GenerationRecovery code="timed_out" onExample={onExample} onRetry={onRetry} />;
  }

  return (
    <section className="generation-panel" aria-labelledby="generation-title">
      <h1 id="generation-title">Making your Soundprint</h1>
      <GenerationFigure stageId={stage.id} />
      <p className="generation-stage" key={stage.id}>
        {stage.copy}
      </p>
      <p className="ui-visually-hidden" role="status">
        {stage.copy}
      </p>
      <p className="studio-clock">
        <span className="ui-visually-hidden">Time spent making the piece</span>
        {formatTime(shownElapsed)}
      </p>
      {live ? null : (
        <p>This practice is not sending your walk anywhere. No location was stored.</p>
      )}
      <button type="button" className="ui-button ui-button-secondary" onClick={onExample}>
        Hear the example
      </button>
    </section>
  );
}

export function LiveJobPanel({
  onPiece,
  onError,
  onExample,
}: {
  onPiece: (result: SoundprintResult, audioUrl: string | null) => void;
  onError: (code: GenerationErrorCode) => void;
  onExample: () => void;
}) {
  const [stageId, setStageId] = useState<GenerationStageId>("reading_walk");
  const [elapsedMs, setElapsedMs] = useState(0);

  useEffect(() => {
    const job = readStoredJob();
    if (!job) {
      onError("timed_out");
      return;
    }
    let cancel = false;
    const started = performance.now();
    const poll = () => {
      if (cancel) return;
      if (isGenerationTimeout(performance.now() - started, false)) {
        onError("timed_out");
        return;
      }
      void readLiveJob(job)
        .then(async (snapshot) => {
          if (cancel) return;
          setStageId(snapshot.stage);
          setElapsedMs(snapshot.elapsedMs);
          if (snapshot.status === "interrupted" || snapshot.status === "expired") {
            onError("timed_out");
            return;
          }
          if (
            snapshot.errorCode &&
            snapshot.status !== "ready" &&
            snapshot.status !== "dispatching"
          ) {
            onError(snapshot.errorCode);
            return;
          }
          if (snapshot.status === "ready") {
            if (!snapshot.result) {
              onError("timed_out");
              return;
            }
            const audioUrl = await readLiveAudio(job, snapshot.result.audio_format ?? "audio/wav");
            if (!cancel) onPiece(snapshot.result, audioUrl);
            return;
          }
          window.setTimeout(poll, 2000);
        })
        .catch(() => {
          if (!cancel) window.setTimeout(poll, 2000);
        });
    };
    poll();
    return () => {
      cancel = true;
    };
  }, [onError, onPiece]);

  return (
    <GenerationExperience
      live
      stageId={stageId}
      reportedElapsedMs={elapsedMs}
      forcedTimeout={false}
      onComplete={() => undefined}
      onExample={onExample}
      onRetry={() => undefined}
    />
  );
}

export function GenerationRecovery({
  code,
  onExample,
  onRetry,
}: {
  code: GenerationErrorCode;
  onExample: () => void;
  onRetry: () => void;
}) {
  const retry = RETRYABLE_GENERATION_ERRORS.has(code);
  return (
    <section className="generation-panel" role="alert" aria-labelledby="generation-error-title">
      <h1 id="generation-error-title">The piece is not ready</h1>
      <p>{GENERATION_ERROR_COPY[code]}</p>
      <div className="actions">
        {retry ? (
          <button type="button" className="ui-button ui-button-primary" onClick={onRetry}>
            Try again
          </button>
        ) : (
          <a className="ui-button ui-button-primary" href="/">
            Start again
          </a>
        )}
        <button type="button" className="ui-button ui-button-secondary" onClick={onExample}>
          Hear the example
        </button>
      </div>
    </section>
  );
}
