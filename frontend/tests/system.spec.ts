import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("design controls show focus, disabled, and loading states", async ({ page }) => {
  await page.goto("/system");
  let found = false;
  for (let step = 0; step < 12; step += 1) {
    await page.keyboard.press("Tab");
    const focused = page.locator(":focus");
    const text = await focused.innerText();
    if (text.includes("Start walking")) {
      found = true;
      const outline = await focused.evaluate((element) => getComputedStyle(element).outlineStyle);
      expect(outline).not.toBe("none");
      break;
    }
  }
  expect(found).toBe(true);
  await expect(page.getByRole("button", { name: "Unavailable" })).toBeDisabled();
  const working = page.getByRole("button", { name: "Working" });
  await expect(working).toBeDisabled();
  await expect(working).toHaveAttribute("aria-busy", "true");
});

test("reduced motion confirms a hold without playing the fill", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/system");
  const hold = page.getByRole("button", { name: "Hold to end" });
  await hold.click();
  const confirm = page.getByRole("button", { name: "Confirm end" });
  await expect(confirm).toHaveAttribute("aria-pressed", "true");
  const motion = await confirm.evaluate((element) => {
    const fill = element.querySelector(".ui-hold-fill");
    const raw = getComputedStyle(element).transitionDuration;
    const value = Number.parseFloat(raw);
    const milliseconds = raw.endsWith("ms") ? value : value * 1000;
    return {
      milliseconds,
      scale: fill ? getComputedStyle(fill).transform : "none",
    };
  });
  expect(motion.milliseconds).toBeLessThan(1);
  expect(motion.scale).toContain("matrix(0,");
  await confirm.click();
  await expect(page.getByRole("status")).toHaveText("Walk end confirmed");
});

test("catalog and small logo fit a 360px screen", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto("/system");
  const mark = page.locator("[data-logo='mark']");
  await expect(mark).toHaveAttribute("aria-label", "Footwork");
  const geometry = await mark.evaluate((element) => ({
    circles: element.querySelectorAll("circle").length,
    beats: element.querySelectorAll("rect").length,
  }));
  expect(geometry).toEqual({ circles: 1, beats: 1 });
  const box = await mark.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.width).toBeLessThanOrEqual(16);
  expect(box!.height).toBeLessThanOrEqual(16);
  const beat = await mark.evaluate((element) => {
    const marker = element.querySelector("rect");
    return marker ? marker.getBoundingClientRect().width : 0;
  });
  expect(beat).toBeGreaterThanOrEqual(3);
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1,
  );
  expect(overflow).toBe(true);
  await page.getByRole("button", { name: "Open details" }).click();
  await expect(page.getByRole("dialog", { name: "Walk details" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: "Walk details" })).toBeHidden();
});

test("catalog has no serious accessibility violations", async ({ page }) => {
  await page.goto("/system");
  const results = await new AxeBuilder({ page }).analyze();
  const blocking = results.violations.filter(
    (violation) => violation.impact === "serious" || violation.impact === "critical",
  );
  expect(blocking).toEqual([]);
});
