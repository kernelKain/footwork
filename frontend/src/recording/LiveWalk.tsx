import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "../ui/Button";
import { Sheet } from "../ui/Sheet";
import { LandingView } from "./LandingView";
import { RecordingView, type RecordingPhase } from "./RecordingView";
import { createDraftStore } from "./draftStore";
import {
  beginLive,
  cancelLive,
  endLive,
  failSave,
  initialLive,
  markFinished,
  markPaused,
  noteDenied,
  notePosition,
  pauseLive,
  recoverLive,
  resumeLive,
  type LiveModel,
} from "./liveCapture";
import type { LocationSample } from "./movementDraft";
import type { RecordingPort } from "./practicePort";
import { useRunningOffset } from "./useMonotonicClock";

type Navigate = (event: { preventDefault: () => void; currentTarget: { href: string } }) => void;

const WATCH_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  maximumAge: 0,
  timeout: 20000,
};

export function LiveWalk({ onNavigate }: { onNavigate: Navigate }) {
  const store = useMemo(() => createDraftStore(), []);
  const [model, setModel] = useState<LiveModel>(initialLive);
  const [settled, setSettled] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const modelRef = useRef(model);
  const sessionRef = useRef("");
  const readActiveRef = useRef<() => number>(() => 0);
  modelRef.current = model;
  const recording = model.phase === "recording";
  const activeClock = useRunningOffset(recording);
  readActiveRef.current = () =>
    modelRef.current.baseActiveMs + (recording ? activeClock.read() : 0);

  useEffect(() => {
    let cancel = false;
    void store.read(Date.now()).then((saved) => {
      if (cancel) return;
      const recovered = recoverLive(saved);
      if (recovered.draft) sessionRef.current = recovered.draft.sessionId;
      setModel(recovered);
      setSettled(true);
    });
    return () => {
      cancel = true;
    };
  }, [store]);

  useEffect(() => {
    if (!model.watching || !navigator.geolocation) return;
    const watchId = navigator.geolocation.watchPosition(onPosition, onError, WATCH_OPTIONS);
    return () => navigator.geolocation.clearWatch(watchId);

    function onPosition(position: GeolocationPosition) {
      const sample: LocationSample = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracyM: position.coords.accuracy,
        timestampMs: position.timestamp,
      };
      if (!sessionRef.current) sessionRef.current = crypto.randomUUID();
      const next = notePosition(
        modelRef.current,
        sample,
        Date.now(),
        sessionRef.current,
        readActiveRef.current(),
      );
      if (next === modelRef.current) return;
      modelRef.current = next;
      setModel(next);
    }

    function onError(error: GeolocationPositionError) {
      if (error.code !== 1) return;
      const next = noteDenied(modelRef.current);
      modelRef.current = next;
      setModel(next);
    }
  }, [model.watching]);

  useEffect(() => {
    if (!model.draft) return;
    let cancel = false;
    void store.write(model.draft).catch(() => {
      if (cancel) return;
      setModel((current) => {
        const next = failSave(current);
        modelRef.current = next;
        return next;
      });
    });
    return () => {
      cancel = true;
    };
  }, [model.draft, store]);

  useEffect(() => {
    if (model.phase !== "pausing") return;
    const timer = window.setTimeout(() => {
      setModel((current) => {
        const next = markPaused(current);
        modelRef.current = next;
        return next;
      });
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [model.phase]);

  useEffect(() => {
    if (model.phase !== "ending") return;
    const timer = window.setTimeout(() => {
      setModel((current) => {
        const next = markFinished(current);
        modelRef.current = next;
        return next;
      });
    }, 700);
    return () => window.clearTimeout(timer);
  }, [model.phase]);

  const port = useMemo<RecordingPort>(
    () => ({
      mode: "live",
      scenario: "granted",
      checkSupport: () => (navigator.geolocation ? "ok" : "unsupported"),
      explainThenResolve: () => (navigator.onLine ? "granted" : "offline"),
      wakeLockLabel: () => "Screen awake is not held. The phone may still sleep.",
      signalLabel: () => `Signal: ${model.signal}`,
      recoverDraft: () => null,
      saveDraft: () => undefined,
      clearDraft: () => undefined,
      reacquireFix: () => "ready",
    }),
    [model.signal],
  );

  const clocks = {
    activeMs: model.baseActiveMs + (recording ? activeClock.displayMs : 0),
    breakMs: 0,
    currentBreakMs: 0,
    elapsedMs: model.baseActiveMs + (recording ? activeClock.displayMs : 0),
  };

  const apply = (next: LiveModel) => {
    modelRef.current = next;
    setModel(next);
  };

  const reset = () => {
    sessionRef.current = "";
    setSheetOpen(false);
    apply(initialLive());
    void store.clear();
  };

  const begin = () => {
    setSheetOpen(false);
    sessionRef.current = crypto.randomUUID();
    apply(
      beginLive(modelRef.current, navigator.geolocation ? "ok" : "unsupported", navigator.onLine),
    );
  };

  return (
    <>
      {!settled || model.phase === "ready" ? (
        <LandingView
          onStart={() => {
            if (settled) setSheetOpen(true);
          }}
          onNavigate={onNavigate}
        />
      ) : (
        <RecordingView
          phase={model.phase as RecordingPhase}
          clocks={clocks}
          draft={null}
          liveSegmentMs={activeClock.displayMs}
          sampleCount={model.draft?.samples.length ?? 0}
          port={port}
          resumeNote={model.resumeNote}
          saveError={model.saveError}
          onCancel={() => {
            if (model.phase === "resuming") {
              apply(cancelLive(modelRef.current));
              return;
            }
            reset();
          }}
          onPause={() => apply(pauseLive(modelRef.current, readActiveRef.current(), Date.now()))}
          onResume={() => apply(resumeLive(modelRef.current, navigator.onLine))}
          onCancelResume={() => apply(cancelLive(modelRef.current))}
          onEnd={() => apply(endLive(modelRef.current, readActiveRef.current(), Date.now()))}
          onRetry={reset}
          onNavigate={onNavigate}
        />
      )}
      <Sheet
        open={sheetOpen}
        title="Before you walk"
        closeLabel="Not now"
        onClose={() => setSheetOpen(false)}
      >
        <p>
          Footwork will ask this browser for your location and keep the walk on this phone. It does
          not upload a route.
        </p>
        <Button onClick={begin}>Use my location</Button>
      </Sheet>
    </>
  );
}
