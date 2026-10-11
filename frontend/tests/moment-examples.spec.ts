import AxeBuilder from "@axe-core/playwright";
import { expect, type Page } from "@playwright/test";
import {
  momentExamples,
  momentPreviewWav,
  PREVIEW_MS,
  TURN_AT_MS,
  PACE_AT_MS,
  PAUSE_GAP_MS,
} from "../src/recording/momentExamples";
import { meanAbsoluteSample, sketchMelody } from "../src/studio/sketchAudio";
import { test } from "./practicePage";

test("turn, pause, and pace previews follow the sketch rules", () => {
  const turn = momentPreviewWav("turn");
  const pause = momentPreviewWav("pause");
  const pace = momentPreviewWav("pace");
  expect(Array.from(new Uint8Array(turn))).toEqual(
    Array.from(new Uint8Array(momentPreviewWav("turn"))),
  );

  const turnEvents = [{ type: "turn" as const, audio_offset_ms: TURN_AT_MS }];
  expect(sketchMelody(400, PREVIEW_MS, turnEvents).hz).toBeGreaterThan(
    sketchMelody(1_000, PREVIEW_MS, turnEvents).hz,
  );
  expect(sketchMelody(2_000, PREVIEW_MS, turnEvents).hz).toBeGreaterThan(
    sketchMelody(1_400, PREVIEW_MS, turnEvents).hz,
  );
  expect(meanAbsoluteSample(turn, 200, 2_200)).toBeGreaterThan(1000);

  expect(meanAbsoluteSample(pause, 100, 700)).toBeGreaterThan(1000);
  expect(
    meanAbsoluteSample(pause, PAUSE_GAP_MS.startMs + 100, PAUSE_GAP_MS.endMs - 100),
  ).toBeLessThan(20);
  expect(meanAbsoluteSample(pause, PAUSE_GAP_MS.endMs + 100, 2_200)).toBeGreaterThan(1000);

  const paceEvents = [{ type: "pace_change" as const, audio_offset_ms: PACE_AT_MS }];
  const before = sketchMelody(600, PREVIEW_MS, paceEvents);
  const after = sketchMelody(1_800, PREVIEW_MS, paceEvents);
  expect(after.amplitude).toBeGreaterThan(before.amplitude);
  expect(before.harmonic).toBe(0);
  expect(after.harmonic).toBeGreaterThan(0);
  expect(meanAbsoluteSample(pace, 1_400, 2_200)).toBeGreaterThan(
    meanAbsoluteSample(pace, 200, 1_000),
  );
});

test("the three figures show different mappings", () => {
  const [turn, pause, pace] = momentExamples;
  expect(turn.routes[0]).toContain(`H${turn.align}V`);
  expect(turn.contour).toContain(`L${turn.align} 120`);
  const [left, right] = pause.routes;
  const leftEnd = Number(left.slice(left.lastIndexOf("H") + 1));
  const rightStart = Number(right.slice(1, right.indexOf(" ")));
  expect(pause.silence?.x1).toBe(leftEnd);
  expect(pause.silence?.x2).toBe(rightStart);
  expect(rightStart - leftEnd).toBeGreaterThan(40);
  for (const bar of pause.bars) {
    const inside = bar.x > leftEnd && bar.x < rightStart;
    expect(inside).toBe(false);
  }
  const slow = pace.samples.filter((x) => x < pace.align);
  const fast = pace.samples.filter((x) => x > pace.align);
  const spacing = (points: number[]) =>
    points.slice(1).reduce((total, point, index) => total + point - points[index], 0) /
    (points.length - 1);
  expect(spacing(fast)).toBeLessThan(spacing(slow));
  const shortPulse = pace.bars.filter((bar) => bar.x < pace.align);
  const tallPulse = pace.bars.filter((bar) => bar.x > pace.align);
  expect(Math.max(...shortPulse.map((bar) => bar.height))).toBeLessThan(
    Math.min(...tallPulse.map((bar) => bar.height)),
  );
});

test("moment cards stay visible and do not play until asked", async ({ page }) => {
  const requests: string[] = [];
  page.on("request", (request) => requests.push(request.url()));
  await page.goto("/");
  const section = page.getByRole("region", { name: "Hear what a moment does" });
  await expect(section.getByText("illustrations, not generated pieces")).toBeVisible();
  await expect(section.getByRole("img")).toHaveCount(3);
  await expect(section.getByRole("button", { name: "Preview turn illustration" })).toBeVisible();
  await expect(section.getByRole("button", { name: "Preview pause illustration" })).toBeVisible();
  await expect(section.getByRole("button", { name: "Preview pace illustration" })).toBeVisible();
  const audio = section.locator("[data-moment-preview]");
  await expect
    .poll(async () => audio.evaluate((element) => (element as HTMLAudioElement).paused))
    .toBe(true);
  expect(await audio.evaluate((element) => (element as HTMLAudioElement).currentSrc)).toBe("");
  expect(requests.some((url) => /eleven|generativelanguage|huggingface|gemini/i.test(url))).toBe(
    false,
  );
});

