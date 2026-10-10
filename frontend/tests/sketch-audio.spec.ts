import { expect, test } from "@playwright/test";
import {
  meanAbsoluteSample,
  sketchFrequencyHz,
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
  expect(pauseEnergy).toBeLessThan(20);
  expect(movingEnergy).toBeGreaterThan(1000);
});
