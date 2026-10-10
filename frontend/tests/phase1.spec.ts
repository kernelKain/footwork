import { expect, test, type Page } from "@playwright/test";

async function expectNoHorizontalOverflow(page: Page): Promise<void> {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1,
  );
  expect(overflow).toBe(true);
}

test("supported routes survive a reload and unknown addresses stay local", async ({ page }) => {
  await page.goto("/studio");
  await page.reload();
  await expect(page).toHaveURL(/\/studio$/);
  await expect(page.getByText("Example walk")).toBeVisible();

  await page.goto("/#how-it-works");
  await expect(page.getByRole("heading", { name: "Your walk becomes music" })).toBeVisible();
  await page.reload();
  await expect(page).toHaveURL(/\/#how-it-works$/);
  await expect(page.getByRole("heading", { name: "Your walk becomes music" })).toBeVisible();

  await page.goto("/");
  await page.reload();
  await expect(page.getByRole("heading", { name: "Turn a walk into music." })).toBeVisible();

  await page.goto("/missing");
  await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Back to the walk" })).toBeVisible();
});

test("the readiness sheet takes focus and escape returns it", async ({ page }) => {
  await page.goto("/");
  const start = page.getByRole("button", { name: "Start walking" }).first();
  await start.click();
  const dialog = page.getByRole("dialog", { name: "Before this practice walk" });
  await expect(dialog).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(() => {
        const active = document.activeElement;
        const open = document.querySelector("dialog[open]");
        return Boolean(open && active && open.contains(active));
      }),
    )
    .toBe(true);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(start).toBeFocused();
});

test("keyboard reaches every Soundprint action", async ({ page }) => {
  await page.goto("/studio");
  const wanted = [
    "Play",
    "Replay",
    "Scrub Soundprint",
    "Turn",
    "Pause",
    "Pace change",
    "About this example",
    "Start another walk",
  ];
  const seen = new Set<string>();
  for (let step = 0; step < 16; step += 1) {
    await page.keyboard.press("Tab");
    const name = await page.evaluate(() => {
      const active = document.activeElement;
      if (!(active instanceof HTMLElement)) return "";
      return `${active.getAttribute("aria-label") ?? ""} ${active.textContent ?? ""}`;
    });
    for (const item of wanted) {
      if (name.includes(item)) seen.add(item);
    }
  }
  expect([...seen].sort()).toEqual([...wanted].sort());
});

test("larger text stays on screen at 360px", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.addInitScript(() => {
    document.documentElement.style.fontSize = "32px";
  });
  await page.goto("/");
  const start = page.getByRole("button", { name: "Start walking" }).first();
  await expect(start).toBeVisible();
  const box = await start.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.height).toBeGreaterThanOrEqual(48);
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(361);
  await expectNoHorizontalOverflow(page);

  await page.goto("/studio");
  const play = page.getByRole("button", { name: "Play", exact: true });
  await expect(play).toBeVisible();
  const playBox = await play.boundingBox();
  expect(playBox).not.toBeNull();
  expect(playBox!.height).toBeGreaterThanOrEqual(44);
  await expectNoHorizontalOverflow(page);
});

test("reduced motion keeps the generation line visible", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(() => sessionStorage.setItem("footwork-generation", "run"));
  await page.goto("/studio");
  const stage = page.locator(".generation-stage");
  await expect(stage).toBeVisible();
  const opacity = await stage.evaluate((element) => Number(getComputedStyle(element).opacity));
  expect(opacity).toBeGreaterThan(0.9);
});

test("a throttled mobile profile still reaches the landing", async ({ page }) => {
  const client = await page.context().newCDPSession(page);
  await client.send("Network.emulateNetworkConditions", {
    offline: false,
    downloadThroughput: (1.6 * 1024 * 1024) / 8,
    uploadThroughput: (750 * 1024) / 8,
    latency: 150,
  });
  await client.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  const started = Date.now();
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Turn a walk into music." })).toBeVisible();
  const elapsedMs = Date.now() - started;
  const studioStarted = Date.now();
  await page.goto("/studio");
  await expect(page.getByText("Example walk")).toBeVisible();
  const studioMs = Date.now() - studioStarted;
  const timing = await page.evaluate(() => {
    const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming;
    const resources = performance.getEntriesByType("resource") as PerformanceResourceTiming[];
    const encodedBytes = resources.reduce((sum, item) => sum + item.encodedBodySize, 0);
    return {
      domContentLoadedMs: Math.round(nav.domContentLoadedEventEnd),
      loadMs: Math.round(nav.loadEventEnd),
      documentBytes: nav.transferSize,
      encodedResourceBytes: encodedBytes,
    };
  });
  console.log(JSON.stringify({ elapsedMs, studioMs, ...timing }));
  expect(elapsedMs).toBeLessThan(15000);
  expect(studioMs).toBeLessThan(15000);
  expect(timing.domContentLoadedMs).toBeGreaterThan(0);
});
