import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";
import { expect, test } from "./practicePage";
import {
  activeDurationMs,
  createRecordingDraft,
  elapsedDurationMs,
  manualBreakDurationMs,
  movementDuringManualBreak,
  parsePracticeDraft,
  pauseRecording,
  practiceRoutePieces,
  recordVisibilityGap,
  resumeRecording,
} from "../src/recording/practiceDraft";
import { PRACTICE_DRAFT_KEY, PRACTICE_RESUME_KEY } from "../src/recording/practicePort";

async function beginPractice(page: Page): Promise<void> {
  await page.getByRole("button", { name: "Start walking" }).first().click();
  const sheet = page.getByRole("dialog", { name: "Before this practice walk" });
  await sheet.getByRole("button", { name: "Begin practice walk" }).click();
  await expect(page.getByRole("heading", { name: "Practice walk" })).toBeVisible();
}

async function pauseWalk(page: Page): Promise<void> {
  await page.getByRole("button", { name: "Pause walk" }).click();
  await expect(page.getByRole("heading", { name: "Pausing walk" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Walk paused" })).toBeVisible();
}

async function clocks(
  page: Page,
): Promise<{ active: number; breakMs: number; current: number; elapsed: number }> {
  return page.locator(".recording-view").evaluate((element) => ({
    active: Number(element.getAttribute("data-active-ms")),
    breakMs: Number(element.getAttribute("data-break-ms")),
    current: Number(element.getAttribute("data-current-break-ms")),
    elapsed: Number(element.getAttribute("data-elapsed-ms")),
  }));
}

test("a manual break is timed separately and is not a route or a musical pause", () => {
  const started = createRecordingDraft();
  expect(recordVisibilityGap(started)).toBe(started);
  expect(started.breaks).toEqual([]);
  expect(movementDuringManualBreak()).toEqual({ distanceM: 0, points: [], events: [] });

  const paused = pauseRecording(started, 4000);
  expect(paused.status).toBe("paused");
  expect(paused.segments.map((segment) => segment.durationMs)).toEqual([4000]);
  expect(paused.breaks).toEqual([{ id: "break-1", durationMs: 0, open: true }]);
  expect(paused).not.toHaveProperty("distanceM");
  expect(paused).not.toHaveProperty("events");
  expect(activeDurationMs(paused)).toBe(4000);
  expect(manualBreakDurationMs(paused)).toBe(0);
  expect(elapsedDurationMs(paused)).toBe(4000);
  expect(practiceRoutePieces(paused).filter((piece) => piece.kind === "break")).toEqual([]);
  expect(pauseRecording(paused, 4000).breaks).toHaveLength(1);

  const resumed = resumeRecording(paused, 1500);
  expect(resumed.status).toBe("recording");
  expect(resumed.segments.map((segment) => segment.id)).toEqual(["segment-1", "segment-2"]);
  expect(resumed.segments.map((segment) => segment.durationMs)).toEqual([4000, 0]);
  expect(resumed.breaks).toEqual([{ id: "break-1", durationMs: 1500, open: false }]);
  expect(activeDurationMs(resumed)).toBe(4000);
  expect(manualBreakDurationMs(resumed)).toBe(1500);
  expect(elapsedDurationMs(resumed)).toBe(5500);
  expect(recordVisibilityGap(resumed).breaks).toEqual(resumed.breaks);

  const pieces = practiceRoutePieces(resumed);
  const segments = pieces.filter((piece) => piece.kind === "segment");
  const gaps = pieces.filter((piece) => piece.kind === "break");
  expect(segments).toHaveLength(2);
  expect(gaps).toHaveLength(1);
  for (const segment of segments) {
    expect(segment.d.includes(gaps[0]?.d ?? "")).toBe(false);
  }

  expect(parsePracticeDraft(JSON.stringify(paused))).toEqual(paused);
  expect(
    parsePracticeDraft(
      JSON.stringify({
        status: "recording",
        segments: [{ id: "segment-1", durationMs: 4000 }],
        breaks: [],
      }),
    ),
  ).toBeNull();
  expect(
    parsePracticeDraft(
      JSON.stringify({
        status: "paused",
        segments: [{ id: "segment-1", durationMs: 4000, points: [[1, 2]] }],
        breaks: [{ id: "break-1", durationMs: 0, open: true }],
      }),
    ),
  ).toBeNull();
});

test("pause and resume keep active time, break time, and focus apart", async ({ page }) => {
  await page.addInitScript(() => {
    let called = false;
    const mark = () => {
      called = true;
    };
    const geo = navigator.geolocation;
    geo.getCurrentPosition = mark as typeof geo.getCurrentPosition;
    geo.watchPosition = mark as typeof geo.watchPosition;
    Object.defineProperty(navigator, "wakeLock", {
      configurable: true,
      get: () => ({ request: mark }),
    });
    const open = indexedDB.open.bind(indexedDB);
    indexedDB.open = ((...args: Parameters<IDBFactory["open"]>) => {
      called = true;
      return open(...args);
    }) as IDBFactory["open"];
    Object.defineProperty(window, "__footworkDeviceCalled", { get: () => called });
  });
  await page.goto("/");
  await beginPractice(page);
  await expect(page.getByRole("button", { name: "Pause walk" })).toHaveClass(/ui-button-secondary/);
  await expect(page.getByRole("button", { name: "Hold to end walk" })).toHaveClass(
    /ui-button-destructive/,
  );
  await expect(page.getByText("Practice signal: clear")).toBeVisible();
  await expect.poll(async () => (await clocks(page)).active).toBeGreaterThan(0);

  await page.getByRole("button", { name: "Pause walk" }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { name: "Pausing walk" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Walk paused" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Resume walk" })).toBeFocused();
  await expect(
    page.getByText("Movement is not being recorded. Your walk is saved on this phone."),
  ).toBeVisible();
  await expect(page.locator(".ui-recording-dot")).toHaveCount(0);
  await expect(page.locator("[data-kind='segment']")).toHaveCount(1);
  await expect(page.locator("[data-kind='break']")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Resume walk" })).toHaveClass(/ui-button-primary/);

  const frozen = await clocks(page);
  expect(frozen.elapsed).toBe(frozen.active + frozen.breakMs);
  const activeText = await page.locator("[data-clock='active']").innerText();
  await expect.poll(async () => (await clocks(page)).breakMs).toBeGreaterThan(frozen.breakMs);
  const duringBreak = await clocks(page);
  expect(duringBreak.active).toBe(frozen.active);
  expect(duringBreak.elapsed).toBe(duringBreak.active + duringBreak.breakMs);
  expect(await page.locator("[data-clock='active']").innerText()).toBe(activeText);
  await expect(page.locator("[data-clock='elapsed']")).toContainText("Elapsed time");

  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { name: "Finding your location again" })).toBeFocused();
  await expect(page.getByRole("status")).toContainText("not using your location");
  await expect(page.getByRole("heading", { name: "Practice walk" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Pause walk" })).toBeFocused();

  const resumed = await clocks(page);
  expect(resumed.breakMs).toBeGreaterThan(duringBreak.breakMs);
  await expect.poll(async () => (await clocks(page)).active).toBeGreaterThan(resumed.active);
  const movingAgain = await clocks(page);
  expect(movingAgain.breakMs).toBe(resumed.breakMs);
  expect(movingAgain.elapsed).toBe(movingAgain.active + movingAgain.breakMs);
  await expect(page.locator(".ui-recording-dot")).toBeVisible();
  await expect(page.locator("[data-kind='segment']")).toHaveCount(2);
  await expect(page.locator("[data-kind='break']")).toHaveCount(1);
  await expect(page.locator("[data-kind='break']")).not.toHaveClass(/ui-route-line/);
  await expect(page.locator("[data-kind='break'] title")).toHaveText("Break. Not movement.");
  const breakPath = await page.locator("[data-kind='break']").getAttribute("d");
  const segmentPaths = await page
    .locator("[data-kind='segment']")
    .evaluateAll((nodes) => nodes.map((node) => node.getAttribute("d") ?? ""));
  expect(breakPath).toBeTruthy();
  for (const path of segmentPaths) expect(path.includes(breakPath ?? "")).toBe(false);
  await expect(page.locator("figcaption")).toContainText("not movement");

  await page.getByRole("button", { name: "Pause walk" }).click();
  await expect(page.getByRole("heading", { name: "Walk paused" })).toBeVisible();
  const secondPause = await clocks(page);
  expect(secondPause.current).toBeLessThan(secondPause.breakMs);
  expect(secondPause.elapsed).toBe(secondPause.active + secondPause.breakMs);

  const called = await page.evaluate(
    () => (window as unknown as { __footworkDeviceCalled: boolean }).__footworkDeviceCalled,
  );
  expect(called).toBe(false);
});

test("releasing the end control early leaves the paused walk in place", async ({ page }) => {
  await page.goto("/");
  await beginPractice(page);
  await pauseWalk(page);
  const hold = page.getByRole("button", { name: "Hold to end walk" });
  await hold.scrollIntoViewIfNeeded();
  const box = await hold.boundingBox();
  expect(box).not.toBeNull();
  await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(250);
  await page.mouse.up();
  await expect(page.getByRole("heading", { name: "Walk paused" })).toBeVisible();
  await expect(page.getByText("Nothing is being saved.")).toHaveCount(0);
});

test("reduced motion ends a paused walk from the keyboard without a recording pulse", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await beginPractice(page);
  const animation = await page
    .locator(".ui-recording-dot")
    .evaluate((element) => getComputedStyle(element).animationName);
  expect(animation).toBe("none");
  await pauseWalk(page);
  await expect(page.locator(".ui-recording-dot")).toHaveCount(0);
  const hold = page.getByRole("button", { name: "Hold to end walk" });
  await hold.focus();
  await page.keyboard.press("Enter");
  const confirm = page.getByRole("button", { name: "Confirm end walk" });
  await expect(confirm).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("heading", { name: "Walk paused" })).toBeVisible();
  await page.keyboard.press("Enter");
  await expect(page.getByText("No location was stored.")).toBeVisible();
  const stored = await page.evaluate((key) => sessionStorage.getItem(key), PRACTICE_DRAFT_KEY);
  expect(stored).toBeNull();
});

test("a paused practice walk is restored after reload", async ({ page }) => {
  const saved = {
    status: "paused",
    segments: [{ id: "segment-1", durationMs: 5000 }],
    breaks: [{ id: "break-1", durationMs: 2000, open: true }],
  };
  await page.addInitScript(
    ({ key, draft }) => {
      if (!sessionStorage.getItem(key)) sessionStorage.setItem(key, JSON.stringify(draft));
    },
    { key: PRACTICE_DRAFT_KEY, draft: saved },
  );
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Walk paused" })).toBeVisible();
  await expect(
    page.getByText("Movement is not being recorded. Your walk is saved on this phone."),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Resume walk" })).toBeFocused();
  await expect(page.locator("[data-clock='active']")).toContainText("00:05");
  expect((await clocks(page)).active).toBe(5000);
  await expect
    .poll(async () => {
      const raw = await page.evaluate((key) => sessionStorage.getItem(key), PRACTICE_DRAFT_KEY);
      const draft = JSON.parse(raw ?? "{}") as { breaks?: { durationMs: number }[] };
      return draft.breaks?.[0]?.durationMs ?? 0;
    })
    .toBeGreaterThanOrEqual(3000);

  await page.reload();
  await expect(page.getByRole("heading", { name: "Walk paused" })).toBeVisible();
  expect((await clocks(page)).active).toBe(5000);
  expect((await clocks(page)).breakMs).toBeGreaterThanOrEqual(3000);
  await page.getByRole("button", { name: "Resume walk" }).click();
  await expect(page.getByRole("heading", { name: "Finding your location again" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Practice walk" })).toBeVisible();
  await expect(page.locator("[data-kind='segment']")).toHaveCount(2);
  await expect(page.locator("[data-kind='break']")).toHaveCount(1);
  const breakPath = await page.locator("[data-kind='break']").getAttribute("d");
  const segmentPaths = await page
    .locator("[data-kind='segment']")
    .evaluateAll((nodes) => nodes.map((node) => node.getAttribute("d") ?? ""));
  for (const path of segmentPaths) expect(path.includes(breakPath ?? "")).toBe(false);
});

test("a recording draft is not restored as a paused walk", async ({ page }) => {
  await page.addInitScript((key) => {
    sessionStorage.setItem(
      key,
      JSON.stringify({
        status: "recording",
        segments: [{ id: "segment-1", durationMs: 4000 }],
        breaks: [],
      }),
    );
  }, PRACTICE_DRAFT_KEY);
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Start walking" }).first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "Walk paused" })).toHaveCount(0);
});

test("resume failure and cancel return to the paused walk", async ({ page }) => {
  await page.goto("/");
  await beginPractice(page);
  await pauseWalk(page);
  await page.evaluate((key) => sessionStorage.setItem(key, "denied"), PRACTICE_RESUME_KEY);
  await page.getByRole("button", { name: "Resume walk" }).click();
  await expect(page.getByRole("heading", { name: "Finding your location again" })).toBeVisible();
  await expect(page.getByRole("alert")).toContainText("Your walk is still paused.");
  await expect(page.getByRole("heading", { name: "Walk paused" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Resume walk" })).toBeVisible();
  await expect(page.locator("[data-kind='segment']")).toHaveCount(1);

  await page.evaluate((key) => sessionStorage.removeItem(key), PRACTICE_RESUME_KEY);
  await page.getByRole("button", { name: "Resume walk" }).click();
  await expect(page.getByRole("heading", { name: "Finding your location again" })).toBeVisible();
  await page.getByRole("button", { name: "Cancel" }).click();
  await expect(page.getByRole("heading", { name: "Walk paused" })).toBeVisible();
  await expect(page.locator("[data-kind='segment']")).toHaveCount(1);
  await expect(page.locator("[data-kind='break']")).toHaveCount(0);
});

test("hiding the page is not a manual break", async ({ page }) => {
  await page.goto("/");
  await beginPractice(page);
  await page.evaluate(() => {
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      get: () => "hidden",
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect(page.getByRole("heading", { name: "The page was hidden" })).toBeVisible();
  await expect(page.getByText("Nothing was stored on this phone.")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Walk paused" })).toHaveCount(0);
  const stored = await page.evaluate((key) => sessionStorage.getItem(key), PRACTICE_DRAFT_KEY);
  expect(stored).toBeNull();

  await page.getByRole("button", { name: "Start again" }).click();
  await beginPractice(page);
  await pauseWalk(page);
  await page.evaluate(() => {
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect(page.getByRole("heading", { name: "Walk paused" })).toBeVisible();
  const pausedDraft = await page.evaluate((key) => sessionStorage.getItem(key), PRACTICE_DRAFT_KEY);
  expect(pausedDraft).toContain('"open":true');
  expect(pausedDraft).not.toContain("points");
});

test("paused practice view has no serious accessibility violations", async ({ page }) => {
  await page.goto("/");
  await beginPractice(page);
  await pauseWalk(page);
  const results = await new AxeBuilder({ page }).analyze();
  const blocking = results.violations.filter(
    (violation) => violation.impact === "serious" || violation.impact === "critical",
  );
  expect(blocking).toEqual([]);
});
