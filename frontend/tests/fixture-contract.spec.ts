import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test } from "@playwright/test";
import { validateDemoFixture } from "../src/contracts/validate";

const fixtureDir = resolve(dirname(fileURLToPath(import.meta.url)), "../../fixtures/synthetic");

type MovementFixture = {
  label: string;
  result: {
    latitude?: number;
    calories?: number;
    route: { points: Array<Record<string, number>>; connector?: boolean };
    events: Array<Record<string, number | string>>;
    movement_summary?: {
      active_duration_ms: number;
      elapsed_duration_ms: number;
      manual_break_duration_ms: number;
      distance_m?: number;
      average_moving_speed_mps?: number | null;
      pace_series: Array<Record<string, number | string>>;
      recording_segments: Array<Record<string, number | string>>;
      break_intervals: Array<Record<string, number | string>>;
      uncertain_intervals: Array<Record<string, number | string>>;
      event_counts: Record<string, number>;
      return_proximity?: number | null;
      quality_grade: string;
      steps?: number;
    };
  };
};

function loadFixture(name: string): MovementFixture {
  return JSON.parse(readFileSync(resolve(fixtureDir, name), "utf8")) as MovementFixture;
}

function expectRejected(payload: unknown, snippet: string): void {
  const result = validateDemoFixture(payload);
  expect(result.ok).toBe(false);
  if (!result.ok) {
    expect(result.errors.some((error) => error.includes(snippet))).toBe(true);
  }
}

test("synthetic soundprint fixture satisfies the shared result contract", () => {
  const payload = loadFixture("soundprint-shell.json");
  const result = validateDemoFixture(payload);
  expect(result.ok).toBe(true);
  if (result.ok) {
    const summary = result.value.result.movement_summary;
    expect(summary.quality_grade).toBe("limited");
    expect(summary.average_moving_speed_mps).toBeNull();
    expect(summary.distance_m).toBe(96);
    expect(summary.active_duration_ms).toBe(60000);
    expect(summary.elapsed_duration_ms).toBe(60000);
    expect(summary.manual_break_duration_ms).toBe(0);
    expect(summary.recording_segments).toHaveLength(1);
    expect(summary.break_intervals).toHaveLength(0);
    expect(summary.uncertain_intervals).toHaveLength(0);
    expect(summary.pace_series).toHaveLength(0);
    expect(summary.return_proximity).toBeUndefined();
    expect(summary.event_counts).toEqual({ turn: 1, pace_change: 1, pause: 1, loop: 0 });
  }
});

test("mixed movement fixture keeps breaks, signal gaps, and detected pauses separate", () => {
  const payload = loadFixture("movement-summary-mixed.json");
  const result = validateDemoFixture(payload);
  expect(result.ok).toBe(true);
  if (result.ok) {
    const summary = result.value.result.movement_summary;
    expect(summary.quality_grade).toBe("mixed");
    expect(summary.average_moving_speed_mps).toBe(1.5);
    expect(summary.distance_m).toBe(60);
    expect(summary.active_duration_ms).toBe(40000);
    expect(summary.manual_break_duration_ms).toBe(6000);
    expect(summary.elapsed_duration_ms).toBe(48000);
    expect(summary.return_proximity).toBe(0.25);
    expect(summary.break_intervals).toHaveLength(1);
    expect(summary.uncertain_intervals[0]?.reason).toBe("signal");
    expect(summary.event_counts.pause).toBe(1);
  }
});

test("limited movement fixture withholds speed and may omit return proximity", () => {
  const payload = loadFixture("movement-summary-limited.json");
  const result = validateDemoFixture(payload);
  expect(result.ok).toBe(true);
  if (result.ok) {
    const summary = result.value.result.movement_summary;
    expect(summary.quality_grade).toBe("limited");
    expect(summary.average_moving_speed_mps).toBeNull();
    expect(summary.return_proximity).toBeUndefined();
    expect(summary.pace_series.every((sample) => sample.quality === "uncertain")).toBe(true);
    expect(summary.distance_m).toBe(15);
  }
});

