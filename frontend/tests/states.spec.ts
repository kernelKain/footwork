import { expect, test } from "@playwright/test";

test("recording and generation previews stay honest", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Show recording preview states" }).click();
  await page.getByRole("button", { name: "Permission" }).click();
  const permission = page.getByRole("alert");
  await expect(permission).toContainText("Location access was denied");
  await expect(permission).toContainText("browser settings");
  await expect(permission.getByRole("link", { name: "Play example" })).toBeVisible();

  await page.getByRole("button", { name: "Waiting for position" }).click();
  await expect(page.getByRole("status")).toContainText("Waiting for a position fix");
  await expect(page.getByRole("status")).toContainText("not locating you");

  await page.getByRole("button", { name: "Invalid trace" }).click();
  const invalid = page.getByRole("alert");
  await expect(invalid).toContainText("too short");
  await expect(invalid).toContainText("No events were invented");
  await expect(invalid.getByRole("link", { name: "Play example" })).toBeVisible();

  await page.goto("/studio");
  await page.getByRole("button", { name: "Show generation preview states" }).click();
  await page.getByRole("button", { name: "Processing" }).click();
  const processing = page.getByRole("status", { name: "Processing" });
  await expect(processing).toContainText("Processing movement");
  await expect(processing).toContainText("Arranging");
  await expect(processing).toContainText("Composing");
  await expect(processing).toContainText("did not call a provider");

  await page.getByRole("button", { name: "Partial" }).click();
  await expect(page.getByRole("status", { name: "Partial" })).toContainText(
    "Absent mappings stay absent",
  );
  await expect(page.getByRole("status", { name: "Partial" })).toContainText(
    "not a completed Studio Track",
  );
  await expect(page.getByRole("img", { name: "Synthetic route" })).toBeHidden();

  await page.getByRole("button", { name: "Quota" }).click();
  const quota = page.getByRole("alert");
  await expect(quota).toContainText("Daily generation limit reached");
  await expect(quota).toContainText("No account balance is shown");

  await page.getByRole("button", { name: "Provider failure" }).click();
  const failure = page.getByRole("alert");
  await expect(failure).toContainText("Arrangement service unavailable; creating Route Sketch.");
  await expect(failure).toContainText(
    "Studio generation unavailable; your movement sketch is ready.",
  );
  await expect(failure).toContainText("did not produce a Studio Track");
  await expect(page.getByRole("img", { name: "Synthetic route" })).toBeHidden();
  await failure.getByRole("button", { name: "Show the synthetic example" }).click();
  await expect(page.getByRole("img", { name: "Synthetic route" })).toBeVisible();
  await expect(page.getByRole("status")).toContainText("Synthetic fixture");
});
