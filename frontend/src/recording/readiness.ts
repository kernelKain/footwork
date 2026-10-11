/** Matches backend `MIN_ACTIVE_MS`. The parity test keeps these equal. */
export const MIN_ACTIVE_WALK_MS = 90_000;

export const READINESS_GUIDANCE =
  "Walk for at least 1 min 30 sec of active movement for a reliable Soundprint.";

export const SAVING_STATUS = "Saving your walk on this phone…";

export const SUBMITTING_STATUS = "Walk saved. Turning your movement into music…";

export const SHORT_WALK_WARNING = "This recording may be too short for a reliable Soundprint.";

export function activeWalkIsShort(activeMs: number): boolean {
  return Math.max(0, activeMs) < MIN_ACTIVE_WALK_MS;
}

export function readinessProgress(activeMs: number): string {
  const elapsed = Math.max(0, activeMs);
  if (elapsed >= MIN_ACTIVE_WALK_MS) return "Minimum time reached.";
  return `${clock(elapsed)} of ${clock(MIN_ACTIVE_WALK_MS)} minimum.`;
}

function clock(ms: number): string {
  const total = Math.floor(ms / 1000);
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}
