import {
  acceptSample,
  createMovementDraft,
  signalFor,
  type LocationSample,
  type MovementDraft,
} from "./movementDraft";

export type LivePhase =
  | "ready"
  | "checking_location"
  | "recording"
  | "pausing"
  | "paused"
  | "resuming"
  | "ending"
  | "finished"
  | "permission_denied"
  | "unsupported_browser"
  | "offline";

export type LiveModel = {
  phase: LivePhase;
  draft: MovementDraft | null;
  watching: boolean;
  signal: "clear" | "weak" | "lost";
  baseActiveMs: number;
  resumeNote: string | null;
  saveError: string | null;
};

const STARTABLE = new Set<LivePhase>([
  "ready",
  "permission_denied",
  "unsupported_browser",
  "offline",
  "finished",
]);

export function initialLive(): LiveModel {
  return {
    phase: "ready",
    draft: null,
    watching: false,
    signal: "lost",
    baseActiveMs: 0,
    resumeNote: null,
    saveError: null,
  };
}

export function recoverLive(saved: MovementDraft | null): LiveModel {
  if (!saved || saved.status === "ended") return initialLive();
  return {
    phase: saved.status === "paused" ? "paused" : "recording",
    draft: saved,
    watching: saved.status === "recording",
    signal: "lost",
    baseActiveMs: saved.activeMs,
    resumeNote: null,
    saveError: null,
  };
}

export function beginLive(
  state: LiveModel,
  support: "ok" | "unsupported",
  online: boolean,
): LiveModel {
  if (!STARTABLE.has(state.phase)) return state;
  if (support === "unsupported") return { ...initialLive(), phase: "unsupported_browser" };
  if (!online) return { ...initialLive(), phase: "offline" };
  return { ...initialLive(), phase: "checking_location", watching: true };
}

export function notePosition(
  state: LiveModel,
  sample: LocationSample,
  nowMs: number,
  sessionId: string,
  activeMs: number,
): LiveModel {
  if (!state.watching) return state;
  const signal = signalFor(sample.accuracyM);
  if (state.phase === "checking_location") {
    const opened = acceptSample(createMovementDraft(sessionId, nowMs), sample, nowMs);
    if (opened.decision !== "accepted") return { ...state, signal };
    return {
      ...state,
      phase: "recording",
      signal,
      baseActiveMs: 0,
      draft: { ...opened.draft, activeMs },
    };
  }
  if (state.phase === "resuming" && state.draft) {
    const accepted = acceptSample({ ...state.draft, status: "recording" }, sample, nowMs);
    if (accepted.decision !== "accepted") return { ...state, signal };
    return {
      ...state,
      phase: "recording",
      signal,
      resumeNote: null,
      draft: { ...accepted.draft, activeMs, updatedAtMs: nowMs },
    };
  }
  if (state.phase === "recording" && state.draft) {
    const accepted = acceptSample(state.draft, sample, nowMs);
    if (accepted.decision !== "accepted") {
      if (state.signal === signal) return state;
      return { ...state, signal };
    }
    return {
      ...state,
      signal,
      draft: { ...accepted.draft, activeMs, updatedAtMs: nowMs },
    };
  }
  return state;
}

export function noteDenied(state: LiveModel): LiveModel {
  if (state.phase === "resuming") {
    return {
      ...state,
      phase: "paused",
      watching: false,
      resumeNote: "This site cannot use your location yet. Your walk is still paused.",
    };
  }
  if (state.phase !== "checking_location") return state;
  return { ...initialLive(), phase: "permission_denied" };
}

export function pauseLive(state: LiveModel, activeMs: number, nowMs: number): LiveModel {
  if (state.phase !== "recording" || !state.draft) return state;
  return {
    ...state,
    phase: "pausing",
    watching: false,
    baseActiveMs: activeMs,
    draft: { ...state.draft, status: "paused", activeMs, updatedAtMs: nowMs },
  };
}

export function markPaused(state: LiveModel): LiveModel {
  if (state.phase !== "pausing") return state;
  return { ...state, phase: "paused", watching: false };
}

export function resumeLive(state: LiveModel, online: boolean): LiveModel {
  if (state.phase !== "paused" || !state.draft) return state;
  if (!online) {
    return {
      ...state,
      watching: false,
      resumeNote: "You appear to be offline. Your walk is still paused.",
    };
  }
  return { ...state, phase: "resuming", watching: true, resumeNote: null };
}

export function endLive(state: LiveModel, activeMs: number, nowMs: number): LiveModel {
  if (!state.draft) return { ...state, watching: false, phase: "finished" };
  if (state.phase !== "recording" && state.phase !== "paused" && state.phase !== "pausing") {
    return state;
  }
  return {
    ...state,
    phase: "ending",
    watching: false,
    baseActiveMs: activeMs,
    draft: { ...state.draft, status: "ended", activeMs, updatedAtMs: nowMs },
  };
}

export function markFinished(state: LiveModel): LiveModel {
  if (state.phase !== "ending") return state;
  return { ...state, phase: "finished", watching: false };
}

export function cancelLive(state: LiveModel): LiveModel {
  if (state.phase === "checking_location" || state.phase === "resuming") {
    return state.draft && state.phase === "resuming"
      ? { ...state, phase: "paused", watching: false }
      : initialLive();
  }
  return initialLive();
}

export function failSave(state: LiveModel): LiveModel {
  return { ...state, saveError: "This walk could not be saved on this phone." };
}
