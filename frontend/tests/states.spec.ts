import { expect, test } from "./practicePage";

test("recording practice stays labeled and generation has no public picker", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Show recording preview states" })).toHaveCount(0);

  await page.goto("/studio");
  await expect(page.getByRole("button", { name: "Show generation preview states" })).toHaveCount(0);
  await expect(page.getByText("Example walk")).toBeVisible();
  await expect(page.getByRole("img", { name: "Example route" })).toBeVisible();
});
