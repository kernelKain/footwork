import { validateSoundprintResult } from "../contracts/validate";
import type { SoundprintResult } from "../contracts/types";
import { CONSENT_VERSION, type MovementDraft } from "../recording/movementDraft";
import {
  GENERATION_ERRORS,
  type GenerationErrorCode,
  type GenerationStageId,
} from "./generationContract";

const STORAGE_KEY = "footwork-live-job";

export type StoredJob = { jobId: string; jobKey: string };

export type LiveSnapshot = {
  status: string;
  stage: GenerationStageId;
  elapsedMs: number;
  mode: string | null;
  errorCode: GenerationErrorCode | null;
  result: SoundprintResult | null;
};

export function readStoredJob(): StoredJob | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredJob>;
    if (typeof parsed.jobId !== "string" || typeof parsed.jobKey !== "string") return null;
    return { jobId: parsed.jobId, jobKey: parsed.jobKey };
  } catch {
    return null;
  }
}

export async function submitFinishedWalk(
  draft: MovementDraft,
): Promise<"live" | GenerationErrorCode> {
  const jobKey = randomKey();
  const response = await fetch("/api/v1/soundprints", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-idempotency-key": idempotencyKey(draft.sessionId),
      "x-job-key": jobKey,
    },
    body: JSON.stringify(requestBody(draft)),
  });
  if (!response.ok) {
    return rememberError(await errorCode(response));
  }
  const payload = (await response.json()) as { job_id?: string };
  if (typeof payload.job_id !== "string") return rememberError("timed_out");
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ jobId: payload.job_id, jobKey }));
  sessionStorage.setItem("footwork-generation", "live");
  return "live";
}

export async function readLiveJob(job: StoredJob): Promise<LiveSnapshot> {
  const response = await fetch(`/api/v1/jobs/${job.jobId}`, {
    headers: { authorization: `Bearer ${job.jobKey}` },
  });
  if (!response.ok) {
    return emptySnapshot(await errorCode(response));
  }
  const payload = (await response.json()) as {
    status?: string;
    stage?: string;
    elapsed_ms?: number;
    mode?: string | null;
    error?: { code?: string } | null;
    result?: unknown;
  };
  const checked = validateSoundprintResult(payload.result);
  const code = knownCode(payload.error?.code);
  return {
    status: payload.status ?? "",
    stage: knownStage(payload.stage),
    elapsedMs: typeof payload.elapsed_ms === "number" ? payload.elapsed_ms : 0,
    mode: typeof payload.mode === "string" ? payload.mode : null,
    errorCode: code,
    result: checked.ok ? checked.value : null,
  };
}

export async function readLiveAudio(job: StoredJob, format: string): Promise<string | null> {
  const response = await fetch(`/api/v1/jobs/${job.jobId}/audio`, {
    headers: { authorization: `Bearer ${job.jobKey}` },
  });
  if (!response.ok) return null;
  const blob = new Blob([await response.arrayBuffer()], { type: format });
  return URL.createObjectURL(blob);
}

function requestBody(draft: MovementDraft): unknown {
  return {
    schema_version: "1",
    mood: "warm_cinematic",
    consent_version: draft.consentVersion || CONSENT_VERSION,
    samples: draft.samples.map((sample) => ({
      latitude: sample.latitude,
      longitude: sample.longitude,
      accuracy_m: sample.accuracyM,
      timestamp_ms: sample.timestampMs,
    })),
    interruptions: draft.interruptions
      .filter((gap) => !gap.open && gap.endMs > gap.startMs)
      .map((gap) => ({ start_ms: gap.startMs, end_ms: gap.endMs })),
  };
}

function rememberError(code: GenerationErrorCode): GenerationErrorCode {
  sessionStorage.setItem("footwork-generation", code);
  sessionStorage.removeItem(STORAGE_KEY);
  return code;
}

async function errorCode(response: Response): Promise<GenerationErrorCode> {
  try {
    const payload = (await response.json()) as { code?: string };
    return knownCode(payload.code) ?? "timed_out";
  } catch {
    return "timed_out";
  }
}

function knownCode(value: string | undefined): GenerationErrorCode | null {
  if (value && GENERATION_ERRORS.includes(value as GenerationErrorCode)) {
    return value as GenerationErrorCode;
  }
  return null;
}

function knownStage(value: string | undefined): GenerationStageId {
  if (
    value === "reading_walk" ||
    value === "finding_moments" ||
    value === "shaping_music" ||
    value === "recording_piece"
  ) {
    return value;
  }
  return "reading_walk";
}

function emptySnapshot(code: GenerationErrorCode): LiveSnapshot {
  return {
    status: "error",
    stage: "reading_walk",
    elapsedMs: 0,
    mode: null,
    errorCode: code,
    result: null,
  };
}

function idempotencyKey(sessionId: string): string {
  const cleaned = sessionId.replace(/[^A-Za-z0-9._:-]/g, "").slice(0, 128);
  return cleaned.length >= 8 ? cleaned : `walk-${cleaned}`.padEnd(8, "0");
}

function randomKey(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}
