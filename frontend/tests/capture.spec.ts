import { expect, test, type Page } from "@playwright/test";
import { DRAFT_DB, DRAFT_KEY, DRAFT_STORE } from "../src/recording/draftStore";
import {
  acceptSample,
  createMovementDraft,
  isDraftExpired,
  MAX_SAMPLES,
  MIN_SAMPLE_GAP_MS,
  parseMovementDraft,
  type LocationSample,
  type MovementDraft,
} from "../src/recording/movementDraft";

const T0 = 1_700_000_000_000;

function sample(offsetMs: number, accuracyM = 8): LocationSample {
  return {
    latitude: 12.97,
    longitude: 77.59,
    accuracyM,
    timestampMs: T0 + offsetMs,
  };
}

test("samples stay finite, spaced, and capped", () => {
  let draft = createMovementDraft("session-1", T0);
  expect(acceptSample(draft, { ...sample(0), latitude: 91 }, T0).decision).toBe("invalid");
  expect(acceptSample(draft, { ...sample(0), accuracyM: -1 }, T0).decision).toBe("invalid");
  expect(acceptSample(draft, sample(0, 51), T0).decision).toBe("inaccurate");

  const first = acceptSample(draft, sample(0), T0);
  expect(first.decision).toBe("accepted");
  draft = first.draft;
  expect(acceptSample(draft, sample(MIN_SAMPLE_GAP_MS - 1), T0).decision).toBe("too_soon");
  expect(acceptSample(draft, sample(-1), T0).decision).toBe("invalid");
  const second = acceptSample(draft, sample(MIN_SAMPLE_GAP_MS, 30), T0 + 1000);
  expect(second.decision).toBe("accepted");
  expect(second.draft.samples).toHaveLength(2);
  expect(second.draft.consentVersion).toBe("1");

  let full = createMovementDraft("session-full", T0);
  for (let index = 0; index < MAX_SAMPLES; index += 1) {
    const next = acceptSample(full, sample(index * MIN_SAMPLE_GAP_MS), T0);
    expect(next.decision).toBe("accepted");
    full = next.draft;
  }
  expect(acceptSample(full, sample(MAX_SAMPLES * MIN_SAMPLE_GAP_MS), T0).decision).toBe("full");
  expect(parseMovementDraft(full)?.samples).toHaveLength(MAX_SAMPLES);
  expect(parseMovementDraft({ ...full, samples: [...full.samples].reverse() })).toBeNull();
  expect(isDraftExpired(T0, T0 + 24 * 60 * 60 * 1000)).toBe(false);
  expect(isDraftExpired(T0, T0 + 24 * 60 * 60 * 1000 + 1)).toBe(true);
});

test("start and end stop the watch, and a reload recovers the open draft", async ({ page }) => {
  await installWatch(page);
  await page.goto("/");
  await page.getByRole("button", { name: "Start walking" }).first().click();
  const sheet = page.getByRole("dialog", { name: "Before you walk" });
  await expect(sheet).toContainText("does not upload");
  await sheet.getByRole("button", { name: "Use my location" }).click();
  const recording = page.locator(".recording-view");
  await expect(recording).toHaveAttribute("data-sample-count", "2");
  await expect.poll(async () => (await readDraft(page))?.samples.length ?? 0).toBe(2);
  await expect(page.getByRole("heading", { name: "Recording" })).toBeVisible();
  await expect(page.getByText("saved on this phone")).toBeVisible();
  await expect(page.getByText("It is not uploaded.")).toBeVisible();
  await expect(page.getByText("12.97")).toHaveCount(0);
  await expect(page.locator('input[type="file"]')).toHaveCount(0);

  await page.reload();
  await expect(page.locator(".recording-view")).toHaveAttribute("data-sample-count", "2");
  await expect(page.getByRole("heading", { name: "Recording" })).toBeVisible();
  const watchesAfterReload = await page.evaluate(
    () => (window as unknown as { __footworkWatches?: number }).__footworkWatches ?? 0,
  );
  expect(watchesAfterReload).toBeGreaterThan(0);

  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.getByRole("button", { name: "Hold to end walk" }).click();
  await page.getByRole("button", { name: "Confirm end walk" }).click();
  await expect(page.getByRole("heading", { name: "Walk saved" })).toBeVisible();
  await expect(page.getByText("A piece is not being made yet.")).toBeVisible();
  await expect.poll(async () => (await readDraft(page))?.status).toBe("ended");
  const cleared = await page.evaluate(
    () => (window as unknown as { __footworkCleared?: number }).__footworkCleared ?? 0,
  );
  expect(cleared).toBeGreaterThan(0);
  await expect(page.locator('input[type="file"]')).toHaveCount(0);

  await page.reload();
  await expect(page.getByRole("button", { name: "Start walking" }).first()).toBeVisible();
  const ended = await readDraft(page);
  expect(ended?.status).toBe("ended");
  expect(ended?.samples).toHaveLength(2);
});

