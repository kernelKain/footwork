import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { validateSoundprintResult } from "../src/contracts/validate";
import {
  GENERATION_ERROR_COPY,
  GENERATION_TIMEOUT_MS,
  RETRYABLE_GENERATION_ERRORS,
} from "../src/studio/generationContract";
import { resultLabel } from "../src/studio/StudioScreen";

const example = JSON.parse(
  readFileSync(new URL("../../fixtures/synthetic/soundprint-shell.json", import.meta.url), "utf8"),
) as { result: unknown };
const sketch = JSON.parse(
  readFileSync(new URL("./fixtures/route-sketch-result.json", import.meta.url), "utf8"),
);

test("example modes stay labeled apart from a generated walk", () => {
  expect(resultLabel("synthetic_fixture")).toBe("Example walk");
  expect(resultLabel("cached_example")).toBe("Example walk");
  expect(resultLabel("route_sketch")).toBe("Generated from your walk");
  expect(resultLabel("studio_live")).toBe("Generated from your walk");
});

test("the bundled example and the sketch share the contract and not the label", () => {
  const exampleResult = validateSoundprintResult(example.result);
  const sketchResult = validateSoundprintResult(sketch);
  if (!exampleResult.ok) throw new Error(exampleResult.errors.join("\n"));
  if (!sketchResult.ok) throw new Error(sketchResult.errors.join("\n"));
  expect(exampleResult.value.mode).toBe("synthetic_fixture");
  expect(sketchResult.value.mode).toBe("route_sketch");
  expect(resultLabel(exampleResult.value.mode)).toBe("Example walk");
  expect(resultLabel(sketchResult.value.mode)).toBe("Generated from your walk");
});

test("generation failures keep the locked sentences and the 180 second boundary", () => {
  expect(GENERATION_TIMEOUT_MS).toBe(180_000);
  expect([...RETRYABLE_GENERATION_ERRORS].sort()).toEqual([
    "arrangement_unavailable",
    "music_unavailable",
    "timed_out",
  ]);
  expect(GENERATION_ERROR_COPY).toEqual({
    trace_too_short: "That walk was too short to shape a piece.",
    trace_unclear: "The location was too unclear to trust.",
    timed_out: "Making the piece took too long.",
    arrangement_unavailable: "The music plan is unavailable. A simpler version can still be made.",
    music_unavailable: "The studio recording is unavailable. Your simpler version is ready.",
    generation_limit: "Today's limit for new pieces has been reached.",
  });
  expect(RETRYABLE_GENERATION_ERRORS.has("generation_limit")).toBe(false);
  expect(RETRYABLE_GENERATION_ERRORS.has("trace_too_short")).toBe(false);
  expect(RETRYABLE_GENERATION_ERRORS.has("trace_unclear")).toBe(false);
});
