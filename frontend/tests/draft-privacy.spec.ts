import { expect, test, type Page } from "@playwright/test";
import { DRAFT_DB, DRAFT_KEY, DRAFT_STORE } from "../src/recording/draftStore";
import { createMovementDraft, type MovementDraft } from "../src/recording/movementDraft";

test("the landing has no coordinate export, and a saved ended walk can be deleted", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Start walking" }).first()).toBeVisible();
  await expectNoExport(page);
  await expect(page.getByRole("button", { name: "Delete saved walk" })).toHaveCount(0);

  await writeDraft(page, endedDraft("stored-walk"));
  await page.reload();
  await expect(page.getByRole("heading", { name: "Recording" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Walk paused" })).toHaveCount(0);
  await expectNoExport(page);
  await expect(page.getByText("12.97")).toHaveCount(0);
  await page.getByRole("button", { name: "Delete saved walk" }).click();
  await expect.poll(async () => readDraft(page)).toBeNull();
  await expect(page.getByRole("button", { name: "Delete saved walk" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Start walking" }).first()).toBeVisible();
});

test("an in-progress or paused walk is restored without an export or delete action", async ({
  page,
}) => {
  await page.addInitScript(() => {
    navigator.geolocation.watchPosition = () => 1;
    navigator.geolocation.clearWatch = () => undefined;
  });
  await page.goto("/");
  await writeDraft(page, { ...endedDraft("open-walk"), status: "recording" });
  await page.reload();
  await expect(page.getByRole("heading", { name: "Recording" })).toBeVisible();
  await expect(page.locator(".recording-view")).toHaveAttribute("data-sample-count", "1");
  await expect(page.getByRole("button", { name: "Delete saved walk" })).toHaveCount(0);
  await expectNoExport(page);
  expect((await readDraft(page))?.status).toBe("recording");

  await writeDraft(page, { ...endedDraft("paused-walk"), status: "paused" });
  await page.reload();
  await expect(page.getByRole("heading", { name: "Walk paused" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Delete saved walk" })).toHaveCount(0);
  await expectNoExport(page);
  expect((await readDraft(page))?.samples).toHaveLength(1);
});

test("an expired ended walk is removed automatically", async ({ page }) => {
  await page.goto("/");
  await writeDraft(page, {
    ...endedDraft("expired-walk"),
    updatedAtMs: Date.now() - 24 * 60 * 60 * 1000 - 1000,
  });
  await page.reload();
  await expect(page.getByRole("button", { name: "Start walking" }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Delete saved walk" })).toHaveCount(0);
  await expectNoExport(page);
  expect(await readDraft(page)).toBeNull();
});

test("an accepted job clears the ended raw draft", async ({ page }) => {
  let releaseRequest!: () => void;
  const hold = new Promise<void>((resolve) => {
    releaseRequest = resolve;
  });
  let sawPost = false;
  await page.route("**/api/v1/soundprints", async (route) => {
    sawPost = true;
    await hold;
    await route.fulfill({
      status: 202,
      contentType: "application/json",
      body: JSON.stringify({ job_id: "accepted-job" }),
    });
  });
  await installWatch(page);
  await page.goto("/");
  await page.getByRole("button", { name: "Start walking" }).first().click();
  await page.getByRole("dialog").getByRole("button", { name: "Use my location" }).click();
  await expect(page.locator(".recording-view")).toHaveAttribute("data-sample-count", "2");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.getByRole("button", { name: "Hold to end walk" }).click();
  await page.getByRole("button", { name: "Confirm end walk" }).click();
  await page.getByRole("button", { name: "End walk anyway" }).click();

  await expect.poll(async () => (await readDraft(page))?.status).toBe("ended");
  await expect.poll(() => sawPost).toBe(true);
  expect((await readDraft(page))?.samples.length).toBeGreaterThan(0);
  await expectNoExport(page);

  releaseRequest();
  await expect(page).toHaveURL(/\/studio$/);
  await expect.poll(async () => readDraft(page)).toBeNull();
  await expect(page.getByRole("button", { name: "Delete saved walk" })).toHaveCount(0);
  await expectNoExport(page);
});

test("a walk refused before acceptance stays saved until it is deleted", async ({ page }) => {
  await page.route("**/api/v1/soundprints", async (route) => {
    await route.fulfill({
      status: 422,
      contentType: "application/json",
      body: JSON.stringify({ code: "trace_too_short" }),
    });
  });
  await installWatch(page);
  await page.goto("/");
  await page.getByRole("button", { name: "Start walking" }).first().click();
  await page.getByRole("dialog").getByRole("button", { name: "Use my location" }).click();
  await expect(page.locator(".recording-view")).toHaveAttribute("data-sample-count", "2");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.getByRole("button", { name: "Hold to end walk" }).click();
  await page.getByRole("button", { name: "Confirm end walk" }).click();
  await page.getByRole("button", { name: "End walk anyway" }).click();

  await expect(page).toHaveURL(/\/studio$/);
  await expect(page.getByRole("alert")).toContainText("too short to shape a piece");
  await expect.poll(async () => (await readDraft(page))?.status).toBe("ended");
  expect((await readDraft(page))?.samples.length).toBeGreaterThan(0);
  await expectNoExport(page);
  await page.getByRole("button", { name: "Delete saved walk" }).click();
  await expect.poll(async () => readDraft(page)).toBeNull();
  await expect(page.getByRole("button", { name: "Delete saved walk" })).toHaveCount(0);

  await page.goto("/");
  await expect(page.getByRole("button", { name: "Start walking" }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Delete saved walk" })).toHaveCount(0);
  await expectNoExport(page);
});

/** Assert that raw-walk download, upload, and legacy export messaging are absent. */
async function expectNoExport(page: Page): Promise<void> {
  await expect(
    page.getByRole("button", { name: "Download the walk stored on this phone" }),
  ).toHaveCount(0);
  await expect(page.getByText("This file contains the location of that walk.")).toHaveCount(0);
  await expect(page.getByText("A real walk is not saved on this page.")).toHaveCount(0);
  await expect(page.getByText("footwork-private-walk.json")).toHaveCount(0);
  await expect(page.locator("[download]")).toHaveCount(0);
  await expect(page.locator('input[type="file"]')).toHaveCount(0);
}

/** Create an ended draft with one synthetic location sample for privacy tests. */
function endedDraft(sessionId: string): MovementDraft {
  const now = Date.now();
  return {
    ...createMovementDraft(sessionId, now),
    status: "ended",
    samples: [{ latitude: 12.97, longitude: 77.59, accuracyM: 8, timestampMs: now - 60_000 }],
    updatedAtMs: now,
  };
}

/** Install a geolocation stub that emits two synthetic samples and supports clearing watches. */
async function installWatch(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const timers = new Map<number, number>();
    let nextId = 1;
    const samples = [
      { latitude: 12.9716, longitude: 77.5946, accuracy: 8, timestamp: 1_700_000_000_000 },
      { latitude: 12.9726, longitude: 77.5956, accuracy: 12, timestamp: 1_700_000_003_400 },
    ];
    navigator.geolocation.watchPosition = (success) => {
      const id = nextId;
      nextId += 1;
      let index = 0;
      const timer = window.setInterval(() => {
        const sample = samples[index];
        index += 1;
        if (!sample) {
          window.clearInterval(timer);
          return;
        }
        success({
          coords: {
            latitude: sample.latitude,
            longitude: sample.longitude,
            accuracy: sample.accuracy,
            altitude: null,
            altitudeAccuracy: null,
            heading: null,
            speed: null,
            toJSON() {
              return this;
            },
          },
          timestamp: sample.timestamp,
          toJSON() {
            return this;
          },
        });
      }, 20);
      timers.set(id, timer);
      return id;
    };
    navigator.geolocation.clearWatch = (id) => {
      const timer = timers.get(id);
      if (timer !== undefined) window.clearInterval(timer);
      timers.delete(id);
    };
  });
}

/** Read the saved draft from browser IndexedDB, returning null when no draft is stored. */
async function readDraft(page: Page): Promise<MovementDraft | null> {
  return page.evaluate(
    async ({ dbName, store, key }) => {
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
      const value = await new Promise<MovementDraft | null>((resolve, reject) => {
        const query = db.transaction(store, "readonly").objectStore(store).get(key);
        query.onsuccess = () => resolve((query.result as MovementDraft | undefined) ?? null);
        query.onerror = () => reject(query.error);
      });
      db.close();
      return value;
    },
    { dbName: DRAFT_DB, store: DRAFT_STORE, key: DRAFT_KEY },
  );
}

/** Seed the browser draft store and wait for the IndexedDB transaction to complete. */
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
