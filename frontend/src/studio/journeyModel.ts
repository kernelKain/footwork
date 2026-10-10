import type {
  Chapter,
  MovementEvent,
  MovementSummary,
  PaceSample,
  RecordingSegment,
  RoutePoint,
} from "../contracts/types";
import { formatTime } from "./formatTime";
import { pointOnRoute } from "./routePosition";

export type PaceTone = "unavailable" | "calm" | "steady" | "energetic" | "uncertain";

export type DrawnSpan = {
  id: string;
  kind: "segment" | "break" | "uncertain";
  points: string;
  pace: PaceTone;
};

export type RibbonBand = {
  id: string;
  kind: "segment" | "break" | "uncertain";
  start: number;
  width: number;
  intensity: number | null;
};

const CAUSAL: Record<MovementEvent["type"], string> = {
  turn: "Turn. Melody changed direction.",
  pause: "Pause. Musical break.",
  pace_change: "Pace change. Faster stretch. Energy rose.",
  loop: "Loop. Motif returned.",
};

const PLANNED: Record<MovementEvent["type"], string> = {
  turn: "A sharp turn is meant to change the melody. This change is planned.",
  pause: "A pause is meant to become a musical break. This change is planned.",
  pace_change: "A change in pace is meant to change the energy. This change is planned.",
  loop: "A loop is meant to bring a musical idea back. This change is planned.",
};

export function momentCount(summary: MovementSummary): number {
  const counts = summary.event_counts;
  return counts.turn + counts.pause + counts.pace_change + counts.loop;
}

export function formatDistance(meters: number): string {
  const scaled = Math.round(meters * 1000) / 1000;
  if (!Number.isFinite(scaled)) return "";
  return Object.is(scaled, -0) ? "0" : String(scaled);
}

export function speedLine(summary: MovementSummary): string {
  if (summary.average_moving_speed_mps === null) {
    return "Not enough clear data for an average speed.";
  }
  return `Average moving speed is ${formatDistance(summary.average_moving_speed_mps)} meters per second.`;
}

export function paceLine(summary: MovementSummary): string {
  if (summary.pace_series.length === 0) return "Not enough clear data for relative pace.";
  if (summary.pace_series.every((sample) => sample.quality === "uncertain")) {
    return "Not enough clear data for relative pace.";
  }
  return "Relative pace uses the accepted pace samples.";
}

export function clarityLine(summary: MovementSummary): string {
  if (summary.quality_grade === "clear") return "Location clarity is clear.";
  if (summary.quality_grade === "mixed") return "Location clarity is mixed.";
  return "Location clarity is limited.";
}

export function gapLines(summary: MovementSummary): string[] {
  const lines: string[] = [];
  if (summary.break_intervals.length === 0) {
    lines.push("No manual breaks are in this summary.");
  } else {
    lines.push(
      `${countLabel(summary.break_intervals.length, "manual break")} lasting ${formatTime(summary.manual_break_duration_ms)}.`,
    );
  }
  if (summary.uncertain_intervals.length === 0) {
    lines.push("No uncertain intervals are in this summary.");
  } else {
    const total = summary.uncertain_intervals.reduce(
      (sum, interval) => sum + (interval.end_ms - interval.start_ms),
      0,
    );
    lines.push(
      `${countLabel(summary.uncertain_intervals.length, "uncertain interval")} lasting ${formatTime(total)}.`,
    );
  }
  return lines;
}

export function returnLine(summary: MovementSummary): string | null {
  if (summary.return_proximity === undefined) return null;
  return `Normalized return is ${formatDistance(summary.return_proximity)} on a scale from 0 to 1.`;
}

export function cardCopy(event: MovementEvent): { causal: string; planned: string } {
  return { causal: CAUSAL[event.type], planned: PLANNED[event.type] };
}

export function visibleEvents(events: MovementEvent[]): MovementEvent[] {
  return [...events]
    .sort((left, right) => left.audio_offset_ms - right.audio_offset_ms)
    .slice(0, 5);
}

export function eventIsCurrent(timeMs: number, event: MovementEvent): boolean {
  return Math.abs(timeMs - event.audio_offset_ms) <= 500;
}

export function isCurrentChapter(
  timeMs: number,
  startMs: number,
  endMs: number,
  durationMs: number,
): boolean {
  if (timeMs < startMs) return false;
  if (timeMs < endMs) return true;
  return timeMs === durationMs && endMs === durationMs;
}

export function currentChapter(
  chapters: Chapter[],
  durationMs: number,
  timeMs: number,
): Chapter | null {
  return (
    chapters.find((chapter) =>
      isCurrentChapter(timeMs, chapter.start_ms, chapter.end_ms, durationMs),
    ) ?? null
  );
}

