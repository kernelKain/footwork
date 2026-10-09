import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import type { DemoFixture } from "../src/contracts/types";
import {
  drawnSpans,
  formatDistance,
  playbackPoint,
  ribbonBands,
  speedLine,
} from "../src/studio/journeyModel";

const mixedPath = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../fixtures/synthetic/movement-summary-mixed.json",
);

function loadMixed(): DemoFixture {
  return JSON.parse(readFileSync(mixedPath, "utf8")) as DemoFixture;
}

async function expectNoHorizontalOverflow(page: Page): Promise<void> {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1,
  );
  expect(overflow).toBe(true);
}

test("movement spans keep manual breaks and uncertain intervals disconnected", () => {
  const fixture = loadMixed();
  const spans = drawnSpans(fixture.result.route.points, fixture.result.movement_summary);
  expect(spans.map((span) => span.kind)).toEqual(["segment"]);
  const extended = structuredClone(fixture);
  extended.result.route.points.push(
    { x: 0.7, y: 0.4, t_ms: 36000 },
    { x: 0.8, y: 0.5, t_ms: 44000 },
  );
  const withReturn = drawnSpans(extended.result.route.points, extended.result.movement_summary);
  expect(withReturn.map((span) => span.kind)).toEqual(["segment", "break", "segment"]);
  expect(withReturn[1]?.id).toBe("break-seat");
  const bands = ribbonBands(extended.result.movement_summary, extended.result.duration_ms);
  expect(bands.map((band) => band.kind).sort()).toEqual([
    "break",
    "segment",
    "segment",
    "uncertain",
  ]);
  const duringBreak = playbackPoint(
    extended.result.route.points,
    extended.result.movement_summary,
    27000,
  );
  expect(duringBreak.t_ms).toBe(24000);
  expect(speedLine({ ...fixture.result.movement_summary, average_moving_speed_mps: null })).toBe(
    "Not enough clear data for an average speed.",
  );
  expect(formatDistance(96)).toBe("96");
  expect(formatDistance(1.5)).toBe("1.5");
  expect(formatDistance(0.25)).toBe("0.25");
});

test("the example recap shows published totals and withholds an unclear speed", async ({
  page,
}) => {
  await page.goto("/studio");
  await expect(page.getByRole("heading", { name: "Journey at a glance" })).toBeVisible();
  const glance = page.getByRole("region", { name: "Journey at a glance" });
  await expect(glance.getByText("Active time")).toBeVisible();
  await expect(glance.getByText("Total time")).toBeVisible();
  await expect(glance.getByText("96 m")).toBeVisible();
  await expect(glance.getByText("3", { exact: true })).toBeVisible();
  await expect(
    glance.getByText("Not enough clear data for relative pace.", { exact: true }),
  ).toBeVisible();
  await expect(page.locator("body")).not.toContainText("m/s");
  await expect(page.locator("body")).not.toContainText("calories");
  await expect(page.locator("body")).not.toContainText("heart");
  await expect(page.locator("body")).not.toContainText("elevation");
  await expect(page.locator("body")).not.toContainText("latitude");
  await expect(page.locator(".route-figure [data-kind='segment']")).toHaveCount(1);
  await expect(page.locator(".route-figure [data-kind='break']")).toHaveCount(0);
  await expect(page.locator(".ribbon [data-kind='break']")).toHaveCount(0);
  await expect(page.locator(".ribbon [data-kind='uncertain']")).toHaveCount(0);
  await expect(page.getByRole("region", { name: "Journey composition" })).toContainText("Turns 1");
  await expect(page.getByRole("region", { name: "Journey composition" })).toContainText(
    "Detected pauses 1",
  );
  await expect(page.getByRole("region", { name: "Journey composition" })).toContainText("Loops 0");
  await expect(page.getByRole("region", { name: "Journey composition" })).toContainText(
    "Counts of accepted moments",
  );

  const details = page.getByRole("button", { name: "About this example" });
  await expect(details).toHaveAttribute("aria-expanded", "false");
  await details.click();
  await expect(page.getByText("Location clarity is limited.")).toBeVisible();
  await expect(page.getByText("Not enough clear data for an average speed.")).toBeVisible();
  await expect(page.getByText("No manual breaks are in this summary.")).toBeVisible();
});

