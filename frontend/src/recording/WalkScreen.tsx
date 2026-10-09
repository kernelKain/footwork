import { useEffect, useMemo, useState } from "react";
import { Sheet } from "../ui/Sheet";
import { Button } from "../ui/Button";
import { LandingView } from "./LandingView";
import { RecordingView } from "./RecordingView";
import { createPracticePort, readPracticeScenario } from "./practicePort";
import { useMonotonicClock } from "./useMonotonicClock";

type Phase =
  | "ready"
  | "checking_location"
  | "recording"
  | "ending"
  | "finished"
  | "permission_denied"
  | "unsupported_browser"
  | "offline"
  | "interrupted";

type WalkScreenProps = {
  onNavigate: (event: { preventDefault: () => void; currentTarget: { href: string } }) => void;
  onGo: (pathname: string) => void;
};

export function WalkScreen({ onNavigate, onGo }: WalkScreenProps) {
  const port = useMemo(() => createPracticePort(readPracticeScenario()), []);
  const [phase, setPhase] = useState<Phase>("ready");
  const [sheetOpen, setSheetOpen] = useState(false);
  const elapsedMs = useMonotonicClock(phase === "recording");

  useEffect(() => {
    port.recoverDraft();
  }, [port]);

  useEffect(() => {
    if (window.location.hash !== "#how-it-works") return;
    document.getElementById("how-it-works")?.scrollIntoView();
  }, []);

  useEffect(() => {
    if (phase !== "checking_location") return;
    const next = port.scenario === "interrupted" ? "interrupted" : "recording";
    const timer = window.setTimeout(() => setPhase(next), 1000);
    return () => window.clearTimeout(timer);
  }, [phase, port]);

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
      if (document.visibilityState === "hidden") setPhase("interrupted");
    };
    document.addEventListener("visibilitychange", onHide);
    return () => document.removeEventListener("visibilitychange", onHide);
  }, [phase]);

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
    setSheetOpen(false);
    setPhase("ready");
  };

  return (
    <>
      {phase === "ready" ? (
        <LandingView onStart={start} onNavigate={onNavigate} />
      ) : (
        <RecordingView
          phase={phase}
          elapsedMs={elapsedMs}
          port={port}
          onCancel={reset}
          onEnd={() => setPhase("ending")}
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
