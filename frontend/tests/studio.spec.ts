import type { Page } from "@playwright/test";
import { expect, test } from "./practicePage";

async function expectNoHorizontalOverflow(page: Page): Promise<void> {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1,
  );
  expect(overflow).toBe(true);
}

async function beginPractice(page: Page): Promise<void> {
  await page.getByRole("button", { name: "Start walking" }).first().click();
  await page
    .getByRole("dialog", { name: "Before this practice walk" })
    .getByRole("button", { name: "Begin practice walk" })
    .click();
}

test("generation states stay honest and keep the result hidden", async ({ page }) => {
  await page.goto("/studio");
  await expect(page.getByRole("button", { name: "Show generation preview states" })).toHaveCount(0);
  await expect(page.getByRole("region", { name: "Sponsors" })).toHaveCount(0);
  await expect(page.getByRole("region", { name: "Provenance" })).toHaveCount(0);
  await expect(page.locator("body")).not.toContainText("synthetic_fixture");
  await expect(page.locator("body")).not.toContainText("mapping_status");
  await expect(page.locator("body")).not.toContainText("%");
  await expect(page.getByText("Generated from your walk")).toHaveCount(0);

  await page.addInitScript(() => sessionStorage.setItem("footwork-generation", "trace_too_short"));
  await page.goto("/studio");
  const empty = page.getByRole("alert");
  await expect(empty).toContainText("too short to shape a piece");
  await expect(empty.getByRole("button", { name: "Try again" })).toHaveCount(0);
  await expect(empty.getByRole("link", { name: "Start again" })).toBeVisible();
  await expect(page.getByRole("img", { name: "Example route" })).toHaveCount(0);

  await page.addInitScript(() => sessionStorage.setItem("footwork-generation", "timed_out"));
  await page.goto("/studio");
  const timeout = page.getByRole("alert");
  await expect(timeout).toContainText("took too long");
  await expect(page.getByRole("img", { name: "Example route" })).toHaveCount(0);
  await timeout.getByRole("button", { name: "Try again" }).click();
  await expect(page.getByRole("status")).toHaveText("Reading your walk.");
  await expect(page.getByRole("status")).not.toContainText(":");

  await page.addInitScript(() =>
    sessionStorage.setItem("footwork-generation", "arrangement_unavailable"),
  );
  await page.goto("/studio");
  await expect(page.getByRole("alert")).toContainText("music plan is unavailable");
  await expect(page.getByRole("img", { name: "Example route" })).toHaveCount(0);
  await page.getByRole("button", { name: "Hear the example" }).click();
  await expect(page.getByRole("img", { name: "Example route" })).toBeVisible();
  await expect(page.getByText("Example walk")).toBeVisible();

  await page.addInitScript(() =>
    sessionStorage.setItem("footwork-generation", "music_unavailable"),
  );
  await page.goto("/studio");
  await expect(page.getByRole("alert")).toContainText("studio recording is unavailable");
  await expect(page.getByRole("button", { name: "Try again" })).toBeVisible();

  await page.addInitScript(() => sessionStorage.setItem("footwork-generation", "generation_limit"));
  await page.goto("/studio");
  const limit = page.getByRole("alert");
  await expect(limit).toContainText("limit for new pieces");
  await expect(limit).not.toContainText("balance");
  await expect(limit.getByRole("button", { name: "Try again" })).toHaveCount(0);
});

test("a finished practice walk moves through the generation stages", async ({ page }) => {
  await page.goto("/");
  await beginPractice(page);
  const hold = page.getByRole("button", { name: "Hold to end walk" });
  await hold.scrollIntoViewIfNeeded();
  const box = await hold.boundingBox();
  expect(box).not.toBeNull();
  await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(2300);
  await page.mouse.up();
  const stage = page.locator(".generation-stage");
  await expect(stage).toHaveText("Reading your walk.");
  await expect(page.getByRole("status")).not.toContainText(":");
  await expect(page.getByText("No location was stored.")).toBeVisible();
  await expect(stage).toHaveText("Finding meaningful moments.");
  await expect(stage).toHaveText("Turning them into music.");
  await expect(stage).toHaveText("Creating your track.");
  await expect(page.getByText("Example walk")).toBeVisible({ timeout: 8000 });
  await expect(page.getByText("did not make a new track")).toBeVisible();
  await expect(page.getByText("Generated from your walk")).toHaveCount(0);
  await expect(page.locator("[aria-live='assertive']")).toHaveCount(0);
});

test("a second finished practice does not start another piece", async ({ page }) => {
  await page.addInitScript(() => {
    sessionStorage.setItem("footwork-generation", "run");
    sessionStorage.setItem("footwork-generation-complete", "1");
  });
  await page.goto("/studio");
  await expect(page.getByText("already finished")).toBeVisible();
  await expect(page.getByText("Example walk")).toBeVisible();
  await expect(page.getByText("Reading your walk.")).toHaveCount(0);
});

test("playback controls seek, replay, and stay quiet for assistive tech", async ({ page }) => {
  await page.goto("/studio");
  const cursor = page.locator(".route-cursor");
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await expect(page.getByRole("button", { name: "Pause", exact: true })).toBeVisible();
  await expect(page.locator("[role='status']")).toHaveCount(0);
  await expect(page.locator("[role='timer']")).toHaveCount(0);
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await page.getByRole("slider", { name: "Scrub Soundprint" }).press("ArrowRight");
  await expect
    .poll(async () => Number(await cursor.getAttribute("data-time-ms")))
    .toBeGreaterThan(0);
  await page.getByRole("button", { name: /change the energy/ }).focus();
  await page.keyboard.press("Enter");
  const paced = Number(await cursor.getAttribute("data-time-ms"));
  expect(Math.abs(paced - 48000)).toBeLessThanOrEqual(500);
  await page.getByRole("button", { name: "Replay" }).click();
  await expect
    .poll(async () => Number(await cursor.getAttribute("data-time-ms")))
    .toBeLessThanOrEqual(500);
});

for (const width of [360, 390, 430, 768, 1280]) {
  test(`soundprint layout holds at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: width >= 768 ? 900 : 800 });
    await page.goto("/studio");
    await expect(page.getByRole("heading", { name: "Corner and pause" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Moments in the music" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Walk story" })).toBeVisible();
    const play = await page.getByRole("button", { name: "Play", exact: true }).boundingBox();
    const route = await page.getByRole("img", { name: "Example route" }).boundingBox();
    expect(play).not.toBeNull();
    expect(route).not.toBeNull();
    expect(play!.y).toBeLessThan(route!.y);
    expect(play!.height).toBeGreaterThanOrEqual(44);
    await expectNoHorizontalOverflow(page);
  });
}

test("reduced motion keeps generation usable", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(() => sessionStorage.setItem("footwork-generation", "run"));
  await page.goto("/studio");
  const stage = page.locator(".generation-stage");
  await expect(stage).toHaveText("Reading your walk.");
  const duration = await stage.evaluate((element) => {
    const value = getComputedStyle(element).animationDuration;
    const seconds = Number.parseFloat(value);
    return value.endsWith("ms") ? seconds : seconds * 1000;
  });
  expect(duration).toBeLessThan(1);
  await expect(stage).toHaveText("Finding meaningful moments.");
});
