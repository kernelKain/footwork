import { expect, test } from "@playwright/test";

test("scrubbing and marker selection stay within 500 ms of the audio clock", async ({ page }) => {
  await page.goto("/studio");
  const cursor = page.locator(".route-cursor");
  const slider = page.getByRole("slider", { name: "Scrub Soundprint" });

  await slider.evaluate((element) => {
    const input = element as HTMLInputElement;
    input.value = "18000";
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await expect
    .poll(async () => Number(await cursor.getAttribute("data-time-ms")))
    .toBeGreaterThan(17000);
  const scrubbed = Number(await cursor.getAttribute("data-time-ms"));
  const scrubbedAudio = await page.locator("audio").evaluate((element) => {
    const audio = element as HTMLAudioElement;
    return audio.currentTime * 1000;
  });
  expect(Math.abs(scrubbed - 18000)).toBeLessThanOrEqual(500);
  expect(Math.abs(scrubbedAudio - scrubbed)).toBeLessThanOrEqual(500);

  await page.getByRole("button", { name: /Pause/ }).click();
  const paused = Number(await cursor.getAttribute("data-time-ms"));
  const pausedAudio = await page.locator("audio").evaluate((element) => {
    const audio = element as HTMLAudioElement;
    return audio.currentTime * 1000;
  });
  expect(Math.abs(paused - 36000)).toBeLessThanOrEqual(500);
  expect(Math.abs(pausedAudio - paused)).toBeLessThanOrEqual(500);
  await expect(page.getByRole("button", { name: /Pause/ })).toContainText("Now");
});
