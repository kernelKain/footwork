export const CONSENT_VERSION = "1";

export const MAX_SAMPLES = 3000;

export const MIN_SAMPLE_GAP_MS = 1000;

export const MAX_ACCURACY_M = 50;

export const DRAFT_TTL_MS = 24 * 60 * 60 * 1000;

export type LocationSample = {
  latitude: number;
  longitude: number;
  accuracyM: number;
  timestampMs: number;
};

export type RecordingGap = {
  startMs: number;
  endMs: number;
  reason: "hidden" | "manual";
  open: boolean;
};

export type MovementStatus = "recording" | "paused" | "ended";

export type MovementDraft = {
  sessionId: string;
  consentVersion: typeof CONSENT_VERSION;
  status: MovementStatus;
  samples: LocationSample[];
  interruptions: RecordingGap[];
  activeMs: number;
  updatedAtMs: number;
};

export type SampleDecision = "accepted" | "invalid" | "inaccurate" | "too_soon" | "full";

export function createMovementDraft(sessionId: string, nowMs: number): MovementDraft {
  return {
    sessionId,
    consentVersion: CONSENT_VERSION,
    status: "recording",
    samples: [],
    interruptions: [],
    activeMs: 0,
    updatedAtMs: nowMs,
  };
}

export function isDraftExpired(updatedAtMs: number, nowMs: number): boolean {
  return nowMs - updatedAtMs > DRAFT_TTL_MS;
}

export function signalFor(accuracyM: number): "clear" | "weak" | "lost" {
  if (!Number.isFinite(accuracyM) || accuracyM > MAX_ACCURACY_M) return "lost";
  if (accuracyM <= 20) return "clear";
  return "weak";
}

export function acceptSample(
  draft: MovementDraft,
  sample: LocationSample,
  nowMs: number,
): { draft: MovementDraft; decision: SampleDecision } {
  if (!isValidSample(sample)) return { draft, decision: "invalid" };
  if (sample.accuracyM > MAX_ACCURACY_M) return { draft, decision: "inaccurate" };
  if (draft.samples.length >= MAX_SAMPLES) return { draft, decision: "full" };
  const last = draft.samples[draft.samples.length - 1];
  if (last && sample.timestampMs < last.timestampMs) return { draft, decision: "invalid" };
  if (last && sample.timestampMs - last.timestampMs < MIN_SAMPLE_GAP_MS) {
    return { draft, decision: "too_soon" };
  }
  return {
    decision: "accepted",
    draft: {
      ...draft,
      samples: [...draft.samples, sample],
      updatedAtMs: nowMs,
    },
  };
}

export function parseMovementDraft(value: unknown): MovementDraft | null {
  if (!value || typeof value !== "object") return null;
  const draft = value as MovementDraft;
  if (draft.consentVersion !== CONSENT_VERSION) return null;
  if (draft.status !== "recording" && draft.status !== "paused" && draft.status !== "ended") {
    return null;
  }
  if (!isId(draft.sessionId) || !isDuration(draft.activeMs) || !isTime(draft.updatedAtMs)) {
    return null;
  }
  if (!Array.isArray(draft.samples) || draft.samples.length > MAX_SAMPLES) return null;
  if (!draft.samples.every(isValidSample)) return null;
  if (!Array.isArray(draft.interruptions) || draft.interruptions.length > 64) return null;
  if (!draft.interruptions.every(isGap)) return null;
  const ordered = draft.samples.every((sample, index) => {
    const previous = draft.samples[index - 1];
    return !previous || sample.timestampMs - previous.timestampMs >= MIN_SAMPLE_GAP_MS;
  });
  if (!ordered) return null;
  return {
    sessionId: draft.sessionId,
    consentVersion: CONSENT_VERSION,
    status: draft.status,
    samples: draft.samples.map((sample) => ({ ...sample })),
    interruptions: draft.interruptions.map((gap) => ({ ...gap })),
    activeMs: draft.activeMs,
    updatedAtMs: draft.updatedAtMs,
  };
}

function isValidSample(value: unknown): value is LocationSample {
  if (!value || typeof value !== "object") return false;
  const sample = value as LocationSample;
  return (
    Number.isFinite(sample.latitude) &&
    sample.latitude >= -90 &&
    sample.latitude <= 90 &&
    Number.isFinite(sample.longitude) &&
    sample.longitude >= -180 &&
    sample.longitude <= 180 &&
    Number.isFinite(sample.accuracyM) &&
    sample.accuracyM >= 0 &&
    isTime(sample.timestampMs)
  );
}

function isGap(value: unknown): value is RecordingGap {
  if (!value || typeof value !== "object") return false;
  const gap = value as RecordingGap;
  return (
    isTime(gap.startMs) &&
    isTime(gap.endMs) &&
    gap.endMs >= gap.startMs &&
    (gap.reason === "hidden" || gap.reason === "manual") &&
    typeof gap.open === "boolean"
  );
}

function isId(value: unknown): value is string {
  return (
    typeof value === "string" && value.length > 0 && value.length <= 80 && !value.includes("\n")
  );
}

function isDuration(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function isTime(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}
