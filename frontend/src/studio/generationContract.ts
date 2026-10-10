/** Public generation contract. These ids are not HTTP paths and are not shown as labels. */
export const GENERATION_TIMEOUT_MS = 180_000;

export const GENERATION_STAGES = [
  { id: "reading_walk", copy: "Reading your walk." },
  { id: "finding_moments", copy: "Finding meaningful moments." },
  { id: "shaping_music", copy: "Turning them into music." },
  { id: "recording_piece", copy: "Creating your track." },
] as const;

export type GenerationStageId = (typeof GENERATION_STAGES)[number]["id"];

export const GENERATION_ERRORS = [
  "trace_too_short",
  "trace_unclear",
  "timed_out",
  "arrangement_unavailable",
  "music_unavailable",
  "generation_limit",
] as const;

export type GenerationErrorCode = (typeof GENERATION_ERRORS)[number];

export const RETRYABLE_GENERATION_ERRORS = new Set<GenerationErrorCode>([
  "timed_out",
  "arrangement_unavailable",
  "music_unavailable",
]);

export const GENERATION_ERROR_COPY: Record<GenerationErrorCode, string> = {
  trace_too_short: "That walk was too short to shape a piece.",
  trace_unclear: "The location was too unclear to trust.",
  timed_out: "Making the piece took too long.",
  arrangement_unavailable: "The music plan is unavailable. A simpler version can still be made.",
  music_unavailable: "The studio recording is unavailable. Your simpler version is ready.",
  generation_limit: "Today's limit for new pieces has been reached.",
};

const PRACTICE_STAGE_MS = 800;

export function stageIndexForElapsed(elapsedMs: number): number {
  return Math.min(GENERATION_STAGES.length - 1, Math.floor(elapsedMs / PRACTICE_STAGE_MS));
}

export function practiceRunComplete(elapsedMs: number): boolean {
  return elapsedMs >= GENERATION_STAGES.length * PRACTICE_STAGE_MS;
}

export function isGenerationTimeout(elapsedMs: number, forced: boolean): boolean {
  return forced || elapsedMs >= GENERATION_TIMEOUT_MS;
}

export type GenerationRequest =
  | { kind: "example"; repeat: boolean }
  | { kind: "run" }
  | { kind: "live" }
  | { kind: "error"; code: GenerationErrorCode };

export function readGenerationRequest(): GenerationRequest {
  try {
    const value = sessionStorage.getItem("footwork-generation");
    const repeat = sessionStorage.getItem("footwork-generation-complete") === "1";
    if (value === "run" && repeat) {
      sessionStorage.removeItem("footwork-generation");
      return { kind: "example", repeat: true };
    }
    if (value === "run") return { kind: "run" };
    if (value === "live") return { kind: "live" };
    if (GENERATION_ERRORS.includes(value as GenerationErrorCode)) {
      return { kind: "error", code: value as GenerationErrorCode };
    }
    return { kind: "example", repeat: false };
  } catch {
    return { kind: "example", repeat: false };
  }
}

export function markGenerationFinished(): void {
  try {
    sessionStorage.setItem("footwork-generation-complete", "1");
    sessionStorage.removeItem("footwork-generation");
  } catch {
    return;
  }
}

export function requestGenerationRetry(): void {
  try {
    sessionStorage.setItem("footwork-generation", "run");
  } catch {
    return;
  }
}
