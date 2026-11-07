import { dataSchema, emptyData, type FinanceData } from "./finance";
import { convertLegacy, legacyTables, type LegacyTables } from "./legacy";
export const DATABASE = "savio-local-v3";
export const DATABASE_VERSION = 2;
export const ACTIVE_WORKSPACE = "workspace-v4";
export const ACTIVE_HISTORY = "history-v4";
export const MIGRATIONS = "migrations";
export const DATA_VERSION = 5;
export const LEGACY_KEY = "savio-local-v1";
export type Snapshot = {
  id: "main";
  revision: number;
  data: FinanceData;
  updatedAt: string;
  dataVersion?: number;
};
export type Recovery = Snapshot & { key: number };
function open() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    let blocked = false;
    const req = indexedDB.open(DATABASE, DATABASE_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      for (const [name, key] of [
        ["workspace", "id"],
        ["history", "key"],
        [ACTIVE_WORKSPACE, "id"],
        [ACTIVE_HISTORY, "key"],
        [MIGRATIONS, "id"],
      ])
        if (!db.objectStoreNames.contains(name))
          db.createObjectStore(name, { keyPath: key });
    };
    req.onsuccess = () => {
      if (blocked) {
        req.result.close();
        return;
      }
      req.result.onversionchange = () => req.result.close();
      resolve(req.result);
    };
    req.onerror = () =>
      reject(
        new Error(
          "Local storage is unavailable or this app is older than the stored format. No data was erased.",
        ),
      );
    req.onblocked = () => {
      blocked = true;
      reject(
        new Error(
          "Close other SAVIO tabs before this safe storage upgrade. No records were changed.",
        ),
      );
    };
  });
}
function checked(raw: Snapshot): Snapshot {
  if (
    !Number.isSafeInteger(raw.revision) ||
    raw.revision < 0 ||
    (raw.dataVersion !== undefined && raw.dataVersion > DATA_VERSION)
  )
    throw new Error("Unsupported workspace version");
  return { ...raw, data: dataSchema.parse(raw.data) };
}
export async function loadWorkspace(): Promise<{
  snapshot: Snapshot;
  migrated: boolean;
}> {
  const db = await open();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(
          [ACTIVE_WORKSPACE, "workspace", MIGRATIONS],
          "readwrite",
        ),
        store = tx.objectStore(ACTIVE_WORKSPACE);
      let snapshot: Snapshot,
        migrated = false;
      const get = store.get("main");
      get.onsuccess = () => {
        if (get.result) {
          try {
            snapshot = checked(get.result);
          } catch {
            tx.abort();
          }
          return;
        }
        const original = tx.objectStore("workspace").get("main");
        original.onsuccess = () => {
          try {
            const legacy = original.result
              ? null
              : localStorage.getItem(LEGACY_KEY);
            const source = original.result as Snapshot | undefined;
            snapshot = source
              ? { ...checked(source), dataVersion: DATA_VERSION }
              : {
                  id: "main",
                  revision: 0,
                  data: legacy
                    ? dataSchema.parse(JSON.parse(legacy))
                    : emptyData(),
                  updatedAt: new Date().toISOString(),
                  dataVersion: DATA_VERSION,
                };
            migrated = Boolean(source || legacy);
            if (migrated)
              tx.objectStore(MIGRATIONS).add({
                id: "v4-source",
                source: source ?? JSON.parse(legacy!),
                sourceKind: source ? "indexeddb-v3" : "local-v2",
                createdAt: new Date().toISOString(),
              });
            store.add(snapshot);
          } catch {
            tx.abort();
          }
        };
      };
      tx.oncomplete = () => resolve({ snapshot, migrated });
      tx.onabort = () =>
        reject(
          new Error(
            "Saved data could not be migrated or validated. The original records were kept. Export the source before recovery.",
          ),
        );
      tx.onerror = () =>
        reject(new Error("Could not open records. No source data was erased."));
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
      const tx = db.transaction(
          [ACTIVE_WORKSPACE, ACTIVE_HISTORY],
          "readwrite",
        ),
        store = tx.objectStore(ACTIVE_WORKSPACE);
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
        if (current) {
          try {
            checked(current);
          } catch {
            tx.abort();
            return;
          }
        }
        next = {
          ...current,
          id: "main",
          data: parsed,
          dataVersion: DATA_VERSION,
          revision: (current?.revision ?? 0) + 1,
          updatedAt: new Date().toISOString(),
        };
        if (current)
          tx.objectStore(ACTIVE_HISTORY).put({
            ...current,
            key: current.revision,
          });
        store.put(next);
        const keys = tx.objectStore(ACTIVE_HISTORY).getAllKeys();
        keys.onsuccess = () =>
          keys.result
            .sort((a, b) => Number(a) - Number(b))
            .slice(0, -10)
            .forEach((key) => tx.objectStore(ACTIVE_HISTORY).delete(key));
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
      const request = db
        .transaction(ACTIVE_HISTORY)
        .objectStore(ACTIVE_HISTORY)
        .getAll();
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
    schemaVersion: DATA_VERSION,
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
    if (![3, 4, DATA_VERSION].includes(parsed.schemaVersion))
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

export async function rawWorkspace(activeOnly = false): Promise<unknown> {
  const db = await open();
  try {
    return await new Promise((resolve, reject) => {
      const r = db
        .transaction(ACTIVE_WORKSPACE)
        .objectStore(ACTIVE_WORKSPACE)
        .get("main");
      r.onsuccess = () => {
        if (r.result || activeOnly) return resolve(r.result ?? null);
        const source = db
          .transaction("workspace")
          .objectStore("workspace")
          .get("main");
        source.onsuccess = () => resolve(source.result ?? null);
        source.onerror = () =>
          reject(new Error("Could not read original workspace"));
      };
      r.onerror = () => reject(new Error("Could not read workspace"));
    });
  } finally {
    db.close();
  }
}
export async function storedRevision() {
  const raw = (await rawWorkspace(true)) as Snapshot | null;
  return Number.isInteger(raw?.revision) ? raw!.revision : 0;
}

export async function migrationSource(): Promise<unknown> {
  const db = await open();
  try {
    return await new Promise((resolve, reject) => {
      const r = db
        .transaction(MIGRATIONS)
        .objectStore(MIGRATIONS)
        .get("v4-source");
      r.onsuccess = () => resolve(r.result ?? null);
      r.onerror = () => reject(r.error);
    });
  } finally {
    db.close();
  }
}
