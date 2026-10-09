export type RecordingSegment = {
  id: string;
  durationMs: number;
};

export type ManualBreakInterval = {
  id: string;
  durationMs: number;
  open: boolean;
};

export type PracticeDraft = {
  status: "recording" | "paused";
  segments: RecordingSegment[];
  breaks: ManualBreakInterval[];
};

export type RoutePiece =
  { kind: "segment"; id: string; d: string } | { kind: "break"; id: string; d: string };

/** A manual break contributes no samples, distance, or musical pause events. */
export type BreakMovement = {
  distanceM: 0;
  points: [];
  events: [];
};

const PRACTICE_POINTS = [
  [16, 52],
  [44, 52],
  [68, 38],
  [92, 26],
  [120, 20],
  [150, 22],
  [180, 30],
  [210, 36],
] as const;

export function activeDurationMs(draft: PracticeDraft): number {
  return draft.segments.reduce((total, segment) => total + segment.durationMs, 0);
}

export function manualBreakDurationMs(draft: PracticeDraft): number {
  return draft.breaks.reduce((total, gap) => total + gap.durationMs, 0);
}

export function elapsedDurationMs(draft: PracticeDraft): number {
  return activeDurationMs(draft) + manualBreakDurationMs(draft);
}

export function movementDuringManualBreak(): BreakMovement {
  return { distanceM: 0, points: [], events: [] };
}

/**
 * Hiding the page is not a manual break. The draft is returned unchanged so a
 * visibility gap cannot add time, distance, a segment, or a route point.
 */
export function recordVisibilityGap(draft: PracticeDraft): PracticeDraft {
  return draft;
}

export function createRecordingDraft(): PracticeDraft {
  return {
    status: "recording",
    segments: [{ id: "segment-1", durationMs: 0 }],
    breaks: [],
  };
}

export function withActiveDuration(draft: PracticeDraft, activeMs: number): PracticeDraft {
  const next = cloneDraft(draft);
  const last = next.segments[next.segments.length - 1];
  if (!last) return next;
  const closed = next.segments
    .slice(0, -1)
    .reduce((total, segment) => total + segment.durationMs, 0);
  last.durationMs = Math.max(0, activeMs - closed);
  return next;
}

export function withOpenBreakDuration(draft: PracticeDraft, totalBreakMs: number): PracticeDraft {
  const next = cloneDraft(draft);
  const openIndex = next.breaks.findIndex((gap) => gap.open);
  if (openIndex < 0) return next;
  const closed = next.breaks.reduce((total, gap, index) => {
    if (index === openIndex) return total;
    return total + gap.durationMs;
  }, 0);
  const open = next.breaks[openIndex];
  if (!open) return next;
  next.breaks[openIndex] = {
    ...open,
    durationMs: Math.max(0, totalBreakMs - closed),
  };
  return next;
}

export function pauseRecording(draft: PracticeDraft, activeMs: number): PracticeDraft {
  const frozen = withActiveDuration(draft, activeMs);
  if (frozen.breaks.some((gap) => gap.open)) {
    return { ...frozen, status: "paused" };
  }
  return {
    status: "paused",
    segments: frozen.segments,
    breaks: [
      ...frozen.breaks,
      { id: `break-${frozen.breaks.length + 1}`, durationMs: 0, open: true },
    ],
  };
}

export function resumeRecording(draft: PracticeDraft, breakMs: number): PracticeDraft {
  const next = withOpenBreakDuration(draft, breakMs);
  return {
    status: "recording",
    segments: [...next.segments, { id: `segment-${next.segments.length + 1}`, durationMs: 0 }],
    breaks: next.breaks.map((gap) => ({ ...gap, open: false })),
  };
}

/**
 * Decorative practice geometry. Each segment is its own path. A break is a
 * separate dotted gap and is never included in a segment path.
 */
export function practiceRoutePieces(draft: PracticeDraft): RoutePiece[] {
  const shown = draft.segments.slice(0, 3);
  const ranges =
    shown.length <= 1
      ? [[0, 1, 2, 3, 4]]
      : shown.length === 2
        ? [
            [0, 1, 2],
            [5, 6, 7],
          ]
        : [
            [0, 1],
            [3, 4],
            [6, 7],
          ];
  const pieces: RoutePiece[] = [];
  shown.forEach((segment, index) => {
    const indexes = ranges[index] ?? [];
    const d = pathFrom(indexes);
    if (!d) return;
    pieces.push({ kind: "segment", id: segment.id, d });
    const next = shown[index + 1];
    const gap = draft.breaks[index];
    const from = PRACTICE_POINTS[indexes[indexes.length - 1] ?? -1];
    const to = PRACTICE_POINTS[(ranges[index + 1] ?? [])[0] ?? -1];
    if (!next || !gap || !from || !to) return;
    pieces.push({
      kind: "break",
      id: gap.id,
      d: `M${from[0]} ${from[1]} L${to[0]} ${to[1]}`,
    });
  });
  return pieces;
}

export function parsePracticeDraft(value: string): PracticeDraft | null {
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!isPausedDraft(parsed)) return null;
    return {
      status: "paused",
      segments: parsed.segments.map((segment) => ({
        id: segment.id,
        durationMs: segment.durationMs,
      })),
      breaks: parsed.breaks.map((gap) => ({
        id: gap.id,
        durationMs: gap.durationMs,
        open: gap.open,
      })),
    };
  } catch {
    return null;
  }
}

function cloneDraft(draft: PracticeDraft): PracticeDraft {
  return {
    status: draft.status,
    segments: draft.segments.map((segment) => ({ ...segment })),
    breaks: draft.breaks.map((gap) => ({ ...gap })),
  };
}

function pathFrom(indexes: readonly number[]): string {
  const coords = indexes
    .map((index) => PRACTICE_POINTS[index])
    .filter((point): point is (typeof PRACTICE_POINTS)[number] => point !== undefined);
  if (coords.length < 2) return "";
  return coords
    .map((point, index) => `${index === 0 ? "M" : "L"}${point[0]} ${point[1]}`)
    .join(" ");
}

function isPausedDraft(value: unknown): value is PracticeDraft {
  if (!value || typeof value !== "object") return false;
  const draft = value as PracticeDraft;
  if (draft.status !== "paused") return false;
  if (!Array.isArray(draft.segments) || draft.segments.length === 0 || draft.segments.length > 12) {
    return false;
  }
  if (!Array.isArray(draft.breaks) || draft.breaks.length > 12) return false;
  const segmentsOk = draft.segments.every(
    (segment) =>
      isDurationRecord(segment) &&
      !Object.prototype.hasOwnProperty.call(segment, "points") &&
      !Object.prototype.hasOwnProperty.call(segment, "distanceM"),
  );
  if (!segmentsOk) return false;
  const breaksOk = draft.breaks.every(
    (gap) =>
      isDurationRecord(gap) &&
      typeof (gap as ManualBreakInterval).open === "boolean" &&
      !Object.prototype.hasOwnProperty.call(gap, "points"),
  );
  if (!breaksOk) return false;
  return draft.breaks.filter((gap) => gap.open).length === 1;
}

function isDurationRecord(value: unknown): value is { id: string; durationMs: number } {
  if (!value || typeof value !== "object") return false;
  const record = value as { id?: unknown; durationMs?: unknown };
  return (
    typeof record.id === "string" &&
    record.id.length > 0 &&
    typeof record.durationMs === "number" &&
    Number.isFinite(record.durationMs) &&
    record.durationMs >= 0
  );
}
