import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";
import { DRAFT_DB, DRAFT_KEY, DRAFT_STORE } from "../src/recording/draftStore";
import {
  beginLive,
  endLive,
  initialLive,
  markPaused,
  noteHidden,
  notePosition,
  pauseLive,
  resumeLive,
  type LiveModel,
} from "../src/recording/liveCapture";
import { createMovementDraft, type MovementDraft } from "../src/recording/movementDraft";
import {
  MIN_ACTIVE_WALK_MS,
  READINESS_GUIDANCE,
  SAVING_STATUS,
  SHORT_WALK_WARNING,
  SUBMITTING_STATUS,
  activeWalkIsShort,
  readinessProgress,
} from "../src/recording/readiness";
import { formatClock } from "../src/recording/useMonotonicClock";

const T0 = 1_700_000_000_000;

test("readiness follows active time and the backend minimum", () => {
  const source = readFileSync(
    new URL("../../backend/app/movement/clean.py", import.meta.url),
    "utf8",
  );
  const match = source.match(/^MIN_ACTIVE_MS = ([0-9_]+(?:\.[0-9]+)?)/m);
  expect(match).not.toBeNull();
  expect(Number(match?.[1].replaceAll("_", ""))).toBe(MIN_ACTIVE_WALK_MS);

  expect(READINESS_GUIDANCE).toBe(
    "Walk for at least 1 min 30 sec of active movement for a reliable Soundprint.",
  );
  expect(formatClock(54_000)).toBe("00:54");
  expect(readinessProgress(54_000)).toBe("0:54 of 1:30 minimum.");
  expect(readinessProgress(MIN_ACTIVE_WALK_MS - 1)).toBe("1:29 of 1:30 minimum.");
  expect(readinessProgress(MIN_ACTIVE_WALK_MS)).toBe("Minimum time reached.");
  expect(readinessProgress(-5)).toBe("0:00 of 1:30 minimum.");
  expect(activeWalkIsShort(MIN_ACTIVE_WALK_MS - 1)).toBe(true);
  expect(activeWalkIsShort(MIN_ACTIVE_WALK_MS)).toBe(false);

  const located = notePosition(
    beginLive(initialLive(), "ok", true),
    { latitude: 12.97, longitude: 77.59, accuracyM: 8, timestampMs: T0 },
    T0,
    "session",
    0,
  );
  const recording: LiveModel = {
    ...located,
    baseActiveMs: 54_000,
    draft: located.draft ? { ...located.draft, activeMs: 54_000 } : null,
  };
  const paused = pauseLive(recording, 54_000, T0 + 30_000);
  expect(paused.baseActiveMs).toBe(54_000);
  expect(readinessProgress(paused.baseActiveMs)).toBe("0:54 of 1:30 minimum.");
  expect(readinessProgress(paused.baseActiveMs)).not.toBe(readinessProgress(54_000 + 20_000));

  const hidden = noteHidden(recording, 54_000, T0 + 40_000);
  expect(hidden.phase).toBe("interrupted");
  expect(hidden.watching).toBe(false);
  expect(hidden.baseActiveMs).toBe(54_000);
  expect(activeWalkIsShort(hidden.baseActiveMs)).toBe(true);
  expect(endLive(hidden, hidden.baseActiveMs, T0 + 50_000).draft?.activeMs).toBe(54_000);

  const pausing = pauseLive(recording, 54_000, T0 + 10_000);
  expect(endLive(pausing, 54_000, T0 + 11_000).phase).toBe("ending");
  const resuming = resumeLive(markPaused(pausing), true);
  expect(resuming.phase).toBe("resuming");
  expect(endLive(resuming, 54_000, T0 + 20_000).draft?.activeMs).toBe(54_000);
});

test("a paused walk keeps the short-walk guidance frozen", async ({ page }) => {
  await page.goto("/");
  await writeDraft(page, walkDraft("paused-short", "paused", 54_000));
  await page.reload();

  await expect(page.getByRole("heading", { name: "Walk paused" })).toBeVisible();
  const guidance = page.getByText(READINESS_GUIDANCE);
  await expect(guidance).toBeVisible();
  expect(
    await page
      .locator("[data-clock='active']")
      .evaluate((timer) => timer.nextElementSibling?.textContent),
  ).toBe(READINESS_GUIDANCE);
  const progress = page.locator("[data-readiness='short']");
  await expect(progress).toHaveText("0:54 of 1:30 minimum.");
  await expect(progress).not.toHaveAttribute("role", "status");
  await expect(page.getByRole("status")).toHaveCount(1);
  await expect(page.getByRole("status")).toHaveText(
    "Movement is not being recorded. Your walk is saved on this phone.",
  );
  await expect(page.locator(".recording-view")).toHaveAttribute("data-active-ms", "54000");
  await page.waitForTimeout(1500);
  await expect(page.locator(".recording-view")).toHaveAttribute("data-active-ms", "54000");
  await expect(progress).toHaveText("0:54 of 1:30 minimum.");
  await expect(page.getByRole("button", { name: "Hold to end walk" })).toBeEnabled();
});

