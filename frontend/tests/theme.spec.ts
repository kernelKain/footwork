import { expect, type Page } from "@playwright/test";
import { test } from "./practicePage";

/** Read the computed body background color for theme assertions. */
async function background(page: Page) {
  return page.evaluate(() => getComputedStyle(document.body).backgroundColor);
}

/** Check the theme switch label, decorative icon, and minimum touch-target size. */
async function expectThemeControl(page: Page, name: "Light theme" | "Dark theme") {
  const button = page.getByRole("button", { name });
  await expect(button).toBeVisible();
  await expect(button).toHaveAttribute("aria-label", name);
  await expect(button.locator("svg")).toHaveAttribute("aria-hidden", "true");
  await expect(button.locator("svg")).toHaveAttribute(
    "data-icon",
    name === "Light theme" ? "sun" : "moon",
  );
  expect((await button.innerText()).trim()).toBe("");
  const box = await button.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.width).toBeGreaterThanOrEqual(44);
  expect(box!.height).toBeGreaterThanOrEqual(44);
  await expect(page.locator(".app-header")).not.toContainText("Light theme");
  await expect(page.locator(".app-header")).not.toContainText("Dark theme");
}

test("daylight follows a light device and an explicit choice is kept", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/");
  await expectThemeControl(page, "Dark theme");
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute("content", "#F4F1E8");
  expect(await background(page)).toBe("rgb(244, 241, 232)");
  await page.keyboard.press("Tab");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "Dark theme" })).toBeFocused();
  const outline = await page
    .getByRole("button", { name: "Dark theme" })
    .evaluate((element) => getComputedStyle(element).outlineStyle);
  expect(outline).not.toBe("none");
  await page.getByRole("button", { name: "Dark theme" }).click();
  await expectThemeControl(page, "Light theme");
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute("content", "#080C18");
  expect(await background(page)).toBe("rgb(8, 12, 24)");
  await page.reload();
  expect(await background(page)).toBe("rgb(8, 12, 24)");
  await expectThemeControl(page, "Light theme");
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute("content", "#080C18");
});

test("a stored light theme wins over a dark device", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.addInitScript(() => localStorage.setItem("footwork-theme", "light"));
  await page.goto("/");
  expect(await background(page)).toBe("rgb(244, 241, 232)");
  await expectThemeControl(page, "Dark theme");
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute("content", "#F4F1E8");
});

test("a dark device uses Nocturne Pulse", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/studio");
  expect(await background(page)).toBe("rgb(8, 12, 24)");
  await expectThemeControl(page, "Light theme");
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute("content", "#080C18");
});

test("a device change updates the theme when no choice is stored", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/");
  await expectThemeControl(page, "Dark theme");
  await page.emulateMedia({ colorScheme: "dark" });
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expectThemeControl(page, "Light theme");
  expect(await background(page)).toBe("rgb(8, 12, 24)");
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute("content", "#080C18");
});
