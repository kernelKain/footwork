import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("toolchain shell renders the product name", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Footwork" })).toBeVisible();
  await expect(page.getByText("Toolchain shell.")).toBeVisible();
});

test("toolchain shell has no serious accessibility violations", async ({ page }) => {
  await page.goto("/");
  const results = await new AxeBuilder({ page }).analyze();
  const blocking = results.violations.filter(
    (violation) => violation.impact === "serious" || violation.impact === "critical",
  );
  expect(blocking).toEqual([]);
});