test("a new preview stops the previous one, and hiding or leaving stops playback", async ({
  page,
}) => {
  await page.goto("/");
  const section = page.getByRole("region", { name: "Hear what a moment does" });
  const audio = section.locator("[data-moment-preview]");
  await section.getByRole("button", { name: "Preview turn illustration" }).click();
  await expect.poll(async () => playingSrc(audio)).toContain("blob:");
  await section.getByRole("button", { name: "Preview pace illustration" }).click();
  await expect(section.getByRole("button", { name: "Stop pace illustration" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(section.getByRole("button", { name: "Preview turn illustration" })).toHaveAttribute(
    "aria-pressed",
    "false",
  );
  await expect.poll(async () => page.locator("audio").count()).toBe(1);
  await expect.poll(async () => playingSrc(audio)).toContain("blob:");

  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", { configurable: true, get: () => true });
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      get: () => "hidden",
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect(section.getByRole("button", { name: "Preview pace illustration" })).toBeVisible();
  await expect
    .poll(async () => audio.evaluate((element) => (element as HTMLAudioElement).paused))
    .toBe(true);

  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", { configurable: true, get: () => false });
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      get: () => "visible",
    });
  });
  await section.getByRole("button", { name: "Preview turn illustration" }).click();
  await expect.poll(async () => playingSrc(audio)).toContain("blob:");
  await page.getByRole("button", { name: "Start walking" }).first().click();
  await page.getByRole("button", { name: "Begin practice walk" }).click();
  await expect(page.getByRole("heading", { name: "Practice walk" })).toBeVisible();
  await expect
    .poll(async () =>
      page.evaluate(
        () =>
          [...document.querySelectorAll("audio")].filter(
            (element) => !(element as HTMLAudioElement).paused,
          ).length,
      ),
    )
    .toBe(0);
});

test("reduced motion keeps the static figures and their words", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const section = page.getByRole("region", { name: "Hear what a moment does" });
  await expect(section.getByRole("img", { name: /sharp route corner/ })).toBeVisible();
  await expect(section.getByRole("img", { name: /disconnected route/ })).toBeVisible();
  await expect(section.getByRole("img", { name: /musical pulse gets taller/ })).toBeVisible();
  await expect(section.getByText("A sharp corner changes the melody's direction.")).toBeVisible();
  await expect(section.getByText("A pause becomes silence.")).toBeVisible();
  await expect(section.getByText("A change in pace makes the pulse taller.")).toBeVisible();
  const paths = await section.locator("svg path, svg line, svg circle, svg rect").count();
  expect(paths).toBeGreaterThan(10);
});

for (const width of [390, 1280]) {
  test(`moment cards fit ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 900 });
    await page.goto("/");
    const cards = page.locator(".moment-card");
    await expect(cards).toHaveCount(3);
    const boxes = await cards.evaluateAll((nodes) =>
      nodes.map((node) => {
        const box = node.getBoundingClientRect();
        return { x: box.x, y: box.y, width: box.width, height: box.height };
      }),
    );
    if (width === 390) {
      expect(boxes[1].y).toBeGreaterThanOrEqual(boxes[0].y + boxes[0].height - 1);
      expect(boxes[2].y).toBeGreaterThanOrEqual(boxes[1].y + boxes[1].height - 1);
    } else {
      expect(Math.abs(boxes[1].y - boxes[0].y)).toBeLessThan(8);
      expect(Math.abs(boxes[2].y - boxes[0].y)).toBeLessThan(8);
      expect(boxes[1].x).toBeGreaterThan(boxes[0].x);
      expect(boxes[2].x).toBeGreaterThan(boxes[1].x);
    }
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1,
    );
    expect(overflow).toBe(true);
  });
}

test("moment examples have no serious accessibility violations", async ({ page }) => {
  await page.goto("/");
  const results = await new AxeBuilder({ page })
    .include("section[aria-labelledby='moment-title']")
    .analyze();
  const blocking = results.violations.filter(
    (violation) => violation.impact === "serious" || violation.impact === "critical",
  );
  expect(blocking).toEqual([]);
});

function playingSrc(audio: ReturnType<Page["locator"]>) {
  return audio.evaluate((element) => {
    const player = element as HTMLAudioElement;
    return player.paused ? "" : player.currentSrc;
  });
}
