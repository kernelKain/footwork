import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

async function expectNoHorizontalOverflow(page: import("@playwright/test").Page): Promise<void> {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1,
  );
  expect(overflow).toBe(true);
}

test("walk screen explains the preview and offers the example", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Footwork" })).toBeVisible();
  await expect(page.getByText("No walk is stored on this device.")).toBeVisible();
  await expect(page.getByRole("link", { name: "Play example" })).toBeVisible();
  await page.getByRole("link", { name: "Play example" }).click();
  await expect(page).toHaveURL(/\/studio$/);
  await expect(page.getByRole("status")).toContainText("Synthetic fixture");
  await expect(page.getByRole("status")).toContainText("not a recorded walk");
});

test("about screen states the mechanism and its limits", async ({ page }) => {
  await page.goto("/about");
  await expect(page.getByRole("heading", { name: "How it works" })).toBeVisible();
  await expect(page.getByText("This preview does not call them.")).toBeVisible();
  await expect(page.getByRole("link", { name: "Source code" })).toHaveAttribute(
    "href",
    "https://github.com/kernelKain/footwork",
  );
});

for (const width of [390, 1280]) {
  test(`labeled fixture renders at ${width}px without horizontal overflow`, async ({ page }) => {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 800 });
    await page.goto("/studio");
    await expect(page.getByRole("status")).toContainText("Synthetic fixture");
    await expect(page.getByRole("img", { name: "Synthetic route" })).toBeVisible();
    await expect(page.getByRole("listitem").filter({ hasText: "Turn" })).toBeVisible();
    await expect(page.getByRole("listitem").filter({ hasText: "Pause" })).toBeVisible();
    const example = page.getByRole("link", { name: "Soundprint" });
    const box = await example.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(width + 1);
    await expectNoHorizontalOverflow(page);

    await page.goto("/");
    const play = page.getByRole("link", { name: "Play example" });
    await expect(play).toBeVisible();
    const playBox = await play.boundingBox();
    expect(playBox).not.toBeNull();
    expect(playBox!.x).toBeGreaterThanOrEqual(0);
    expect(playBox!.x + playBox!.width).toBeLessThanOrEqual(width + 1);
    await expectNoHorizontalOverflow(page);
  });
}

test("shell has no serious accessibility violations", async ({ page }) => {
  for (const path of ["/", "/studio", "/about"]) {
    await page.goto(path);
    const results = await new AxeBuilder({ page }).analyze();
    const blocking = results.violations.filter(
      (violation) => violation.impact === "serious" || violation.impact === "critical",
    );
    expect(blocking).toEqual([]);
  }
});

test("keyboard reaches the example action", async ({ page }) => {
  await page.goto("/");
  let found = false;
  for (let step = 0; step < 8; step += 1) {
    await page.keyboard.press("Tab");
    const focused = page.locator(":focus");
    const text = await focused.innerText();
    if (text.includes("Play example")) {
      found = true;
      const outline = await focused.evaluate((element) => getComputedStyle(element).outlineStyle);
      expect(outline).not.toBe("none");
      break;
    }
  }
  expect(found).toBe(true);
});