test("a clear summary can omit return proximity when every sample is clear", () => {
  const payload = loadFixture("soundprint-shell.json");
  const summary = payload.result.movement_summary;
  if (!summary) throw new Error("shell fixture is missing movement_summary");
  summary.quality_grade = "clear";
  summary.average_moving_speed_mps = 1.6;
  summary.pace_series = [{ t_ms: 0, pace: 0.4, quality: "clear" }];
  const result = validateDemoFixture(payload);
  expect(result.ok).toBe(true);
  if (result.ok) expect(result.value.result.movement_summary.return_proximity).toBeUndefined();
});

test("removing return proximity from a mixed summary still validates", () => {
  const payload = loadFixture("movement-summary-mixed.json");
  const summary = payload.result.movement_summary;
  if (!summary) throw new Error("mixed fixture is missing movement_summary");
  delete summary.return_proximity;
  expect(validateDemoFixture(payload).ok).toBe(true);
});

test("a mixed summary may withhold speed when the grade stays mixed", () => {
  const payload = loadFixture("movement-summary-mixed.json");
  const summary = payload.result.movement_summary;
  if (!summary) throw new Error("mixed fixture is missing movement_summary");
  summary.average_moving_speed_mps = null;
  expect(validateDemoFixture(payload).ok).toBe(true);
});

test("contract validation rejects location fields and unlabeled fixtures", () => {
  const payload = loadFixture("soundprint-shell.json");
  payload.label = "live";
  expect(validateDemoFixture(payload).ok).toBe(false);

  const located = loadFixture("soundprint-shell.json");
  located.result.latitude = 0;
  expectRejected(located, "latitude");
});

test("a result without movement_summary fails instead of receiving defaults", () => {
  const payload = loadFixture("soundprint-shell.json");
  delete payload.result.movement_summary;
  expectRejected(payload, "movement_summary is required");
});

test("a missing distance fails instead of becoming zero", () => {
  const payload = loadFixture("soundprint-shell.json");
  const summary = payload.result.movement_summary;
  if (!summary) throw new Error("shell fixture is missing movement_summary");
  delete summary.distance_m;
  expectRejected(payload, "distance_m is required");
});

test("negative, non-finite, and inconsistent movement values fail", () => {
  const negative = loadFixture("movement-summary-mixed.json");
  const negativeSummary = negative.result.movement_summary;
  if (!negativeSummary) throw new Error("mixed fixture is missing movement_summary");
  negativeSummary.distance_m = -1;
  expectRejected(negative, "distance_m must be a finite number from 0 to 100000");

  const missingNumber = loadFixture("movement-summary-mixed.json");
  const missingSummary = missingNumber.result.movement_summary;
  if (!missingSummary) throw new Error("mixed fixture is missing movement_summary");
  missingSummary.distance_m = Number.NaN;
  expectRejected(missingNumber, "distance_m must be a finite number from 0 to 100000");

  const unbounded = loadFixture("movement-summary-mixed.json");
  const unboundedSummary = unbounded.result.movement_summary;
  if (!unboundedSummary) throw new Error("mixed fixture is missing movement_summary");
  unboundedSummary.average_moving_speed_mps = Number.POSITIVE_INFINITY;
  expectRejected(unbounded, "average_moving_speed_mps must be a finite number from 0 to 12");

  const drifted = loadFixture("movement-summary-mixed.json");
  const driftedSummary = drifted.result.movement_summary;
  if (!driftedSummary) throw new Error("mixed fixture is missing movement_summary");
  driftedSummary.elapsed_duration_ms = 40000;
  expectRejected(drifted, "elapsed_duration_ms must run from the first interval");

  const bridged = loadFixture("movement-summary-mixed.json");
  const bridgedSummary = bridged.result.movement_summary;
  if (!bridgedSummary) throw new Error("mixed fixture is missing movement_summary");
  bridgedSummary.distance_m = 70;
  expectRejected(bridged, "distance_m must equal the sum of distances inside recording segments");

  const wrongSpeed = loadFixture("movement-summary-mixed.json");
  const wrongSpeedSummary = wrongSpeed.result.movement_summary;
  if (!wrongSpeedSummary) throw new Error("mixed fixture is missing movement_summary");
  wrongSpeedSummary.average_moving_speed_mps = 9;
  expectRejected(wrongSpeed, "average_moving_speed_mps must equal accepted distance");
});

