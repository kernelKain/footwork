import { useEffect, useState } from "react";
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
} from "./generationContract";

export function GenerationExperience({
  forcedTimeout,
  onComplete,
  onExample,
  onRetry,
}: {
  forcedTimeout: boolean;
  onComplete: () => void;
  onExample: () => void;
  onRetry: () => void;
}) {
  const [elapsedMs, setElapsedMs] = useState(0);
  const [stageIndex, setStageIndex] = useState(0);
  const [timedOut, setTimedOut] = useState(forcedTimeout);
  const stage = GENERATION_STAGES[stageIndex] ?? GENERATION_STAGES[0];

  useEffect(() => {
    if (forcedTimeout) return;
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
  }, [forcedTimeout, onComplete]);

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
        {formatTime(elapsedMs)}
      </p>
      <p>This practice is not sending your walk anywhere. No location was stored.</p>
      <button type="button" className="ui-button ui-button-secondary" onClick={onExample}>
        Hear the example
      </button>
    </section>
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
