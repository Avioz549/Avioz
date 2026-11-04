import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { IDBFactory } from "fake-indexeddb";
import {
  loadWorkspace,
  saveWorkspace,
  recoveryHistory,
  parseBackup,
  backupDocument,
  LEGACY_KEY,
  rawWorkspace,
} from "../lib/storage";
import { emptyData } from "../lib/finance";
const values = new Map<string, string>();
beforeEach(() => {
  globalThis.indexedDB = new IDBFactory();
  values.clear();
  Object.defineProperty(globalThis, "localStorage", {
    value: {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
      removeItem: (key: string) => values.delete(key),
    },
    configurable: true,
  });
});
test("migrates V2 records exactly and retains the original localStorage copy", async () => {
  const old = emptyData();
  old.transactions.push({
    id: crypto.randomUUID(),
    title: "Salary",
    amount: 10000,
    date: "2026-01-01",
    kind: "income",
    category: "Salary",
    recurring: true,
  });
  const raw = JSON.stringify(old);
  localStorage.setItem(LEGACY_KEY, raw);
  const { snapshot, migrated } = await loadWorkspace();
  assert.equal(migrated, true);
  assert.deepEqual(snapshot.data, old);
  assert.equal(localStorage.getItem(LEGACY_KEY), raw);
  await saveWorkspace(
    { ...old, profile: { ...old.profile, name: "Dana" } },
    snapshot.revision,
  );
  assert.equal(localStorage.getItem(LEGACY_KEY), raw);
  assert.equal((await loadWorkspace()).snapshot.data.profile.name, "Dana");
});
test("serializes concurrent saves and rejects stale revisions without overwriting", async () => {
  const { snapshot } = await loadWorkspace();
  const one = {
      ...snapshot.data,
      profile: { ...snapshot.data.profile, name: "A" },
    },
    two = {
      ...snapshot.data,
      profile: { ...snapshot.data.profile, name: "B" },
    };
  const results = await Promise.allSettled([
    saveWorkspace(one, 0),
    saveWorkspace(two, 0),
  ]);
  assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
  assert.equal(results.filter((r) => r.status === "rejected").length, 1);
  assert.equal((await loadWorkspace()).snapshot.revision, 1);
  assert.equal((await recoveryHistory()).length, 1);
});
test("keeps exactly ten prior versions and can restore one through a new atomic save", async () => {
  let { snapshot } = await loadWorkspace();
  for (let i = 1; i <= 14; i++)
    snapshot = await saveWorkspace(
      {
        ...snapshot.data,
        profile: { ...snapshot.data.profile, name: String(i) },
      },
      snapshot.revision,
    );
  const history = await recoveryHistory();
  assert.equal(history.length, 10);
  assert.equal(history[0].data.profile.name, "13");
  const restored = await saveWorkspace(history[0].data, snapshot.revision);
  assert.equal(restored.data.profile.name, "13");
  assert.equal(restored.revision, 15);
  assert.equal((await recoveryHistory())[0].data.profile.name, "14");
});
test("invalid legacy data is never erased and validated backups can recover it", async () => {
  localStorage.setItem(LEGACY_KEY, '{"broken":true}');
  await assert.rejects(loadWorkspace());
  assert.equal(localStorage.getItem(LEGACY_KEY), '{"broken":true}');
  assert.equal(await rawWorkspace(), null);
  await saveWorkspace(emptyData(), 0);
  assert.deepEqual((await loadWorkspace()).snapshot.data, emptyData());
  assert.equal(localStorage.getItem(LEGACY_KEY), '{"broken":true}');
});
test("backup roundtrip supports versioned V3, raw V2 and old snapshot envelopes", () => {
  const data = emptyData();
  data.profile.name = "שלום";
  assert.deepEqual(
    parseBackup(JSON.stringify(backupDocument(data))).data,
    data,
  );
  assert.deepEqual(parseBackup(JSON.stringify(data)).data, data);
  assert.deepEqual(
    parseBackup(JSON.stringify({ data, revision: 5 })).data,
    data,
  );
  assert.throws(() =>
    parseBackup('{"application":"SAVIO","schemaVersion":99,"data":{}}'),
  );
  assert.throws(() => parseBackup('{"broken":true}'));
});
test("validation failure leaves current data and recovery history unchanged", async () => {
  const { snapshot } = await loadWorkspace();
  await assert.rejects(
    saveWorkspace({ ...snapshot.data, transactions: [{}] } as never, 0),
  );
  assert.equal((await loadWorkspace()).snapshot.revision, 0);
  assert.equal((await recoveryHistory()).length, 0);
});