test("the minimum announcement stays one status and pause does not extend it", async ({ page }) => {
  await page.addInitScript(() => {
    navigator.geolocation.watchPosition = () => 1;
    navigator.geolocation.clearWatch = () => undefined;
  });
  await page.goto("/");
  await writeDraft(page, walkDraft("recording-ready", "recording", MIN_ACTIVE_WALK_MS));
  await page.reload();

  await expect(page.getByRole("heading", { name: "Recording" })).toBeVisible();
  await expect(page.getByRole("status")).toHaveCount(1);
  await expect(page.getByRole("status")).toHaveText("Minimum time reached.");
  await expect(page.locator("[data-readiness='reached']")).toHaveAttribute("role", "status");
  await expect(page.getByRole("button", { name: "Hold to end walk" })).toBeEnabled();

  await page.getByRole("button", { name: "Pause walk" }).click();
  await expect(page.getByRole("heading", { name: "Walk paused" })).toBeVisible();
  await expect(page.getByText("Minimum time reached.")).toBeVisible();
  await expect(page.locator("[data-readiness='reached']")).not.toHaveAttribute("role", "status");
  await expect(page.getByRole("status")).toHaveCount(1);
  await expect(page.getByRole("status")).toHaveText(
    "Movement is not being recorded. Your walk is saved on this phone.",
  );
  const frozen = await page.locator(".recording-view").getAttribute("data-active-ms");
  expect(Number(frozen)).toBeGreaterThanOrEqual(MIN_ACTIVE_WALK_MS);
  await page.waitForTimeout(1500);
  await expect(page.locator(".recording-view")).toHaveAttribute("data-active-ms", frozen ?? "");

  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.getByRole("button", { name: "Hold to end walk" }).click();
  await page.getByRole("button", { name: "Confirm end walk" }).click();
  await expect(
    page.getByRole("heading", {
      name: /Saving your walk|Walk saved|Making your Soundprint|The piece is not ready/,
    }),
  ).toBeVisible();
  await expect(page.getByRole("dialog", { name: "This walk may be too short" })).toHaveCount(0);
});

test("an early ending warns once, then submits one job after saving", async ({ page }) => {
  let posts = 0;
  let releaseRequest!: () => void;
  const hold = new Promise<void>((resolve) => {
    releaseRequest = resolve;
  });
  await page.route("**/api/v1/soundprints", async (route) => {
    posts += 1;
    await hold;
    await route.fulfill({
      status: 202,
      contentType: "application/json",
      body: JSON.stringify({ job_id: "one-job" }),
    });
  });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await writeDraft(page, walkDraft("early-walk", "paused", 54_000));
  await page.reload();
  await expect(page.getByText("0:54 of 1:30 minimum.")).toBeVisible();

  await page.getByRole("button", { name: "Hold to end walk" }).click();
  await page.getByRole("button", { name: "Confirm end walk" }).click();
  const dialog = page.getByRole("dialog", { name: "This walk may be too short" });
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText(SHORT_WALK_WARNING);
  await dialog.getByRole("button", { name: "Keep walking" }).click();
  expect(posts).toBe(0);
  await expect(page.getByRole("heading", { name: "Walk paused" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Hold to end walk" })).toBeEnabled();

  await page.evaluate(() => {
    const seen: string[] = [];
    Object.assign(window, { __footworkStatusLog: seen });
    const remember = () => {
      for (const node of document.querySelectorAll("[role='status']")) {
        const text = node.textContent?.trim() ?? "";
        if (text && seen[seen.length - 1] !== text) seen.push(text);
      }
    };
    new MutationObserver(remember).observe(document.body, {
      subtree: true,
      childList: true,
      characterData: true,
    });
  });

  await page.getByRole("button", { name: "Hold to end walk" }).click();
  await page.getByRole("button", { name: "Confirm end walk" }).click();
  await page
    .getByRole("button", { name: "End walk anyway" })
    .evaluate((button: HTMLButtonElement) => {
      button.click();
      button.click();
    });

  await expect(page.getByRole("status")).toHaveText(SUBMITTING_STATUS);
  await expect(page.getByText("%")).toHaveCount(0);
  const during = await statusLog(page);
  expect(during.filter((text) => text === SAVING_STATUS || text === SUBMITTING_STATUS)).toEqual([
    SAVING_STATUS,
    SUBMITTING_STATUS,
  ]);
  expect(posts).toBe(1);

  releaseRequest();
  await expect(page).toHaveURL(/\/studio$/);
  await expect(page.getByRole("status")).toHaveText("Reading your walk.");
  await expect(page.locator(".generation-stage")).toHaveText("Reading your walk.");
  await expect(page.locator("[aria-live='assertive']")).toHaveCount(0);
  await expect(page.getByText("%")).toHaveCount(0);
  expect(posts).toBe(1);
});

function walkDraft(
  sessionId: string,
  status: MovementDraft["status"],
  activeMs: number,
): MovementDraft {
  const now = Date.now();
  return {
    ...createMovementDraft(sessionId, now),
    status,
    activeMs,
    samples: [{ latitude: 12.97, longitude: 77.59, accuracyM: 8, timestampMs: now - 60_000 }],
    updatedAtMs: now,
  };
}

async function writeDraft(page: Page, draft: MovementDraft): Promise<void> {
  await page.evaluate(
    async ({ dbName, store, key, value }) => {
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open(dbName, 1);
        request.onupgradeneeded = () => {
          if (!request.result.objectStoreNames.contains(store)) {
            request.result.createObjectStore(store);
          }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(store, "readwrite");
        tx.objectStore(store).put(value, key);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
      db.close();
    },
    { dbName: DRAFT_DB, store: DRAFT_STORE, key: DRAFT_KEY, value: draft },
  );
}

async function statusLog(page: Page): Promise<string[]> {
  return page.evaluate(
    () => (window as unknown as { __footworkStatusLog: string[] }).__footworkStatusLog,
  );
}
