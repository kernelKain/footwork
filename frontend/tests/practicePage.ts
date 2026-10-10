import { test as base, expect } from "@playwright/test";

export const test = base.extend({
  page: async ({ page }, use) => {
    await page.addInitScript(() => {
      const key = "footwork-practice";
      if (!window.sessionStorage.getItem(key)) window.sessionStorage.setItem(key, "granted");
    });
    await use(page);
  },
});

export { expect };
