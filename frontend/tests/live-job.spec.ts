import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
import { validateSoundprintResult } from "../src/contracts/validate";
import { synthesizeSketchWav, type TimedEvent } from "../src/studio/sketchAudio";

const sketch = JSON.parse(
  readFileSync(new URL("./fixtures/route-sketch-result.json", import.meta.url), "utf8"),
) as {
  job_id: string;
  audio_format: string;
  mode: string;
  duration_ms: number;
  events: TimedEvent[];
};

const sketchAudio = Buffer.from(synthesizeSketchWav(sketch.duration_ms, sketch.events));

test("a recorded walk result matches the shared contract", () => {
  const checked = validateSoundprintResult(sketch);
  if (!checked.ok) throw new Error(checked.errors.join("\n"));
  expect(checked.value.mode).toBe("route_sketch");
  expect(checked.value.provenance.generation_mode).toBe("route_sketch");
});

test("a live job shows the server stage and then the sketch", async ({ page }) => {
  const jobKey = "ab".repeat(32);
  await page.addInitScript(
    ({ jobId, key }) => {
      sessionStorage.setItem("footwork-generation", "live");
      sessionStorage.setItem("footwork-live-job", JSON.stringify({ jobId, jobKey: key }));
    },
    { jobId: sketch.job_id, key: jobKey },
  );
  let polls = 0;
  await page.route("**/api/v1/jobs/**", async (route) => {
    if (route.request().url().endsWith("/audio")) {
      await route.fulfill({
        status: 200,
        contentType: "audio/wav",
        body: sketchAudio,
      });
      return;
    }
    polls += 1;
    if (polls === 1) {
      await route.fulfill({
        json: {
          schema_version: "1",
          job_id: sketch.job_id,
          status: "dispatching",
          stage: "finding_moments",
          elapsed_ms: 1200,
          mode: null,
          error: null,
          result: null,
        },
      });
      return;
    }
    await route.fulfill({
      json: {
        schema_version: "1",
        job_id: sketch.job_id,
        status: "ready",
        stage: "shaping_music",
        elapsed_ms: 2400,
        mode: "route_sketch",
        error: null,
        result: sketch,
      },
    });
  });

  await page.goto("/studio");
  await expect(page.locator(".generation-stage")).toHaveText("Finding meaningful moments.");
  await expect(page.getByText("Generated from your walk")).toBeVisible({ timeout: 8000 });
  await expect(page.getByText("This is a simpler version made from your walk.")).toBeVisible();
  await expect(page.getByText("This is an example, not a recorded walk.")).toHaveCount(0);

  const turn = sketch.events.find((event) => event.type === "turn");
  expect(turn).toBeTruthy();
  await page.getByRole("button", { name: /Melody changed direction/ }).click();
  const route = Number(await page.locator(".route-cursor").getAttribute("data-time-ms"));
  const graph = Number(await page.locator(".graph-playhead").getAttribute("data-time-ms"));
  const story = Number(await page.locator("[data-story-time]").getAttribute("data-story-time"));
  const audioMs = await page.locator("audio").evaluate((element) => {
    const player = element as HTMLAudioElement;
    return player.currentTime * 1000;
  });
  expect(Math.abs(route - turn!.audio_offset_ms)).toBeLessThanOrEqual(500);
  expect(Math.abs(graph - route)).toBeLessThanOrEqual(500);
  expect(Math.abs(story - route)).toBeLessThanOrEqual(500);
  expect(Math.abs(audioMs - route)).toBeLessThanOrEqual(500);
});