export function drawnSpans(points: RoutePoint[], summary: MovementSummary): DrawnSpan[] {
  const groups = summary.recording_segments.map((segment) =>
    points.filter((point) => point.t_ms >= segment.start_ms && point.t_ms <= segment.end_ms),
  );
  const spans: DrawnSpan[] = [];
  summary.recording_segments.forEach((segment, index) => {
    const group = groups[index] ?? [];
    if (group.length >= 2) {
      spans.push({
        id: segment.id,
        kind: "segment",
        points: group.map(toMapPoint).join(" "),
        pace: paceForSegment(summary.pace_series, segment),
      });
    }
    const last = group[group.length - 1];
    const next = groups[index + 1]?.[0];
    const following = summary.recording_segments[index + 1];
    if (!last || !next || !following) return;
    const gap = gapCovering(summary, segment.end_ms, following.start_ms);
    if (!gap) return;
    spans.push({
      id: gap.id,
      kind: gap.kind,
      points: `${toMapPoint(last)} ${toMapPoint(next)}`,
      pace: "unavailable",
    });
  });
  return spans;
}

export function ribbonBands(summary: MovementSummary, durationMs: number): RibbonBand[] {
  if (durationMs <= 0) return [];
  const bands: RibbonBand[] = summary.recording_segments.map((segment) => ({
    id: segment.id,
    kind: "segment",
    start: (segment.start_ms / durationMs) * 100,
    width: ((segment.end_ms - segment.start_ms) / durationMs) * 100,
    intensity: intensityFor(summary.pace_series, segment),
  }));
  for (const gap of summary.break_intervals) {
    bands.push(gapBand(gap.id, "break", gap.start_ms, gap.end_ms, durationMs));
  }
  for (const gap of summary.uncertain_intervals) {
    bands.push(gapBand(gap.id, "uncertain", gap.start_ms, gap.end_ms, durationMs));
  }
  return bands;
}

export function playbackPoint(
  points: RoutePoint[],
  summary: MovementSummary,
  timeMs: number,
): RoutePoint {
  const gap = [...summary.break_intervals, ...summary.uncertain_intervals].find(
    (interval) => timeMs > interval.start_ms && timeMs < interval.end_ms,
  );
  if (gap) {
    const held = points.filter((point) => point.t_ms <= gap.start_ms);
    return pointOnRoute(held.length > 0 ? held : points, gap.start_ms);
  }
  const segment = summary.recording_segments.find(
    (item) => timeMs >= item.start_ms && timeMs <= item.end_ms,
  );
  if (!segment) return pointOnRoute(points, timeMs);
  const inside = points.filter(
    (point) => point.t_ms >= segment.start_ms && point.t_ms <= segment.end_ms,
  );
  return pointOnRoute(inside.length > 0 ? inside : points, timeMs);
}

export function compositionRows(
  summary: MovementSummary,
): Array<{ id: string; label: string; count: number }> {
  return [
    { id: "turn", label: "Turns", count: summary.event_counts.turn },
    { id: "pause", label: "Detected pauses", count: summary.event_counts.pause },
    { id: "pace_change", label: "Pace changes", count: summary.event_counts.pace_change },
    { id: "loop", label: "Loops", count: summary.event_counts.loop },
  ];
}

function gapBand(
  id: string,
  kind: "break" | "uncertain",
  startMs: number,
  endMs: number,
  durationMs: number,
): RibbonBand {
  return {
    id,
    kind,
    start: (startMs / durationMs) * 100,
    width: ((endMs - startMs) / durationMs) * 100,
    intensity: null,
  };
}

function gapCovering(
  summary: MovementSummary,
  startMs: number,
  endMs: number,
): { id: string; kind: "break" | "uncertain" } | null {
  const manual = summary.break_intervals.find(
    (interval) => interval.start_ms < endMs && startMs < interval.end_ms,
  );
  if (manual) return { id: manual.id, kind: "break" };
  const uncertain = summary.uncertain_intervals.find(
    (interval) => interval.start_ms < endMs && startMs < interval.end_ms,
  );
  if (uncertain) return { id: uncertain.id, kind: "uncertain" };
  return null;
}

function paceForSegment(series: PaceSample[], segment: RecordingSegment): PaceTone {
  const samples = samplesIn(series, segment);
  if (samples.length === 0) return "unavailable";
  if (samples.some((sample) => sample.quality === "uncertain")) return "uncertain";
  return toneFor(averagePace(samples));
}

function intensityFor(series: PaceSample[], segment: RecordingSegment): number | null {
  const samples = samplesIn(series, segment).filter((sample) => sample.quality === "clear");
  if (samples.length === 0) return null;
  return averagePace(samples);
}

function samplesIn(series: PaceSample[], segment: RecordingSegment): PaceSample[] {
  return series.filter(
    (sample) => sample.t_ms >= segment.start_ms && sample.t_ms <= segment.end_ms,
  );
}

function averagePace(samples: PaceSample[]): number {
  return samples.reduce((sum, sample) => sum + sample.pace, 0) / samples.length;
}

function toneFor(pace: number): PaceTone {
  if (pace < 0.34) return "calm";
  if (pace < 0.67) return "steady";
  return "energetic";
}

function countLabel(count: number, singular: string): string {
  return `${count} ${singular}${count === 1 ? "" : "s"}`;
}

function toMapPoint(point: RoutePoint): string {
  return `${point.x * 100},${point.y * 100}`;
}
