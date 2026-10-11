import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "../ui/Button";
import { Sheet } from "../ui/Sheet";
import { LandingView } from "./LandingView";
import { RecordingView, type RecordingPhase } from "./RecordingView";
import { createDraftStore } from "./draftStore";
import {
  beginLive,
  cancelLive,
  continueLive,
  endLive,
  failSave,
  initialLive,
  markFinished,
  markPaused,
  noteDenied,
  noteHidden,
  notePosition,
  pauseLive,
  recoverLive,
  resumeLive,
  type LiveModel,
} from "./liveCapture";
import type { LocationSample } from "./movementDraft";
import type { RecordingPort } from "./practicePort";
import { SHORT_WALK_WARNING, activeWalkIsShort } from "./readiness";
import { useRunningOffset } from "./useMonotonicClock";
import { submitFinishedWalk } from "../studio/liveJob";

type Navigate = (event: { preventDefault: () => void; currentTarget: { href: string } }) => void;

const WATCH_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  maximumAge: 0,
  timeout: 20000,
};

/** Coordinate live location capture, draft persistence, and submission after saving. */
export function LiveWalk({
  onNavigate,
  onGo,
}: {
  onNavigate: Navigate;
  onGo: (pathname: string) => void;
}) {
  const store = useMemo(() => createDraftStore(), []);
  const [model, setModel] = useState<LiveModel>(initialLive);
  const [settled, setSettled] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [wakeHeld, setWakeHeld] = useState(false);
  const [endedDraftSaved, setEndedDraftSaved] = useState(false);
  const [shortConfirm, setShortConfirm] = useState(false);
  const modelRef = useRef(model);
  const sessionRef = useRef("");
  const sentRef = useRef(false);
  const endingRef = useRef(false);
  const shortConfirmRef = useRef(false);
  const readActiveRef = useRef<() => number>(() => 0);
  modelRef.current = model;
  const recording = model.phase === "recording";
  const activeClock = useRunningOffset(recording);
  readActiveRef.current = () =>
    Math.max(0, modelRef.current.baseActiveMs + (recording ? activeClock.read() : 0));

  useEffect(() => {
    let cancel = false;
    void store.read(Date.now()).then((saved) => {
      if (cancel) return;
      const recovered = recoverLive(saved);
      setEndedDraftSaved(saved?.status === "ended");
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
    const onVisibility = () => {
      if (document.visibilityState !== "hidden") return;
      const next = noteHidden(modelRef.current, readActiveRef.current(), Date.now());
      if (next === modelRef.current) return;
      modelRef.current = next;
      setModel(next);
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  useEffect(() => {
    if (model.phase !== "recording" || !navigator.wakeLock) {
      setWakeHeld(false);
      return;
    }
    let cancel = false;
    let sentinel: WakeLockSentinel | null = null;
    void navigator.wakeLock
      .request("screen")
      .then((next) => {
        if (cancel) {
          void next.release();
          return;
        }
        sentinel = next;
        setWakeHeld(true);
        next.addEventListener("release", () => {
          if (!cancel) setWakeHeld(false);
        });
      })
      .catch(() => {
        if (!cancel) setWakeHeld(false);
      });
    return () => {
      cancel = true;
      setWakeHeld(false);
      if (sentinel) void sentinel.release();
    };
  }, [model.phase]);

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
    if (model.phase !== "finished" || !model.draft || sentRef.current) return;
    sentRef.current = true;
    const draft = model.draft;
    void submitFinishedWalk(draft)
      .catch(() => "timed_out" as const)
      .then(async (outcome) => {
        if (outcome === "live") {
          try {
            await store.clear();
          } catch {
            // The phone still has the ended draft. Delete saved walk can remove it.
          }
        } else {
          try {
            sessionStorage.setItem("footwork-generation", outcome);
          } catch {
            return;
          }
        }
        onGo("/studio");
      });
  }, [model.phase, model.draft, onGo, store]);

  useEffect(() => {
    if (model.phase !== "ending" || !model.draft) return;
    let cancel = false;
    const draft = model.draft;
    void store.write(draft).then(
      () => {
        if (cancel) return;
        setModel((current) => {
          if (current.phase !== "ending") return current;
          const next = markFinished(current);
          modelRef.current = next;
          return next;
        });
      },
      () => {
        if (cancel) return;
        setModel((current) => {
          const next = failSave(current);
          modelRef.current = next;
          return next;
        });
      },
    );
    return () => {
      cancel = true;
    };
  }, [model.phase, model.draft, store]);

  const port = useMemo<RecordingPort>(
    () => ({
      mode: "live",
      scenario: "granted",
      checkSupport: () => (navigator.geolocation ? "ok" : "unsupported"),
      explainThenResolve: () => (navigator.onLine ? "granted" : "offline"),
      wakeLockLabel: () =>
        wakeHeld
          ? "This screen is being kept on. Recording stops if the phone locks or this tab is hidden."
          : "Screen awake is not held. Recording stops if the phone locks or this tab is hidden.",
      signalLabel: () => `Signal: ${model.signal}`,
      recoverDraft: () => null,
      saveDraft: () => undefined,
      clearDraft: () => undefined,
      reacquireFix: () => "ready",
    }),
    [model.signal, wakeHeld],
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

  /** Reset recording and confirmation state, then request deletion of the saved draft. */
  const reset = () => {
    sessionRef.current = "";
    endingRef.current = false;
    shortConfirmRef.current = false;
    setShortConfirm(false);
    setSheetOpen(false);
    apply(initialLive());
    void store.clear();
  };

  /** End the current walk once and close any short-walk confirmation. */
  const finishWalk = () => {
    if (endingRef.current) return;
    const current = modelRef.current;
    if (current.phase === "ending" || current.phase === "finished") return;
    endingRef.current = true;
    shortConfirmRef.current = false;
    setShortConfirm(false);
    apply(endLive(current, readActiveRef.current(), Date.now()));
  };

  /** Ask for confirmation below the active-time minimum; otherwise finish the walk. */
  const requestEnd = () => {
    if (endingRef.current || shortConfirmRef.current) return;
    const current = modelRef.current;
    if (current.phase === "ending" || current.phase === "finished") return;
    if (activeWalkIsShort(readActiveRef.current())) {
      shortConfirmRef.current = true;
      setShortConfirm(true);
      return;
    }
    finishWalk();
  };

  /** Dismiss the short-walk confirmation without ending the recording. */
  const keepWalking = () => {
    shortConfirmRef.current = false;
    setShortConfirm(false);
  };

  /** Delete the ended draft and hide its deletion control after storage succeeds. */
  const discardEndedWalk = () => {
    void store.clear().then(() => setEndedDraftSaved(false));
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
          onDeleteSavedWalk={
            settled && endedDraftSaved && model.phase === "ready" ? discardEndedWalk : undefined
          }
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
          onContinue={() => apply(continueLive(modelRef.current, navigator.onLine))}
          onCancelResume={() => apply(cancelLive(modelRef.current))}
          onEnd={requestEnd}
          onRetry={reset}
          onNavigate={onNavigate}
        />
      )}
      <Sheet
        open={shortConfirm}
        title="This walk may be too short"
        closeLabel="Keep walking"
        onClose={keepWalking}
      >
        <p>{SHORT_WALK_WARNING}</p>
        <Button variant="destructive" onClick={finishWalk}>
          End walk anyway
        </Button>
      </Sheet>
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