test("moment cards, the ribbon, and the route share one clock", async ({ page }) => {
  await page.goto("/studio");
  await page.getByRole("button", { name: /Melody changed direction/ }).click();
  const route = Number(await page.locator(".route-cursor").getAttribute("data-time-ms"));
  const ribbon = Number(await page.locator(".graph-playhead").getAttribute("data-time-ms"));
  const story = Number(await page.locator("[data-story-time]").getAttribute("data-story-time"));
  expect(Math.abs(route - 18000)).toBeLessThanOrEqual(500);
  expect(Math.abs(ribbon - route)).toBeLessThanOrEqual(500);
  expect(Math.abs(story - route)).toBeLessThanOrEqual(500);
  await expect(page.locator(".mapping-list").getByRole("button", { name: /Turn/ })).toContainText(
    "Now",
  );
});

test("looping walker motion pauses when the page is hidden", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 });
  await page.goto("/studio");
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await page.locator(".route-figure").scrollIntoViewIfNeeded();
  const leg = page.locator(".route-cursor .walker-leg").first();
  await expect
    .poll(async () => leg.evaluate((element) => getComputedStyle(element).animationPlayState))
    .toBe("running");
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", { configurable: true, get: () => true });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect
    .poll(async () => leg.evaluate((element) => getComputedStyle(element).animationPlayState))
    .toBe("paused");
});

test("reduced motion shows the finished route and a still walker", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/studio");
  await expect(page.getByText("96 m")).toBeVisible();
  const routeMotion = await page.locator(".route-figure .route-path").evaluate((element) => {
    const style = getComputedStyle(element);
    return style.animationName;
  });
  expect(routeMotion).toBe("none");
  const legMotion = await page
    .locator(".route-cursor .walker-leg")
    .first()
    .evaluate((element) => {
      return getComputedStyle(element).animationName;
    });
  expect(legMotion).toBe("none");
});

test("the walker is still while a practice walk is paused", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Start walking" }).first().click();
  await page
    .getByRole("dialog", { name: "Before this practice walk" })
    .getByRole("button", { name: "Begin practice walk" })
    .click();
  await expect(page.locator(".walker-stride")).toBeVisible();
  await page.getByRole("button", { name: "Pause walk" }).click();
  await expect(page.getByRole("heading", { name: "Walk paused" })).toBeVisible();
  await expect(page.locator(".walker-still")).toBeVisible();
  await expect(page.locator(".walker-stride")).toHaveCount(0);
});

test("generation shows the four stage figures without a percent", async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem("footwork-generation", "run"));
  await page.goto("/studio");
  const figure = page.locator(".generation-figure");
  await expect(figure).toHaveAttribute("data-stage", "reading_walk");
  await expect(figure).toHaveAttribute("data-stage", "finding_moments");
  await expect(figure).toHaveAttribute("data-stage", "shaping_music");
  await expect(figure).toHaveAttribute("data-stage", "recording_piece");
  await expect(page.locator("body")).not.toContainText("%");
});

for (const width of [360, 1280]) {
  test(`journey recap stays in one column at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: width >= 768 ? 900 : 800 });
    await page.goto("/studio");
    const play = await page.getByRole("button", { name: "Play", exact: true }).boundingBox();
    const glance = await page.getByRole("heading", { name: "Journey at a glance" }).boundingBox();
    const route = await page.getByRole("img", { name: "Example route" }).boundingBox();
    const ribbon = await page.getByRole("heading", { name: "Movement ribbon" }).boundingBox();
    expect(play && glance && route && ribbon).toBeTruthy();
    expect(play!.y).toBeLessThan(glance!.y);
    expect(glance!.y).toBeLessThan(route!.y);
    expect(route!.y).toBeLessThan(ribbon!.y);
    await expectNoHorizontalOverflow(page);
  });
}

test("the soundprint recap has no serious accessibility violations", async ({ page }) => {
  await page.goto("/studio");
  const results = await new AxeBuilder({ page }).analyze();
  expect(
    results.violations.filter(
      (violation) => violation.impact === "serious" || violation.impact === "critical",
    ),
  ).toEqual([]);
});
