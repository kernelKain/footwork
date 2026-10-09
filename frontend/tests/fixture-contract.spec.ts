import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test } from "@playwright/test";
import { validateDemoFixture } from "../src/contracts/validate";

const fixturePath = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../fixtures/synthetic/soundprint-shell.json",
);

test("synthetic soundprint fixture satisfies the shared result contract", () => {
  const payload: unknown = JSON.parse(readFileSync(fixturePath, "utf8"));
  const result = validateDemoFixture(payload);
  expect(result.ok).toBe(true);
});

test("contract validation rejects location fields and unlabeled fixtures", () => {
  const payload = JSON.parse(readFileSync(fixturePath, "utf8")) as {
    label: string;
    result: { route: { points: Array<Record<string, number>> } };
  };
  payload.label = "live";
  const unlabeled = validateDemoFixture(payload);
  expect(unlabeled.ok).toBe(false);

  const located = JSON.parse(readFileSync(fixturePath, "utf8")) as {
    result: { latitude?: number };
  };
  located.result.latitude = 0;
  const rejected = validateDemoFixture(located);
  expect(rejected.ok).toBe(false);
  if (!rejected.ok) {
    expect(rejected.errors.some((error) => error.includes("latitude"))).toBe(true);
  }
});
