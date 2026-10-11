import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { validateSoundprintResult } from "../src/contracts/validate";
import {
  GENERATION_ERROR_COPY,
  GENERATION_TIMEOUT_MS,
  RETRYABLE_GENERATION_ERRORS,
} from "../src/studio/generationContract";
import { installToken } from "../src/studio/installToken";
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
    generation_limit:
      "The studio has reached today's generation limit. Hear the example or try tomorrow.",
    install_allowance: "This phone has made today's pieces. New pieces are available tomorrow.",
  });
  expect(RETRYABLE_GENERATION_ERRORS.has("generation_limit")).toBe(false);
  expect(RETRYABLE_GENERATION_ERRORS.has("install_allowance")).toBe(false);
  expect(RETRYABLE_GENERATION_ERRORS.has("trace_too_short")).toBe(false);
  expect(RETRYABLE_GENERATION_ERRORS.has("trace_unclear")).toBe(false);
});

test("one install token is random, stored, and reused", () => {
  const saved = new Map<string, string>();
  const storage = {
    getItem: (key: string) => saved.get(key) ?? null,
    setItem: (key: string, value: string) => {
      saved.set(key, value);
    },
  };
  const first = installToken(storage);
  const second = installToken(storage);
  expect(first).toMatch(/^[0-9a-f]{64}$/);
  expect(second).toBe(first);
  expect(saved.get("footwork-install")).toBe(first);
  saved.set("footwork-install", "not-a-token");
  const replaced = installToken(storage);
  expect(replaced).toMatch(/^[0-9a-f]{64}$/);
  expect(replaced).not.toBe("not-a-token");
  expect(installToken(storage)).toBe(replaced);
});
