import { expect, test } from "./practicePage";
import {
  meanAbsoluteSample,
  sketchFrequencyHz,
  sketchMelody,
  synthesizeSketchWav,
} from "../src/studio/sketchAudio";

const TURN_MS = 18000;
const PAUSE_START_MS = 36000;
const PAUSE_END_MS = 48000;
const EVENTS = [
  { type: "turn" as const, audio_offset_ms: TURN_MS },
  { type: "pause" as const, audio_offset_ms: PAUSE_START_MS },
  { type: "pace_change" as const, audio_offset_ms: PAUSE_END_MS },
];

test("deterministic sketch changes direction at the turn and rests at the pause", () => {
  expect(sketchFrequencyHz(16000, TURN_MS, PAUSE_START_MS, PAUSE_END_MS)).toBeGreaterThan(
    sketchFrequencyHz(17000, TURN_MS, PAUSE_START_MS, PAUSE_END_MS),
  );
  expect(sketchFrequencyHz(20000, TURN_MS, PAUSE_START_MS, PAUSE_END_MS)).toBeGreaterThan(
    sketchFrequencyHz(19000, TURN_MS, PAUSE_START_MS, PAUSE_END_MS),
  );

  const wav = synthesizeSketchWav(60000, EVENTS);
  const pauseEnergy = meanAbsoluteSample(wav, 37000, 47000);
  const movingEnergy = meanAbsoluteSample(wav, 2000, 8000);
  const afterPace = meanAbsoluteSample(wav, 49000, 55000);
  expect(pauseEnergy).toBeLessThan(20);
  expect(movingEnergy).toBeGreaterThan(1000);
  expect(afterPace).toBeGreaterThan(movingEnergy);
});

test("later turns, pauses, and loops change the sketch", () => {
  const events = [
    { type: "turn" as const, audio_offset_ms: 10000 },
    { type: "pace_change" as const, audio_offset_ms: 20000 },
    { type: "turn" as const, audio_offset_ms: 30000 },
    { type: "pause" as const, audio_offset_ms: 36000 },
    { type: "loop" as const, audio_offset_ms: 48000 },
    { type: "pause" as const, audio_offset_ms: 56000 },
  ];
  expect(sketchMelody(14000, 60000, events).hz).toBeGreaterThan(
    sketchMelody(12000, 60000, events).hz,
  );
  expect(sketchMelody(33000, 60000, events).hz).toBeLessThan(sketchMelody(30500, 60000, events).hz);
  expect(sketchMelody(37000, 60000, events).hz).toBe(0);
  expect(sketchMelody(57000, 60000, events).hz).toBe(0);
  expect(sketchMelody(50000, 60000, events).hz).toBeLessThan(sketchMelody(48400, 60000, events).hz);

  const wav = synthesizeSketchWav(60000, events);
  const beforePace = meanAbsoluteSample(wav, 11000, 18000);
  const afterPace = meanAbsoluteSample(wav, 21000, 28000);
  expect(afterPace).toBeGreaterThan(beforePace);
  expect(meanAbsoluteSample(wav, 37000, 45000)).toBeLessThan(20);
  expect(meanAbsoluteSample(wav, 56500, 59000)).toBeLessThan(20);
});
