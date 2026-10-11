import { readFileSync } from "node:fs";
import { expect, test } from "./practicePage";

const fixture = JSON.parse(
  readFileSync(new URL("../../fixtures/synthetic/soundprint-shell.json", import.meta.url), "utf8"),
) as { result: unknown };

const TOKEN = "ab".repeat(32);

test("a share link without a key says the piece is unavailable", async ({ page }) => {
  await page.goto("/w");
  await expect(
    page.getByRole("heading", { name: "This link does not open a Soundprint." }),
  ).toBeVisible();
  await expect(page.getByText("does not contain a location")).toBeVisible();
});

test("a share link opens the Soundprint from the fragment", async ({ page }) => {
  await page.route("**/api/v1/shared", async (route) => {
    expect(route.request().headers().authorization).toBe(`Bearer ${TOKEN}`);
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ schema_version: "1", status: "ready", result: fixture.result }),
    });
  });
  await page.route("**/api/v1/shared/audio", async (route) => {
    expect(route.request().headers().authorization).toBe(`Bearer ${TOKEN}`);
    await route.fulfill({ status: 404, body: "" });
  });

  await page.goto(`/w#${TOKEN}`);

  await expect(page).toHaveURL(new RegExp(`/w#${TOKEN}$`));
  await expect(page.getByRole("heading", { name: "Shared Soundprint" })).toBeVisible();
  await expect(page.getByText("does not contain the walk's location")).toBeVisible();
  await expect(page.getByText("example made in the browser")).toHaveCount(0);
  expect(page.url()).not.toContain("latitude");
  expect(page.url()).not.toContain("12.9716");
});