test("overlapping and out-of-order intervals fail", () => {
  const overlap = loadFixture("movement-summary-mixed.json");
  const overlapSummary = overlap.result.movement_summary;
  if (!overlapSummary) throw new Error("mixed fixture is missing movement_summary");
  overlapSummary.break_intervals[0] = {
    id: "break-seat",
    start_ms: 24000,
    end_ms: 31000,
  };
  expectRejected(overlap, "overlaps");

  const reversed = loadFixture("movement-summary-mixed.json");
  const reversedSummary = reversed.result.movement_summary;
  if (!reversedSummary) throw new Error("mixed fixture is missing movement_summary");
  reversedSummary.recording_segments.reverse();
  expectRejected(reversed, "must stay in time order");
});

test("event counts, detected pauses, and pace samples stay inside accepted segments", () => {
  const counted = loadFixture("movement-summary-mixed.json");
  const countedSummary = counted.result.movement_summary;
  if (!countedSummary) throw new Error("mixed fixture is missing movement_summary");
  countedSummary.event_counts.turn = 0;
  expectRejected(counted, "event_counts.turn must match the accepted turn events");

  const pausedInBreak = loadFixture("movement-summary-mixed.json");
  const pause = pausedInBreak.result.events.find((event) => event.type === "pause");
  if (!pause) throw new Error("mixed fixture is missing a detected pause");
  pause.source_offset_ms = 26000;
  expectRejected(pausedInBreak, "detected pause");

  const pacedInBreak = loadFixture("movement-summary-mixed.json");
  const pacedSummary = pacedInBreak.result.movement_summary;
  if (!pacedSummary) throw new Error("mixed fixture is missing movement_summary");
  pacedSummary.pace_series[3] = { t_ms: 27000, pace: 0.3, quality: "uncertain" };
  expectRejected(pacedInBreak, "pace_series[3].t_ms must fall inside a recording segment");
});

test("route points must not cross a manual break or uncertain interval", () => {
  const payload = loadFixture("movement-summary-mixed.json");
  payload.result.route.points.push({ x: 0.5, y: 0.5, t_ms: 40000 });
  expectRejected(
    payload,
    "result.route.points must not draw a connector across a manual break or uncertain interval",
  );
});

test("limited quality cannot publish a speed, and clear quality cannot hide an uncertain gap", () => {
  const limited = loadFixture("movement-summary-limited.json");
  const limitedSummary = limited.result.movement_summary;
  if (!limitedSummary) throw new Error("limited fixture is missing movement_summary");
  limitedSummary.average_moving_speed_mps = 1.25;
  expectRejected(limited, "average_moving_speed_mps must be null when quality is limited");

  const clear = loadFixture("movement-summary-mixed.json");
  const clearSummary = clear.result.movement_summary;
  if (!clearSummary) throw new Error("mixed fixture is missing movement_summary");
  clearSummary.quality_grade = "clear";
  expectRejected(clear, "uncertain_intervals must be empty when quality is clear");
});

test("return proximity must be omitted or a normalized number", () => {
  const tooFar = loadFixture("movement-summary-mixed.json");
  const tooFarSummary = tooFar.result.movement_summary;
  if (!tooFarSummary) throw new Error("mixed fixture is missing movement_summary");
  tooFarSummary.return_proximity = 1.5;
  expectRejected(tooFar, "return_proximity must be a finite number from 0 to 1");

  const empty = loadFixture("movement-summary-mixed.json");
  const emptySummary = empty.result.movement_summary;
  if (!emptySummary) throw new Error("mixed fixture is missing movement_summary");
  emptySummary.return_proximity = null;
  expectRejected(empty, "return_proximity must be a finite number from 0 to 1");
});

test("health fields and invented connectors are rejected", () => {
  const calories = loadFixture("soundprint-shell.json");
  calories.result.calories = 120;
  expectRejected(calories, "calories is not allowed");

  const steps = loadFixture("soundprint-shell.json");
  const summary = steps.result.movement_summary;
  if (!summary) throw new Error("shell fixture is missing movement_summary");
  summary.steps = 4000;
  expectRejected(steps, "steps is not allowed");

  const connector = loadFixture("movement-summary-mixed.json");
  connector.result.route.connector = true;
  expectRejected(connector, "connector is not allowed");
});
