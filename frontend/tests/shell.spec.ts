import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

async function expectNoHorizontalOverflow(page: import("@playwright/test").Page): Promise<void> {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1,
  );
  expect(overflow).toBe(true);
}

test("walk screen explains the practice and offers the example", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Turn a walk into music." })).toBeVisible();
  await expect(page.getByText("A real walk is not saved on this page.")).toBeVisible();
  await expect(page.getByRole("navigation")).toHaveCount(0);
  await page.getByRole("link", { name: "Hear an example" }).first().click();
  await expect(page).toHaveURL(/\/studio$/);
  await expect(page.getByText("Example walk")).toBeVisible();
  await expect(page.getByText("not a recorded walk")).toBeVisible();
});

test("about redirects to how it works", async ({ page }) => {
  await page.goto("/about");
  await expect(page).toHaveURL(/\/#how-it-works$/);
  await expect(page.getByRole("heading", { name: "Your walk becomes music" })).toBeVisible();
});

for (const width of [390, 1280]) {
  test(`labeled fixture renders at ${width}px without horizontal overflow`, async ({ page }) => {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 800 });
    await page.goto("/studio");
    await expect(page.getByText("Example walk")).toBeVisible();
    await expect(page.getByRole("img", { name: "Example route" })).toBeVisible();
    const routeBox = await page.getByRole("img", { name: "Example route" }).boundingBox();
    const playBox = await page.getByRole("button", { name: "Play", exact: true }).boundingBox();
    const moments = page.getByRole("heading", { name: "Moments in the music" });
    const momentsBox = await moments.boundingBox();
    expect(routeBox).not.toBeNull();
    expect(playBox).not.toBeNull();
    expect(momentsBox).not.toBeNull();
    expect(playBox!.y).toBeLessThan(routeBox!.y);
    if (width < 1024) {
      expect(routeBox!.y).toBeLessThan(momentsBox!.y);
    }
    expect(routeBox!.x).toBeGreaterThanOrEqual(0);
    expect(routeBox!.x + routeBox!.width).toBeLessThanOrEqual(width + 1);
    await expect(
      page.locator(".mapping-list").getByRole("listitem").filter({ hasText: "Turn" }),
    ).toBeVisible();
    await expect(
      page.locator(".mapping-list").getByRole("listitem").filter({ hasText: "Pause" }),
    ).toBeVisible();
    const example = page.getByRole("link", { name: "Start another walk" });
    const box = await example.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(width + 1);
    await expectNoHorizontalOverflow(page);

    await page.goto("/");
    const play = page.getByRole("link", { name: "Hear an example" }).first();
    await expect(play).toBeVisible();
    const hero = await page.getByRole("heading", { name: "Turn a walk into music." }).boundingBox();
    const steps = await page
      .getByRole("heading", { name: "Your walk becomes music" })
      .boundingBox();
    expect(hero).not.toBeNull();
    expect(steps).not.toBeNull();
    expect(hero!.y).toBeLessThan(steps!.y);
    await expect(page.getByRole("button", { name: "Show recording preview states" })).toHaveCount(
      0,
    );
    const exampleBox = await play.boundingBox();
    expect(exampleBox).not.toBeNull();
    expect(exampleBox!.x).toBeGreaterThanOrEqual(0);
    expect(exampleBox!.x + exampleBox!.width).toBeLessThanOrEqual(width + 1);
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
    if (text.includes("Hear an example")) {
      found = true;
      const outline = await focused.evaluate((element) => getComputedStyle(element).outlineStyle);
      expect(outline).not.toBe("none");
      break;
    }
  }
  expect(found).toBe(true);
});
