import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { IDBFactory } from "fake-indexeddb";
import {
  loadWorkspace,
  saveWorkspace,
  rawWorkspace,
  migrationSource,
  recoveryHistory,
  DATABASE,
  ACTIVE_WORKSPACE,
  ACTIVE_HISTORY,
  DATA_VERSION,
} from "../lib/storage";
import { emptyData } from "../lib/finance";
import { emptyLife } from "../lib/life-model";
const values = new Map<string, string>();
beforeEach(() => {
  globalThis.indexedDB = new IDBFactory();
  values.clear();
  Object.defineProperty(globalThis, "localStorage", {
    value: {
      getItem: (k: string) => values.get(k) ?? null,
      setItem: (k: string, v: string) => values.set(k, v),
    },
    configurable: true,
  });
});
async function seedV3(data: unknown) {
  const db = await new Promise<IDBDatabase>((resolve, reject) => {
    const r = indexedDB.open(DATABASE, 1);
    r.onupgradeneeded = () => {
      r.result.createObjectStore("workspace", { keyPath: "id" });
      r.result.createObjectStore("history", { keyPath: "key" });
    };
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
  const original = {
    id: "main",
    revision: 17,
    data,
    updatedAt: "2026-11-01T12:00:00Z",
    opaqueEnvelope: { keep: true },
  };
  await new Promise<void>((resolve, reject) => {
    const t = db.transaction(["workspace", "history"], "readwrite");
    t.objectStore("workspace").put(original);
    t.objectStore("history").put({ ...original, key: 16 });
    t.oncomplete = () => resolve();
    t.onerror = () => reject(t.error);
  });
  db.close();
  return original;
}
async function read(store: string, key: IDBValidKey) {
  const db = await new Promise<IDBDatabase>((resolve, reject) => {
    const r = indexedDB.open(DATABASE);
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
  try {
    return await new Promise<unknown>((resolve, reject) => {
      const r = db.transaction(store).objectStore(store).get(key);
      r.onsuccess = () => resolve(r.result ?? null);
      r.onerror = () => reject(r.error);
    });
  } finally {
    db.close();
  }
}
test("atomic V3 migration preserves source, old history, fields and IDs and is idempotent", async () => {
  const d = emptyData();
  d.opaque = { future: [1, 2] };
  d.profile.opaque = { profile: true };
  const original = await seedV3(d);
  const first = await loadWorkspace();
  assert.equal(first.migrated, true);
  assert.equal(first.snapshot.dataVersion, DATA_VERSION);
  assert.equal(first.snapshot.revision, 17);
  assert.deepEqual(first.snapshot.data, d);
  assert.deepEqual(await read("workspace", "main"), original);
  assert.deepEqual(
    ((await migrationSource()) as { source: unknown }).source,
    original,
  );
  const second = await loadWorkspace();
  assert.equal(second.migrated, false);
  assert.deepEqual(second.snapshot, first.snapshot);
  let current = first.snapshot;
  for (let i = 0; i < 12; i++)
    current = await saveWorkspace(
      { ...current.data, life: { ...emptyLife(), opaque: i } },
      current.revision,
    );
  assert.equal((await recoveryHistory()).length, 10);
  assert.deepEqual(await read("workspace", "main"), original);
  assert.ok(await read("history", 16));
  assert.deepEqual(
    ((await migrationSource()) as { source: unknown }).source,
    original,
  );
  assert.deepEqual(
    ((await rawWorkspace()) as { data: unknown }).data,
    current.data,
  );
});
test("invalid or colliding life data aborts migration without replacing source records", async () => {
  const d = {
    ...emptyData(),
    life: { version: 99, unrecognized: "preserve this" },
  };
  const original = await seedV3(d);
  await assert.rejects(loadWorkspace(), /migrated or validated/);
  assert.deepEqual(await read("workspace", "main"), original);
  assert.equal(await read(ACTIVE_WORKSPACE, "main"), null);
  assert.deepEqual(await rawWorkspace(), original);
  assert.equal(await migrationSource(), null);
  assert.equal(await read(ACTIVE_HISTORY, 17), null);
});
test("old version-1 clients cannot reopen and overwrite V4; stale revisions still fail closed", async () => {
  await seedV3(emptyData());
  const { snapshot } = await loadWorkspace();
  await assert.rejects(
    new Promise((resolve, reject) => {
      const r = indexedDB.open(DATABASE, 1);
      r.onsuccess = () => {
        r.result.close();
        resolve(r.result);
      };
      r.onerror = () => reject(r.error);
    }),
    { name: "VersionError" },
  );
  await saveWorkspace(
    { ...snapshot.data, life: emptyLife() },
    snapshot.revision,
  );
  await assert.rejects(
    saveWorkspace(snapshot.data, snapshot.revision),
    /another tab/,
  );
  assert.equal((await loadWorkspace()).snapshot.revision, 18);
});
test("corrupt new records cannot replace a valid V4 workspace or alter its recovery history", async () => {
  const { snapshot } = await loadWorkspace(),
    before = await rawWorkspace();
  await assert.rejects(
    saveWorkspace(
      { ...snapshot.data, life: { ...emptyLife(), tasks: [{}] } } as never,
      snapshot.revision,
    ),
  );
  assert.deepEqual(await rawWorkspace(), before);
  assert.deepEqual(await recoveryHistory(), []);
});
