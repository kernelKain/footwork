import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

async function installWatch(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const timers = new Map<number, number>();
    let nextId = 1;
    const samples = [
      { latitude: 12.9716, longitude: 77.5946, accuracy: 8, timestamp: 1_700_000_000_000 },
      { latitude: 12.972, longitude: 77.595, accuracy: 10, timestamp: 1_700_000_001_500 },
    ];
    navigator.geolocation.watchPosition = (success) => {
      const id = nextId;
      nextId += 1;
      let index = 0;
      const timer = window.setInterval(() => {
        const sample = samples[index];
        index += 1;
        if (!sample) {
          window.clearInterval(timer);
          return;
        }
        success({
          coords: {
            latitude: sample.latitude,
            longitude: sample.longitude,
            accuracy: sample.accuracy,
            altitude: null,
            altitudeAccuracy: null,
            heading: null,
            speed: null,
            toJSON() {
              return this;
            },
          },
          timestamp: sample.timestamp,
          toJSON() {
            return this;
          },
        });
      }, 20);
      timers.set(id, timer);
      return id;
    };
    navigator.geolocation.clearWatch = (id) => {
      const timer = timers.get(id);
      if (timer !== undefined) window.clearInterval(timer);
      timers.delete(id);
    };
  });
}

async function expectNoHorizontalOverflow(page: Page): Promise<void> {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1,
  );
  expect(overflow).toBe(true);
}

async function tabTo(page: Page, name: string): Promise<void> {
  for (let step = 0; step < 24; step += 1) {
    await page.keyboard.press("Tab");
    const focused = page.locator(":focus");
    const text = await focused.innerText().catch(() => "");
    if (!text.includes(name)) continue;
    const outline = await focused.evaluate((element) => getComputedStyle(element).outlineStyle);
    expect(outline).not.toBe("none");
    return;
  }
  throw new Error(`keyboard did not reach ${name}`);
}

async function expectCoreContrast(page: Page): Promise<void> {
  const ratios = await page.evaluate(() => {
    const channel = (value: string) => {
      const match = value.match(/rgba?\(([^)]+)\)/);
      if (!match) return null;
      const parts = match[1].split(",").map((part) => Number.parseFloat(part.trim()));
      if (parts.length < 3 || (parts[3] !== undefined && parts[3] < 0.2)) return null;
      return parts.slice(0, 3);
    };
    const linear = (channelValue: number) => {
      const unit = channelValue / 255;
      return unit <= 0.04045 ? unit / 12.92 : ((unit + 0.055) / 1.055) ** 2.4;
    };
    const luminance = (rgb: number[]) =>
      0.2126 * linear(rgb[0]) + 0.7152 * linear(rgb[1]) + 0.0722 * linear(rgb[2]);
    const ratio = (foreground: number[], background: number[]) => {
      const lighter = Math.max(luminance(foreground), luminance(background));
      const darker = Math.min(luminance(foreground), luminance(background));
      return (lighter + 0.05) / (darker + 0.05);
    };
    const backgroundOf = (element: Element) => {
      let current: Element | null = element;
      while (current) {
        const parsed = channel(getComputedStyle(current).backgroundColor);
        if (parsed) return parsed;
        current = current.parentElement;
      }
      return [8, 12, 24];
    };
    const nodes = [
      document.body,
      document.querySelector("h1"),
      document.querySelector(".lede, .muted, figcaption, .journey-footer"),
      document.querySelector(".ui-button-primary, .action"),
    ].filter((node): node is Element => node !== null);
    return nodes.map((node) => {
      const foreground = channel(getComputedStyle(node).color);
      return foreground ? ratio(foreground, backgroundOf(node)) : 0;
    });
  });
  expect(ratios.length).toBeGreaterThan(0);
  for (const value of ratios) expect(value).toBeGreaterThanOrEqual(4.5);
}

for (const width of [390, 1280]) {
  test(`live walk starts and pauses from the keyboard at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 800 });
    await installWatch(page);
    await page.goto("/");
    await tabTo(page, "Start walking");
    await page.keyboard.press("Enter");
    const consent = page.getByRole("button", { name: "Use my location" });
    await expect(consent).toBeFocused();
    const outline = await consent.evaluate((element) => getComputedStyle(element).outlineStyle);
    expect(outline).not.toBe("none");
    await page.keyboard.press("Enter");
    await expect(page.getByRole("heading", { name: "Recording" })).toBeVisible();
    await expectNoHorizontalOverflow(page);
    const pause = page.getByRole("button", { name: "Pause walk" });
    const box = await pause.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(width + 1);
    expect(box!.y + box!.height).toBeLessThanOrEqual((page.viewportSize()?.height ?? 0) + 1);
    await tabTo(page, "Pause walk");
    await page.keyboard.press("Enter");
    await expect(page.getByRole("heading", { name: "Walk paused" })).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });

  test(`example playback works from the keyboard at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 800 });
    await page.goto("/studio");
    await tabTo(page, "Play");
    const play = page.getByRole("button", { name: "Play", exact: true });
    const box = await play.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(width + 1);
    await page.keyboard.press("Enter");
    await expect(page.getByRole("button", { name: "Pause", exact: true })).toBeVisible();
    const scrubber = page.getByRole("slider", { name: "Scrub Soundprint" });
    await expect(scrubber).toBeVisible();
    await scrubber.focus();
    await page.keyboard.press("ArrowRight");
    await expectNoHorizontalOverflow(page);
    await expectCoreContrast(page);
  });
}

for (const theme of ["light", "dark"] as const) {
  for (const width of [390, 1280]) {
    test(`${theme} core pages meet contrast and axe at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: width === 390 ? 844 : 800 });
      await page.addInitScript((name) => {
        localStorage.setItem("footwork-theme", name);
      }, theme);
      for (const path of ["/", "/studio"]) {
        await page.goto(path);
        await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
        await expectCoreContrast(page);
        const results = await new AxeBuilder({ page }).analyze();
        const blocking = results.violations.filter(
          (violation) => violation.impact === "serious" || violation.impact === "critical",
        );
        expect(blocking).toEqual([]);
      }
    });
  }
}

test("reduced motion ends a live walk from the keyboard", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await installWatch(page);
  await page.goto("/");
  await tabTo(page, "Start walking");
  await page.keyboard.press("Enter");
  await page.getByRole("button", { name: "Use my location" }).press("Enter");
  await expect(page.getByRole("heading", { name: "Recording" })).toBeVisible();
  await tabTo(page, "Hold to end walk");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("button", { name: "Confirm end walk" })).toBeVisible();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/studio$/);
  const recovery = page.getByRole("heading", { name: "The piece is not ready" });
  await expect(recovery).toBeVisible();
  await expectNoHorizontalOverflow(page);
  const example = page.getByRole("button", { name: "Hear the example" });
  const box = await example.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(390 + 1);
  await tabTo(page, "Hear the example");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("button", { name: "Play", exact: true })).toBeVisible();
  await expectNoHorizontalOverflow(page);
});
