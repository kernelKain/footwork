import { useEffect, useMemo, useState } from "react";
import { Sheet } from "../ui/Sheet";
import { Button } from "../ui/Button";
import { LandingView } from "./LandingView";
import { RecordingView, type RecordingPhase } from "./RecordingView";
import {
  activeDurationMs,
  createRecordingDraft,
  manualBreakDurationMs,
  pauseRecording,
  recordVisibilityGap,
  resumeRecording,
  withOpenBreakDuration,
  type PracticeDraft,
} from "./practiceDraft";
import { createPracticePort, readPracticeScenario, resumeFailureLine } from "./practicePort";
import { useRunningOffset } from "./useMonotonicClock";

type Phase = "ready" | RecordingPhase;

const PAUSING_MS = 1000;
const RESUMING_MS = 1200;

type WalkScreenProps = {
  onNavigate: (event: { preventDefault: () => void; currentTarget: { href: string } }) => void;
  onGo: (pathname: string) => void;
};

export function WalkScreen({ onNavigate, onGo }: WalkScreenProps) {
  const port = useMemo(() => createPracticePort(readPracticeScenario()), []);
  const [draft, setDraft] = useState<PracticeDraft | null>(() => port.recoverDraft());
  const [phase, setPhase] = useState<Phase>(draft ? "paused" : "ready");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [resumeNote, setResumeNote] = useState<string | null>(null);
  const activeClock = useRunningOffset(phase === "recording");
  const breakClock = useRunningOffset(
    phase === "pausing" || phase === "paused" || phase === "resuming",
  );

  const breakRunning = phase === "pausing" || phase === "paused" || phase === "resuming";
  const liveBreak = breakRunning ? breakClock.displayMs : 0;
  const activeMs = draft
    ? activeDurationMs(draft) + (phase === "recording" ? activeClock.displayMs : 0)
    : 0;
  const breakMs = draft ? manualBreakDurationMs(draft) + liveBreak : 0;
  const openBreak = draft?.breaks.find((gap) => gap.open);
  const currentBreakMs = breakRunning ? (openBreak?.durationMs ?? 0) + liveBreak : 0;
  const clocks = { activeMs, breakMs, currentBreakMs, elapsedMs: activeMs + breakMs };

  useEffect(() => {
    if (window.location.hash !== "#how-it-works") return;
    document.getElementById("how-it-works")?.scrollIntoView();
  }, []);

  useEffect(() => {
    if (phase !== "checking_location") return;
    const next = port.scenario === "interrupted" ? "interrupted" : "recording";
    const timer = window.setTimeout(() => {
      if (next === "recording") setDraft(createRecordingDraft());
      setPhase(next);
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [phase, port]);

  useEffect(() => {
    if (phase !== "pausing") return;
    const timer = window.setTimeout(() => setPhase("paused"), PAUSING_MS);
    return () => window.clearTimeout(timer);
  }, [phase]);

  useEffect(() => {
    if (phase !== "resuming") return;
    const timer = window.setTimeout(() => {
      const fix = port.reacquireFix();
      if (fix !== "ready") {
        setResumeNote(resumeFailureLine(fix));
        setPhase("paused");
        return;
      }
      const reading = breakClock.read();
      setDraft((current) => {
        if (!current) return current;
        return resumeRecording(current, manualBreakDurationMs(current) + reading);
      });
      port.clearDraft();
      setResumeNote(null);
      setPhase("recording");
    }, RESUMING_MS);
    return () => window.clearTimeout(timer);
  }, [phase, port, breakClock.read]);

  useEffect(() => {
    if (!draft || draft.status !== "paused") return;
    if (phase !== "pausing" && phase !== "paused" && phase !== "resuming") return;
    port.saveDraft(withOpenBreakDuration(draft, manualBreakDurationMs(draft) + breakClock.read()));
  }, [phase, draft, breakClock.displayMs, breakClock.read, port]);

  useEffect(() => {
    if (phase !== "ending") return;
    const timer = window.setTimeout(() => {
      try {
        sessionStorage.setItem("footwork-generation", "run");
      } catch {
        return;
      }
      onGo("/studio");
    }, 700);
    return () => window.clearTimeout(timer);
  }, [phase, onGo]);

  useEffect(() => {
    if (phase !== "recording") return;
    const onHide = () => {
      if (document.visibilityState !== "hidden" || !draft) return;
      recordVisibilityGap(draft);
      port.clearDraft();
      setPhase("interrupted");
    };
    document.addEventListener("visibilitychange", onHide);
    return () => document.removeEventListener("visibilitychange", onHide);
  }, [phase, draft, port]);

  const start = () => {
    if (port.checkSupport() === "unsupported") {
      setPhase("unsupported_browser");
      return;
    }
    setSheetOpen(true);
  };

  const begin = () => {
    setSheetOpen(false);
    const decision = port.explainThenResolve();
    if (decision === "denied") {
      setPhase("permission_denied");
      return;
    }
    if (decision === "offline") {
      setPhase("offline");
      return;
    }
    setPhase("checking_location");
  };

  const reset = () => {
    port.clearDraft();
    setDraft(null);
    setResumeNote(null);
    setSheetOpen(false);
    setPhase("ready");
  };

  const pause = () => {
    const reading = activeClock.read();
    setDraft((current) =>
      current ? pauseRecording(current, activeDurationMs(current) + reading) : current,
    );
    setPhase("pausing");
  };

  const resume = () => {
    setResumeNote(null);
    setPhase("resuming");
  };

  const end = () => {
    port.clearDraft();
    setPhase("ending");
  };

  return (
    <>
      {phase === "ready" ? (
        <LandingView onStart={start} onNavigate={onNavigate} />
      ) : (
        <RecordingView
          phase={phase}
          clocks={clocks}
          draft={draft}
          liveSegmentMs={activeClock.displayMs}
          port={port}
          resumeNote={resumeNote}
          onCancel={reset}
          onPause={pause}
          onResume={resume}
          onCancelResume={() => setPhase("paused")}
          onEnd={end}
          onRetry={reset}
          onNavigate={onNavigate}
        />
      )}
      <Sheet
        open={sheetOpen}
        title="Before this practice walk"
        closeLabel="Not now"
        onClose={() => setSheetOpen(false)}
      >
        <p>
          A real walk asks the browser for your location before it starts. This practice does not
          ask, and it does not save a route.
        </p>
        <Button onClick={begin}>Begin practice walk</Button>
      </Sheet>
    </>
  );
}
