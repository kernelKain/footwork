import { expect, test } from "./practicePage";

test("choosing a marker aligns the route, graph, and story", async ({ page }) => {
  await page.goto("/studio");
  await expect(page.getByRole("region", { name: "Sponsors" })).toHaveCount(0);
  await expect(page.getByRole("region", { name: "Provenance" })).toHaveCount(0);

  await page.getByRole("button", { name: /change the melody/ }).click();

  const route = Number(await page.locator(".route-cursor").getAttribute("data-time-ms"));
  const graph = Number(await page.locator(".graph-playhead").getAttribute("data-time-ms"));
  const story = Number(await page.locator("[data-story-time]").getAttribute("data-story-time"));
  expect(Math.abs(route - 18000)).toBeLessThanOrEqual(500);
  expect(Math.abs(graph - route)).toBeLessThanOrEqual(500);
  expect(Math.abs(story - route)).toBeLessThanOrEqual(500);
  await expect(page.getByRole("region", { name: "Walk story" })).toContainText("Now");
  await expect(page.getByRole("region", { name: "Walk story" })).not.toContainText(
    "change the melody",
  );
  await expect(page.getByRole("region", { name: "Moments in the music" })).toContainText(
    "This change is planned.",
  );
  await expect(page.getByRole("region", { name: "Moments in the music" })).toContainText("Now");
});
