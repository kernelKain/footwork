import { expect, test } from "@playwright/test";

import { createMovementDraft, type MovementDraft } from "../src/recording/movementDraft";
import { privateWalkBody } from "../src/recording/privateWalkFile";

test("an ended walk stored on this phone can be downloaded", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(async () => {
    const open = indexedDB.open("footwork", 1);
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      open.onupgradeneeded = () => {
        if (!open.result.objectStoreNames.contains("drafts")) {
          open.result.createObjectStore("drafts");
        }
      };
      open.onsuccess = () => resolve(open.result);
      open.onerror = () => reject(open.error);
    });
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction("drafts", "readwrite");
      tx.objectStore("drafts").put(
        {
          sessionId: "stored-walk",
          consentVersion: "1",
          status: "ended",
          samples: [
            { latitude: 12.97, longitude: 77.59, accuracyM: 8, timestampMs: Date.now() - 60_000 },
          ],
          interruptions: [],
          activeMs: 120_000,
          updatedAtMs: Date.now(),
        },
        "current",
      );
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  });
  await page.reload();
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download the walk stored on this phone" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("footwork-private-walk.json");
  expect(await page.getByText("This file contains the location of that walk.")).toBeVisible();
});

test("the phone download uses the fields the sanitizer reads", () => {
  const draft: MovementDraft = {
    ...createMovementDraft("walk-session", 1_700_000_000_000),
    status: "ended",
    samples: [
      {
        latitude: 12.97,
        longitude: 77.59,
        accuracyM: 8,
        timestampMs: 1_700_000_000_000,
      },
    ],
    interruptions: [
      { startMs: 1_000, endMs: 2_000, reason: "manual", open: false },
      { startMs: 3_000, endMs: 4_000, reason: "hidden", open: true },
    ],
  };

  expect(privateWalkBody(draft)).toEqual({
    schema_version: "1",
    mood: "warm_cinematic",
    consent_version: "1",
    samples: [
      {
        latitude: 12.97,
        longitude: 77.59,
        accuracy_m: 8,
        timestamp_ms: 1_700_000_000_000,
      },
    ],
    interruptions: [{ start_ms: 1_000, end_ms: 2_000 }],
  });
});