test("pausing stops the watch and a reload restores the paused draft", async ({ page }) => {
  await installWatch(page);
  await page.goto("/");
  await page.getByRole("button", { name: "Start walking" }).first().click();
  await page.getByRole("dialog").getByRole("button", { name: "Use my location" }).click();
  await expect(page.locator(".recording-view")).toHaveAttribute("data-sample-count", "2");
  await expect.poll(async () => (await readDraft(page))?.status).toBe("recording");
  await page.getByRole("button", { name: "Pause walk" }).click();
  await expect(page.getByRole("heading", { name: "Walk paused" })).toBeVisible();
  await expect.poll(async () => (await readDraft(page))?.status).toBe("paused");
  const cleared = await page.evaluate(
    () => (window as unknown as { __footworkCleared?: number }).__footworkCleared ?? 0,
  );
  expect(cleared).toBeGreaterThan(0);

  await page.reload();
  await expect(page.getByRole("heading", { name: "Walk paused" })).toBeVisible();
  await expect(page.locator(".recording-view")).toHaveAttribute("data-sample-count", "2");
  const watches = await page.evaluate(
    () => (window as unknown as { __footworkWatches?: number }).__footworkWatches ?? 0,
  );
  expect(watches).toBe(0);
});

test("permission denial, an offline phone, and a missing location API do not store a route", async ({
  page,
}) => {
  await page.addInitScript(() => {
    navigator.geolocation.watchPosition = (_success, error) => {
      (window as unknown as { __footworkWatches?: number }).__footworkWatches = 1;
      error?.({
        code: 1,
        message: "denied",
        PERMISSION_DENIED: 1,
        POSITION_UNAVAILABLE: 2,
        TIMEOUT: 3,
      } as GeolocationPositionError);
      return 1;
    };
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Start walking" }).first().click();
  await page.getByRole("dialog").getByRole("button", { name: "Use my location" }).click();
  const denied = page.getByRole("alert");
  await expect(denied).toContainText("cannot use your location yet");
  await expect(denied).toContainText("browser settings");
  await expect(denied).not.toContainText("did not open a location prompt");
  await expect(page.locator('input[type="file"]')).toHaveCount(0);
  expect(await readDraft(page)).toBeNull();

  await page.addInitScript(() => {
    Object.defineProperty(navigator, "onLine", { configurable: true, get: () => false });
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Start walking" }).first().click();
  await page.getByRole("dialog").getByRole("button", { name: "Use my location" }).click();
  await expect(page.getByRole("alert")).toContainText("Nothing was uploaded.");

  await page.addInitScript(() => {
    Object.defineProperty(navigator, "geolocation", {
      configurable: true,
      get: () => undefined,
    });
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Start walking" }).first().click();
  await page.getByRole("dialog").getByRole("button", { name: "Use my location" }).click();
  await expect(
    page.getByRole("heading", { name: "This browser cannot record a walk" }),
  ).toBeVisible();
  await expect(page.locator('input[type="file"]')).toHaveCount(0);
});

test("a draft older than a day is not restored", async ({ page }) => {
  await page.goto("/");
  const stale: MovementDraft = {
    ...createMovementDraft("stale-session", T0),
    samples: [sample(0)],
    updatedAtMs: Date.now() - 24 * 60 * 60 * 1000 - 1000,
  };
  await writeDraft(page, stale);
  await page.reload();
  await expect(page.getByRole("button", { name: "Start walking" }).first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "Recording" })).toHaveCount(0);
  expect(await readDraft(page)).toBeNull();
});

async function installWatch(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const timers = new Map<number, number>();
    let nextId = 1;
    const samples = [
      { latitude: 12.9716, longitude: 77.5946, accuracy: 8, timestamp: 1_700_000_000_000 },
      { latitude: 12.972, longitude: 77.595, accuracy: 80, timestamp: 1_700_000_001_500 },
      { latitude: 12.9724, longitude: 77.5954, accuracy: 30, timestamp: 1_700_000_003_000 },
      { latitude: 12.9726, longitude: 77.5956, accuracy: 12, timestamp: 1_700_000_003_400 },
    ];
    navigator.geolocation.getCurrentPosition = () => {
      (window as unknown as { __footworkCurrent?: boolean }).__footworkCurrent = true;
    };
    navigator.geolocation.watchPosition = (success) => {
      const id = nextId;
      nextId += 1;
      const mark = window as unknown as { __footworkWatches?: number };
      mark.__footworkWatches = (mark.__footworkWatches ?? 0) + 1;
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
      const mark = window as unknown as { __footworkCleared?: number };
      mark.__footworkCleared = (mark.__footworkCleared ?? 0) + 1;
      const timer = timers.get(id);
      if (timer !== undefined) window.clearInterval(timer);
      timers.delete(id);
    };
  });
}

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
