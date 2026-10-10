import { isDraftExpired, parseMovementDraft, type MovementDraft } from "./movementDraft";

export const DRAFT_DB = "footwork";

export const DRAFT_STORE = "drafts";

export const DRAFT_KEY = "current";

export type DraftStore = {
  read: (nowMs: number) => Promise<MovementDraft | null>;
  write: (draft: MovementDraft) => Promise<void>;
  clear: () => Promise<void>;
};

export function createDraftStore(factory: IDBFactory = indexedDB): DraftStore {
  let tail = Promise.resolve();
  const enqueue = <T>(work: () => Promise<T>): Promise<T> => {
    const run = tail.then(work, work);
    tail = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  };

  return {
    read(nowMs) {
      return enqueue(() => readDraft(factory, nowMs));
    },
    write(draft) {
      return enqueue(() => writeDraft(factory, draft));
    },
    clear() {
      return enqueue(() => clearDraft(factory));
    },
  };
}

async function readDraft(factory: IDBFactory, nowMs: number): Promise<MovementDraft | null> {
  const db = await openDb(factory);
  try {
    const stored = await request<unknown>(
      db.transaction(DRAFT_STORE, "readonly").objectStore(DRAFT_STORE).get(DRAFT_KEY),
    );
    const draft = parseMovementDraft(stored);
    if (!draft) return null;
    if (isDraftExpired(draft.updatedAtMs, nowMs)) {
      await deleteCurrent(db);
      return null;
    }
    return draft;
  } finally {
    db.close();
  }
}

async function writeDraft(factory: IDBFactory, draft: MovementDraft): Promise<void> {
  const parsed = parseMovementDraft(draft);
  if (!parsed) throw new Error("Draft is not storable");
  const db = await openDb(factory);
  try {
    await request(
      db.transaction(DRAFT_STORE, "readwrite").objectStore(DRAFT_STORE).put(parsed, DRAFT_KEY),
    );
  } finally {
    db.close();
  }
}

async function clearDraft(factory: IDBFactory): Promise<void> {
  const db = await openDb(factory);
  try {
    await deleteCurrent(db);
  } finally {
    db.close();
  }
}

function openDb(factory: IDBFactory): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const open = factory.open(DRAFT_DB, 1);
    open.onupgradeneeded = () => {
      const db = open.result;
      if (!db.objectStoreNames.contains(DRAFT_STORE)) db.createObjectStore(DRAFT_STORE);
    };
    open.onsuccess = () => resolve(open.result);
    open.onerror = () => reject(open.error ?? new Error("Draft store failed to open"));
  });
}

function deleteCurrent(db: IDBDatabase): Promise<void> {
  return request(
    db.transaction(DRAFT_STORE, "readwrite").objectStore(DRAFT_STORE).delete(DRAFT_KEY),
  );
}

function request<T>(query: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    query.onsuccess = () => resolve(query.result);
    query.onerror = () => reject(query.error ?? new Error("Draft store request failed"));
  });
}
