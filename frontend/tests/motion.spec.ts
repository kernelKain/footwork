import { expect, test } from "./practicePage";

test("playback motion follows the clock and stays synchronized", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/studio");
  const cover = page.locator(".studio-cover .cover-signature");
  const journey = page.locator(".route-figure .route-path").first();
  const leg = page.locator(".route-cursor .walker-leg").first();
  expect(
    await page
      .locator(".studio-cover")
      .evaluate((element) => getComputedStyle(element).transitionProperty),
  ).toBe("box-shadow");
  expect(
    await page
      .locator(".moment-wave")
      .first()
      .evaluate((element) => getComputedStyle(element).transitionProperty),
  ).toBe("transform");

  await expect
    .poll(async () => cover.evaluate((element) => getComputedStyle(element).animationName))
    .toBe("route-draw");
  expect(await cover.evaluate((element) => getComputedStyle(element).animationIterationCount)).toBe(
    "1",
  );
  expect(await journey.evaluate((element) => getComputedStyle(element).animationName)).toBe("none");
  expect(await leg.evaluate((element) => getComputedStyle(element).animationName)).toBe("none");
  expect(
    await page
      .locator(".studio-result")
      .evaluate((element) => getComputedStyle(element).animationName),
  ).toBe("result-ready");

  await page.getByRole("button", { name: "Play", exact: true }).click();
  await expect(page.locator(".studio")).toHaveClass(/is-playing/);
  const glow = await page
    .locator(".studio-cover")
    .evaluate((element) => getComputedStyle(element).boxShadow);
  expect(glow).not.toBe("none");
  await page.locator(".route-figure").scrollIntoViewIfNeeded();
  await expect
    .poll(async () => leg.evaluate((element) => getComputedStyle(element).animationPlayState))
    .toBe("running");

  await page.getByRole("button", { name: /Melody changed direction/ }).click();
  const live = page.locator(".route-marker.is-live");
  await expect(live).toHaveCount(1);
  expect(await live.evaluate((element) => getComputedStyle(element).animationName)).toBe(
    "event-pulse",
  );
  expect(
    await page
      .locator(".route-marker:not(.is-live)")
      .first()
      .evaluate((element) => getComputedStyle(element).animationName),
  ).toBe("none");
  const wave = await page
    .locator(".moment-card.is-active .moment-wave")
    .first()
    .evaluate((element) => getComputedStyle(element).transform);
  expect(wave).not.toBe("none");

  const route = Number(await page.locator(".route-cursor").getAttribute("data-time-ms"));
  const ribbon = Number(await page.locator(".graph-playhead").getAttribute("data-time-ms"));
  const story = Number(await page.locator("[data-story-time]").getAttribute("data-story-time"));
  expect(Math.abs(route - 18_000)).toBeLessThanOrEqual(500);
  expect(Math.abs(ribbon - route)).toBeLessThanOrEqual(500);
  expect(Math.abs(story - route)).toBeLessThanOrEqual(500);
  await expect(page.locator(".now-playing")).toContainText("Now playing Corner");
});

test("hiding the page pauses result motion", async ({ page }) => {
  await page.goto("/studio");
  const cover = page.locator(".studio-cover .cover-signature");
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await page.locator(".route-figure").scrollIntoViewIfNeeded();
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", { configurable: true, get: () => true });
    Object.defineProperty(document, "visibilityState", { configurable: true, get: () => "hidden" });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect
    .poll(async () => cover.evaluate((element) => getComputedStyle(element).animationPlayState))
    .toBe("paused");
  await expect
    .poll(async () =>
      page
        .locator(".route-cursor .walker-leg")
        .first()
        .evaluate((element) => getComputedStyle(element).animationPlayState),
    )
    .toBe("paused");
  await expect(page.locator(".now-playing")).toContainText("Now playing");
});

test("reduced motion keeps the finished route, marker, progress, and text", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/studio");
  await expect(page.locator(".now-playing")).toBeVisible();
  for (const selector of [".studio-cover", ".moment-wave", ".scrubber"]) {
    expect(
      await page
        .locator(selector)
        .first()
        .evaluate((element) => getComputedStyle(element).transitionProperty),
    ).toBe("none");
  }
  const opacity = await page.locator(".now-playing").evaluate((element) => {
    return Number(getComputedStyle(element).opacity);
  });
  expect(opacity).toBeGreaterThan(0.9);
  for (const selector of [
    ".studio-cover .cover-signature",
    ".route-figure .route-path",
    ".route-cursor .walker-leg",
  ]) {
    const name = await page
      .locator(selector)
      .first()
      .evaluate((element) => getComputedStyle(element).animationName);
    expect(name).toBe("none");
  }
  expect(
    await page
      .locator(".studio-result")
      .evaluate((element) => getComputedStyle(element).animationName),
  ).toBe("none");
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await expect(page.locator(".studio")).toHaveClass(/is-playing/);
  await page.getByRole("button", { name: /Melody changed direction/ }).click();
  const live = page.locator(".route-marker.is-live");
  await expect(live).toHaveCount(1);
  expect(await live.evaluate((element) => getComputedStyle(element).animationName)).toBe("none");
  const route = Number(await page.locator(".route-cursor").getAttribute("data-time-ms"));
  const ribbon = Number(await page.locator(".graph-playhead").getAttribute("data-time-ms"));
  expect(Math.abs(route - 18_000)).toBeLessThanOrEqual(500);
  expect(Math.abs(ribbon - route)).toBeLessThanOrEqual(500);
  await expect(page.locator(".now-playing")).toContainText("Now playing Corner");
});
