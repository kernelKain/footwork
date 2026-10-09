export type PracticeScenario = "granted" | "denied" | "unsupported" | "offline" | "interrupted";

export type PracticeDecision = "granted" | "denied" | "offline";

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

/**
 * Phase 1 practice stand-in for the recording adapter.
 * Phase 2 replaces these methods with geolocation, Wake Lock, and IndexedDB.
 * This object does not call those browser APIs.
 */
export type RecordingPort = {
  scenario: PracticeScenario;
  checkSupport: () => "ok" | "unsupported";
  explainThenResolve: () => PracticeDecision;
  wakeLockLabel: () => string;
  signalLabel: () => string;
  recoverDraft: () => null;
};

export function createPracticePort(scenario: PracticeScenario): RecordingPort {
  return {
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
    recoverDraft: () => null,
  };
}
