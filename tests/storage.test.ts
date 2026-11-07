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

test("unknown fields at every record level survive loading, saves, recovery and V3/V4 backups with source stores preserved through a safe DB upgrade", async () => {
  const data = emptyData();
  data.futureWorkspace = { nested: ["keep", 7] };
  data.profile.futureProfile = { keep: true };
  const work = crypto.randomUUID();
  data.workplaces = [
    {
      id: work,
      name: "Opaque",
      wage: 50,
      regularHours: 8,
      overtimeHours: 2,
      overtimeRate: 1.25,
      extraRate: 1.5,
      premiumRate: 1.5,
      futureWork: { keep: 1 },
      policy: {
        weeklyHours: 42,
        weeklyRate: 1.25,
        weekStart: 0,
        saturday: false,
        holidayRate: 1.5,
        nightRate: 1,
        nightStart: 22,
        nightEnd: 6,
        combination: "maximum",
        dailyAcrossShifts: false,
        futurePolicy: { nested: [4] },
      },
    },
  ];
  data.shifts = [
    {
      id: crypto.randomUUID(),
      workplaceId: work,
      start: "2026-11-01T09:00:00Z",
      end: "2026-11-01T10:00:00Z",
      breakMinutes: 0,
      paidBreak: false,
      premium: false,
      futureShift: { keep: 2 },
    },
  ];
  data.transactions = [
    {
      id: crypto.randomUUID(),
      title: "Opaque record",
      amount: 10,
      kind: "income",
      category: "Salary",
      date: "2026-11-01",
      recurring: false,
      futureTransaction: { keep: 3 },
    },
  ];
  data.goals = [
    {
      id: crypto.randomUUID(),
      name: "Goal",
      target: 100,
      existing: 0,
      monthly: 5,
      date: null,
      futureGoal: { keep: 4 },
      contributions: [
        {
          id: crypto.randomUUID(),
          amount: 5,
          date: "2026-11-01",
          futureContribution: { keep: 5 },
        },
      ],
    },
  ];
  data.reminders = [
    {
      id: crypto.randomUUID(),
      title: "Reminder",
      date: "2026-11-01",
      done: false,
      futureReminder: { keep: 6 },
    },
  ];
  const raw = JSON.stringify(data);
  localStorage.setItem(LEGACY_KEY, raw);
  const first = await loadWorkspace();
  assert.deepEqual(first.snapshot.data, data);
  const before = await rawWorkspace();
  await loadWorkspace();
  assert.deepEqual(await rawWorkspace(), before);
  const saved = await saveWorkspace(
    {
      ...first.snapshot.data,
      profile: { ...first.snapshot.data.profile, name: "Renamed" },
    },
    first.snapshot.revision,
  );
  assert.deepEqual(saved.data, {
    ...data,
    profile: { ...data.profile, name: "Renamed" },
  });
  assert.deepEqual((await recoveryHistory())[0].data, data);
  assert.equal(localStorage.getItem(LEGACY_KEY), raw);
  assert.deepEqual(
    parseBackup(JSON.stringify(backupDocument(saved.data))).data,
    saved.data,
  );
  assert.deepEqual(
    parseBackup(
      JSON.stringify({ application: "SAVIO", schemaVersion: 3, data }),
    ).data,
    data,
  );
  const db = await new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open("savio-local-v3");
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  assert.equal(db.version, 2);
  assert.deepEqual(Array.from(db.objectStoreNames), [
    "history",
    "history-v4",
    "migrations",
    "workspace",
    "workspace-v4",
  ]);
  db.close();
});
test("save preserves unknown snapshot envelope metadata as well as validated data", async () => {
  const { snapshot } = await loadWorkspace();
  const db = await new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open("savio-local-v3", 2);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction("workspace-v4", "readwrite");
    tx.objectStore("workspace-v4").put({
      ...snapshot,
      futureEnvelope: { keep: true },
    });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
  await saveWorkspace(snapshot.data, snapshot.revision);
  assert.deepEqual(
    ((await rawWorkspace()) as { futureEnvelope: unknown }).futureEnvelope,
    { keep: true },
  );
});
