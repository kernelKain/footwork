import { expect, test } from "./practicePage";

async function background(page: import("@playwright/test").Page) {
  return page.evaluate(() => getComputedStyle(document.body).backgroundColor);
}

test("daylight follows a light device and an explicit choice is kept", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Dark theme" })).toBeVisible();
  expect(await background(page)).toBe("rgb(244, 241, 232)");
  await page.getByRole("button", { name: "Dark theme" }).click();
  await expect(page.getByRole("button", { name: "Light theme" })).toBeVisible();
  expect(await background(page)).toBe("rgb(8, 12, 24)");
  await page.reload();
  expect(await background(page)).toBe("rgb(8, 12, 24)");
  await expect(page.getByRole("button", { name: "Light theme" })).toBeVisible();
});

test("a stored light theme wins over a dark device", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.addInitScript(() => localStorage.setItem("footwork-theme", "light"));
  await page.goto("/");
  expect(await background(page)).toBe("rgb(244, 241, 232)");
  await expect(page.getByRole("button", { name: "Dark theme" })).toBeVisible();
});

test("a dark device uses Nocturne Pulse", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/studio");
  expect(await background(page)).toBe("rgb(8, 12, 24)");
  await expect(page.getByRole("button", { name: "Light theme" })).toBeVisible();
});
