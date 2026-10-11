import type { MovementDraft } from "./movementDraft";

export function privateWalkBody(draft: MovementDraft): {
  schema_version: "1";
  mood: "warm_cinematic";
  consent_version: string;
  samples: Array<{
    latitude: number;
    longitude: number;
    accuracy_m: number;
    timestamp_ms: number;
  }>;
  interruptions: Array<{ start_ms: number; end_ms: number }>;
} {
  return {
    schema_version: "1",
    mood: "warm_cinematic",
    consent_version: draft.consentVersion,
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

export function downloadPrivateWalk(draft: MovementDraft): void {
  const blob = new Blob([JSON.stringify(privateWalkBody(draft))], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "footwork-private-walk.json";
  link.click();
  URL.revokeObjectURL(url);
}
