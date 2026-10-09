import { expect, test } from "@playwright/test";

test("choosing a marker aligns the route, graph, and story", async ({ page }) => {
  await page.goto("/studio");
  await expect(page.getByRole("region", { name: "Provenance" })).toContainText(
    "Mapping status: planned",
  );
  await expect(page.getByRole("region", { name: "Sponsors" })).toContainText("did not call Gemma");

  await page.getByRole("button", { name: /Musical direction change is intended/ }).click();

  const route = Number(await page.locator(".route-cursor").getAttribute("data-time-ms"));
  const graph = Number(await page.locator(".graph-playhead").getAttribute("data-time-ms"));
  const story = Number(await page.locator("[data-story-time]").getAttribute("data-story-time"));
  expect(Math.abs(route - 18000)).toBeLessThanOrEqual(500);
  expect(Math.abs(graph - route)).toBeLessThanOrEqual(500);
  expect(Math.abs(story - route)).toBeLessThanOrEqual(500);
  await expect(page.getByRole("region", { name: "Movement Story" })).toContainText("Now");
  await expect(page.getByRole("region", { name: "Route–Sound Graph" })).toContainText("planned");
  await expect(page.getByRole("region", { name: "Route–Sound Graph" })).toContainText("Now");
});
