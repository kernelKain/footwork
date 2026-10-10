import AxeBuilder from "@axe-core/playwright";
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
  const sheet = page.getByRole("dialog", { name: "Before this practice walk" });
  await expect(sheet).toContainText("does not ask");
  await sheet.getByRole("button", { name: "Begin practice walk" }).click();
}

test("practice walk explains location before a labeled recording", async ({ page }) => {
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
    Object.defineProperty(window, "__footworkDeviceCalled", { get: () => called });
  });
  await page.goto("/");
  const start = page.getByRole("button", { name: "Start walking" }).first();
  const startBox = await start.boundingBox();
  expect(startBox).not.toBeNull();
  expect(startBox!.height).toBeGreaterThanOrEqual(48);
  await beginPractice(page);
  await expect(page.getByRole("heading", { name: "Checking location" })).toBeVisible();
  await expect(page.getByRole("status")).toContainText("not using your location");
  await expect(page.getByRole("heading", { name: "Practice walk" })).toBeVisible();
  await expect(page.getByText("Recording", { exact: true })).toBeVisible();
  const timer = page.locator(".ui-timer");
  await expect(timer).toContainText("00:");
  const numeric = await timer.evaluate((element) => getComputedStyle(element).fontVariantNumeric);
  expect(numeric).toContain("tabular-nums");
  await expect(page.getByText("Practice signal: clear")).toBeVisible();
  await expect(page.getByText("Screen awake is not held")).toBeVisible();
  await expect(page.getByRole("img", { name: "Practice route. Not your location." })).toBeVisible();
  const dock = page.locator(".walk-dock");
  const dockBox = await dock.boundingBox();
  const viewport = page.viewportSize();
  expect(dockBox).not.toBeNull();
  expect(viewport).not.toBeNull();
  expect(dockBox!.y + dockBox!.height).toBeLessThanOrEqual((viewport?.height ?? 0) + 1);
  const holdBox = await page.getByRole("button", { name: "Hold to end walk" }).boundingBox();
  expect(holdBox).not.toBeNull();
  expect(holdBox!.height).toBeGreaterThanOrEqual(48);
  const called = await page.evaluate(
    () => (window as unknown as { __footworkDeviceCalled: boolean }).__footworkDeviceCalled,
  );
  expect(called).toBe(false);
});

test("releasing the end control early keeps the practice walk going", async ({ page }) => {
  await page.goto("/");
  await beginPractice(page);
  const hold = page.getByRole("button", { name: "Hold to end walk" });
  await hold.scrollIntoViewIfNeeded();
  const box = await hold.boundingBox();
  expect(box).not.toBeNull();
  await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(250);
  await page.mouse.up();
  await expect(page.getByRole("heading", { name: "Practice walk" })).toBeVisible();
  await expect(page.getByText("Nothing is being saved.")).toHaveCount(0);
});

test("holding to the end finishes the practice walk", async ({ page }) => {
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
  await expect(page.getByText("No location was stored.")).toBeVisible();
});

test("reduced motion confirms the end on a second press", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await beginPractice(page);
  await page.getByRole("button", { name: "Hold to end walk" }).click();
  const confirm = page.getByRole("button", { name: "Confirm end walk" });
  await expect(confirm).toHaveAttribute("aria-pressed", "true");
  await confirm.click();
  await expect(page.getByText("No location was stored.")).toBeVisible();
});

test("permission denial and an unsupported browser stay labeled as practice", async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem("footwork-practice", "denied"));
  await page.goto("/");
  await beginPractice(page);
  const denied = page.getByRole("alert");
  await expect(denied).toContainText("cannot use your location yet");
  await expect(denied).toContainText("did not open a location prompt");
  await expect(denied.getByRole("link", { name: "Hear an example" })).toBeVisible();

  await page.addInitScript(() => sessionStorage.setItem("footwork-practice", "unsupported"));
  await page.goto("/");
  await page.getByRole("button", { name: "Start walking" }).first().click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  const unsupported = page.getByRole("alert");
  await expect(unsupported).toContainText("cannot record a walk");
  await expect(unsupported).toContainText("did not ask for location");
});

test("offline and hidden-page practice states do not invent a saved walk", async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem("footwork-practice", "offline"));
  await page.goto("/");
  await beginPractice(page);
  await expect(page.getByRole("alert")).toContainText("offline");
  await expect(page.getByRole("alert")).toContainText("did not save a walk");

  await page.addInitScript(() => sessionStorage.setItem("footwork-practice", "interrupted"));
  await page.goto("/");
  await beginPractice(page);
  await expect(page.getByRole("alert")).toContainText("Missing time was not filled in");
  await expect(page.getByRole("alert")).toContainText("Nothing was stored");
});

test("moment controls are keyboard accessible", async ({ page }) => {
  await page.goto("/");
  let found = false;
  for (let step = 0; step < 30; step += 1) {
    await page.keyboard.press("Tab");
    const name = await page
      .locator(":focus")
      .evaluate((element) => (element instanceof HTMLElement ? element.innerText : ""));
    if (name.trim() === "Pause") {
      found = true;
      await page.keyboard.press("Enter");
      break;
    }
  }
  expect(found).toBe(true);
  const pause = page.getByRole("button", { name: "Pause Showing" });
  await expect(pause).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("figcaption", { hasText: "musical break" })).toBeVisible();
  const outline = await pause.evaluate((element) => getComputedStyle(element).outlineStyle);
  expect(outline).not.toBe("none");
});

for (const width of [360, 390, 430, 768, 1280]) {
  test(`landing and recording fit ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: width >= 768 ? 900 : 800 });
    await page.goto("/");
    await expectNoHorizontalOverflow(page);
    await beginPractice(page);
    await expect(page.getByRole("heading", { name: "Practice walk" })).toBeVisible();
    await expectNoHorizontalOverflow(page);
    const dock = await page.locator(".walk-dock").boundingBox();
    expect(dock).not.toBeNull();
    expect(dock!.x).toBeGreaterThanOrEqual(0);
    expect(dock!.x + dock!.width).toBeLessThanOrEqual(width + 1);
    expect(dock!.y + dock!.height).toBeLessThanOrEqual((page.viewportSize()?.height ?? 0) + 1);
  });
}

test("recording view has no serious accessibility violations", async ({ page }) => {
  await page.goto("/");
  await beginPractice(page);
  await expect(page.getByRole("heading", { name: "Practice walk" })).toBeVisible();
  const results = await new AxeBuilder({ page }).analyze();
  const blocking = results.violations.filter(
    (violation) => violation.impact === "serious" || violation.impact === "critical",
  );
  expect(blocking).toEqual([]);
});
