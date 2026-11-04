import { dataSchema, emptyData, type FinanceData } from "./finance";
import { convertLegacy, legacyTables, type LegacyTables } from "./legacy";
export const DATABASE = "savio-local-v3";
export const LEGACY_KEY = "savio-local-v1";
export type Snapshot = {
  id: "main";
  revision: number;
  data: FinanceData;
  updatedAt: string;
};
export type Recovery = Snapshot & { key: number };
function open() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open(DATABASE, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore("workspace", { keyPath: "id" });
      req.result.createObjectStore("history", { keyPath: "key" });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () =>
      reject(
        new Error(
          "Local storage is unavailable. Your existing data has not been changed.",
        ),
      );
    req.onblocked = () =>
      reject(
        new Error("Close other SAVIO tabs, then retry opening local storage."),
      );
  });
}
function checked(raw: Snapshot): Snapshot {
  return { ...raw, data: dataSchema.parse(raw.data) };
}
export async function loadWorkspace(): Promise<{
  snapshot: Snapshot;
  migrated: boolean;
}> {
  const db = await open();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction("workspace", "readwrite"),
        store = tx.objectStore("workspace");
      let snapshot: Snapshot;
      let migrated = false;
      const get = store.get("main");
      get.onsuccess = () => {
        try {
          if (get.result) snapshot = checked(get.result);
          else {
            const raw = localStorage.getItem(LEGACY_KEY);
            snapshot = {
              id: "main",
              revision: 0,
              data: raw ? dataSchema.parse(JSON.parse(raw)) : emptyData(),
              updatedAt: new Date().toISOString(),
            };
            migrated = Boolean(raw);
            store.add(snapshot);
          }
        } catch {
          tx.abort();
        }
      };
      tx.oncomplete = () => resolve({ snapshot, migrated });
      tx.onabort = () =>
        reject(
          new Error(
            "Saved data could not be validated. Nothing was erased. Export the original browser backup before attempting recovery.",
          ),
        );
      tx.onerror = () =>
        reject(new Error("Unable to read your local workspace."));
    });
  } finally {
    db.close();
  }
}
export async function saveWorkspace(
  data: FinanceData,
  expectedRevision: number,
): Promise<Snapshot> {
  const parsed = dataSchema.parse(data);
  const db = await open();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(["workspace", "history"], "readwrite"),
        store = tx.objectStore("workspace");
      let next: Snapshot;
      let conflict = false;
      const get = store.get("main");
      get.onsuccess = () => {
        const current = get.result as Snapshot | undefined;
        if (
          (!current && expectedRevision !== 0) ||
          (current && current.revision !== expectedRevision)
        ) {
          conflict = true;
          tx.abort();
          return;
        }
        next = {
          id: "main",
          data: parsed,
          revision: (current?.revision ?? 0) + 1,
          updatedAt: new Date().toISOString(),
        };
        if (current)
          tx.objectStore("history").put({ ...current, key: current.revision });
        store.put(next);
        const keys = tx.objectStore("history").getAllKeys();
        keys.onsuccess = () =>
          keys.result
            .sort((a, b) => Number(a) - Number(b))
            .slice(0, -10)
            .forEach((key) => tx.objectStore("history").delete(key));
      };
      tx.oncomplete = () => {
        resolve(next);
      };
      tx.onabort = () =>
        reject(
          new Error(
            conflict
              ? "Your records changed in another tab. Reload before saving."
              : "Save failed. Your previous records were preserved. Check available storage and try again.",
          ),
        );
      tx.onerror = () =>
        reject(
          new Error(
            "Local save failed. Export a backup before clearing browser data.",
          ),
        );
    });
  } finally {
    db.close();
  }
}
export async function recoveryHistory(): Promise<Recovery[]> {
  const db = await open();
  try {
    return await new Promise((resolve, reject) => {
      const request = db.transaction("history").objectStore("history").getAll();
      request.onsuccess = () =>
        resolve(
          (request.result as Recovery[])
            .filter((r) => dataSchema.safeParse(r.data).success)
            .sort((a, b) => b.key - a.key),
        );
      request.onerror = () =>
        reject(new Error("Could not load recovery history."));
    });
  } finally {
    db.close();
  }
}
export function backupDocument(data: FinanceData) {
  return {
    application: "SAVIO",
    schemaVersion: 3,
    exportedAt: new Date().toISOString(),
    data: dataSchema.parse(data),
  };
}
export function parseBackup(raw: string): {
  data: FinanceData;
  warnings: string[];
} {
  if (new TextEncoder().encode(raw).length > 10 * 1024 * 1024)
    throw new Error("Backup exceeds the 10 MB limit.");
  const parsed = JSON.parse(raw);
  if (parsed && parsed.application === "SAVIO") {
    if (parsed.schemaVersion !== 3)
      throw new Error(
        "This backup uses an unsupported version. Update SAVIO before restoring it.",
      );
    return { data: dataSchema.parse(parsed.data), warnings: [] };
  }
  if (parsed && legacyTables.every((t) => Array.isArray(parsed[t])))
    return convertLegacy(
      parsed as LegacyTables,
      new Date().toISOString().slice(0, 10),
    );
  return { data: dataSchema.parse(parsed?.data ?? parsed), warnings: [] };
}

export async function rawWorkspace(): Promise<unknown> {
  const db = await open();
  try {
    return await new Promise((resolve, reject) => {
      const r = db
        .transaction("workspace")
        .objectStore("workspace")
        .get("main");
      r.onsuccess = () => resolve(r.result ?? null);
      r.onerror = () => reject(new Error("Could not read workspace"));
    });
  } finally {
    db.close();
  }
}
export async function storedRevision() {
  const raw = (await rawWorkspace()) as Snapshot | null;
  return Number.isInteger(raw?.revision) ? raw!.revision : 0;
}
