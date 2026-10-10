import { parsePracticeDraft, type PracticeDraft } from "./practiceDraft";

export type PracticeScenario = "granted" | "denied" | "unsupported" | "offline" | "interrupted";

export type PracticeDecision = "granted" | "denied" | "offline";

export type ResumeFix = "ready" | "denied" | "offline" | "unsupported";

export const PRACTICE_DRAFT_KEY = "footwork-practice-draft";

export const PRACTICE_RESUME_KEY = "footwork-practice-resume";

const SCENARIOS: readonly PracticeScenario[] = [
  "granted",
  "denied",
  "unsupported",
  "offline",
  "interrupted",
];

export function readPracticeScenario(): PracticeScenario {
  try {
    const value = window.sessionStorage.getItem("footwork-practice");
    if (SCENARIOS.includes(value as PracticeScenario) && value !== "granted") {
      return value as PracticeScenario;
    }
  } catch {
    return "granted";
  }
  return "granted";
}

export function readPausedDraft(): PracticeDraft | null {
  try {
    const value = window.sessionStorage.getItem(PRACTICE_DRAFT_KEY);
    if (!value) return null;
    return parsePracticeDraft(value);
  } catch {
    return null;
  }
}

export function resumeFailureLine(result: Exclude<ResumeFix, "ready">): string {
  if (result === "denied") {
    return "This site cannot use your location yet. Your walk is still paused.";
  }
  if (result === "offline") {
    return "You appear to be offline. Your walk is still paused.";
  }
  return "This browser cannot record a walk. Your walk is still paused.";
}

/**
 * Practice stand-in used when `footwork-practice` is set.
 * The public page leaves that key unset and uses the live location watch.
 * This object does not call geolocation, Wake Lock, or IndexedDB.
 */
export type RecordingMode = "practice" | "live";

export type RecordingPort = {
  mode: RecordingMode;
  scenario: PracticeScenario;
  checkSupport: () => "ok" | "unsupported";
  explainThenResolve: () => PracticeDecision;
  wakeLockLabel: () => string;
  signalLabel: () => string;
  recoverDraft: () => PracticeDraft | null;
  saveDraft: (draft: PracticeDraft) => void;
  clearDraft: () => void;
  reacquireFix: () => ResumeFix;
};

export function hasPracticeFixture(): boolean {
  try {
    const value = window.sessionStorage.getItem("footwork-practice");
    return SCENARIOS.includes(value as PracticeScenario);
  } catch {
    return false;
  }
}

export function createPracticePort(scenario: PracticeScenario): RecordingPort {
  return {
    mode: "practice",
    scenario,
    checkSupport: () => (scenario === "unsupported" ? "unsupported" : "ok"),
    explainThenResolve: () => {
      if (scenario === "denied") return "denied";
      if (scenario === "offline") return "offline";
      return "granted";
    },
    wakeLockLabel: () =>
      "Screen awake is not held. This is a practice placeholder. The phone may still sleep.",
    signalLabel: () => "Practice signal: clear",
    recoverDraft: () => readPausedDraft(),
    saveDraft: (draft) => {
      if (draft.status !== "paused") return;
      try {
        window.sessionStorage.setItem(PRACTICE_DRAFT_KEY, JSON.stringify(draft));
      } catch {
        return;
      }
    },
    clearDraft: () => {
      try {
        window.sessionStorage.removeItem(PRACTICE_DRAFT_KEY);
      } catch {
        return;
      }
    },
    reacquireFix: () => {
      try {
        const value = window.sessionStorage.getItem(PRACTICE_RESUME_KEY);
        if (value === "denied" || value === "offline" || value === "unsupported") return value;
      } catch {
        return "ready";
      }
      if (scenario === "unsupported") return "unsupported";
      return "ready";
    },
  };
}
