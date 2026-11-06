import { test } from "node:test";
import assert from "node:assert/strict";
import { monthlyPayroll, calculatePayroll } from "../lib/payroll";
import { toMinorUnits, sumMoney, allocateMinorUnits } from "../lib/money";
import { emptyData, type Workplace, type Shift } from "../lib/finance";
import { overlappingCompletedShifts } from "../lib/shift-overlap";
import { mergeBackups } from "../lib/merge";
const workplace: Workplace = {
  id: crypto.randomUUID(),
  name: "Foundation QA",
  wage: 50,
  regularHours: 8,
  overtimeHours: 2,
  overtimeRate: 1.25,
  extraRate: 1.5,
  premiumRate: 1.5,
};
const record = (start: Date, end: Date, extra: Partial<Shift> = {}): Shift => ({
  id: crypto.randomUUID(),
  workplaceId: workplace.id,
  start: start.toISOString(),
  end: end.toISOString(),
  breakMinutes: 0,
  paidBreak: false,
  premium: false,
  ...extra,
});
test("three one-minute shifts preserve their historical 0.83 amounts and reconcile to 2.49", () => {
  const d = emptyData();
  d.workplaces = [workplace];
  d.shifts = [9, 10, 11].map((h) =>
    record(new Date(2026, 10, 1, h, 0), new Date(2026, 10, 1, h, 1)),
  );
  const original = JSON.stringify(d),
    p = monthlyPayroll(d, "2026-11", new Date(2026, 10, 6));
  assert.deepEqual(
    d.shifts.map((s) => p.byShift[s.id].gross),
    [0.83, 0.83, 0.83],
  );
  assert.equal(p.gross, 2.49);
  assert.equal(p.roundingAdjustmentMinor, -1);
  assert.equal(sumMoney(p.segments.map((s) => s.gross)), p.gross);
  assert.equal(JSON.stringify(d), original);
});
test("one-minute month-boundary shift allocates 83 cents exactly once; stable tie goes to first segment", () => {
  const d = emptyData();
  d.workplaces = [workplace];
  const s = record(
    new Date(2026, 10, 30, 23, 59, 30),
    new Date(2026, 11, 1, 0, 0, 30),
  );
  d.shifts = [s];
  const p = monthlyPayroll(d, "2026-11"),
    q = monthlyPayroll(d, "2026-12");
  assert.equal(p.gross, 0.42);
  assert.equal(q.gross, 0.41);
  assert.equal(sumMoney([p.gross, q.gross]), p.byShift[s.id].gross);
  assert.deepEqual(
    calculatePayroll(d.shifts, d.workplaces),
    calculatePayroll([...d.shifts], d.workplaces),
  );
});
test("frozen legacy gross, zero paid hours, premiums and additional compensation still reconcile", () => {
  for (const extra of [
    { legacyGross: 123.45 },
    { tips: 0.03, travel: 0.07, premium: true },
    { breakMinutes: 1, tips: 0.01, travel: 0.02 },
  ] as Partial<Shift>[]) {
    const d = emptyData();
    d.workplaces = [workplace];
    d.shifts = [
      record(
        new Date(2026, 10, 30, 23, 59, 30),
        new Date(2026, 11, 1, 0, 0, 30),
        extra,
      ),
    ];
    const copy = JSON.stringify(d),
      p = monthlyPayroll(d, "2026-11"),
      q = monthlyPayroll(d, "2026-12");
    assert.equal(sumMoney([p.gross, q.gross]), p.byShift[d.shifts[0].id].gross);
    assert.equal(JSON.stringify(d), copy);
    if (extra.legacyGross)
      assert.equal(p.byShift[d.shifts[0].id].gross, 123.45);
  }
});
test("minor-unit allocation handles repeated fractions, empty amounts and deterministic realistic segment ranges", () => {
  assert.deepEqual(allocateMinorUnits(0.83, [5 / 12, 5 / 12]), [0.42, 0.41]);
  assert.deepEqual(allocateMinorUnits(0, [0, 0]), [0, 0]);
  assert.equal(sumMoney([0.1, 0.2, 0.03]), 0.33);
  let seed = 7;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 2 ** 32;
  };
  for (let i = 0; i < 500; i++) {
    const parts = Array.from(
      { length: 1 + Math.floor(random() * 20) },
      () => random() * 10000,
    );
    const raw = parts.reduce((n, v) => n + v, 0),
      canonical = toMinorUnits(raw) / 100,
      allocated = allocateMinorUnits(canonical, parts);
    assert.equal(toMinorUnits(sumMoney(allocated)), toMinorUnits(canonical));
    assert.ok(allocated.every((n) => toMinorUnits(n) >= 0));
  }
});
test("overlap detection handles containment, overnight and duplicate intervals without counting touching endpoints, self, planned or other workplaces", () => {
  const start = new Date(2026, 10, 1, 22),
    end = new Date(2026, 10, 2, 6),
    candidate = record(start, end);
  const contained = record(new Date(2026, 10, 2, 1), new Date(2026, 10, 2, 2));
  const enclosing = record(new Date(2026, 10, 1, 21), new Date(2026, 10, 2, 7));
  const duplicate = { ...candidate, id: crypto.randomUUID() };
  const touching = record(end, new Date(2026, 10, 2, 8));
  const other = {
    ...contained,
    id: crypto.randomUUID(),
    workplaceId: crypto.randomUUID(),
  };
  const running = { ...contained, id: crypto.randomUUID(), end: null };
  const planned = { ...contained, id: crypto.randomUUID(), scheduled: true };
  const list = [
    candidate,
    contained,
    enclosing,
    duplicate,
    touching,
    other,
    running,
    planned,
  ];
  assert.deepEqual(
    new Set(overlappingCompletedShifts(candidate, list).map((s) => s.id)),
    new Set([contained.id, enclosing.id, duplicate.id]),
  );
  assert.deepEqual(
    overlappingCompletedShifts({ ...candidate, scheduled: true }, list),
    [],
  );
  assert.deepEqual(
    overlappingCompletedShifts({ ...candidate, end: null }, list),
    [],
  );
});
test("merge preserves opaque workspace/profile fields and blocks conflicting opaque data", () => {
  const current = emptyData(),
    incoming = emptyData();
  current.futureWorkspace = { nested: [1, 2] };
  current.profile.futureProfile = { flag: true };
  incoming.extraMetadata = { keep: "yes" };
  incoming.profile.newPreference = { keep: "also" };
  const merged = mergeBackups(current, incoming);
  assert.deepEqual(merged.futureWorkspace, current.futureWorkspace);
  assert.deepEqual(merged.extraMetadata, incoming.extraMetadata);
  assert.deepEqual(merged.profile.futureProfile, current.profile.futureProfile);
  assert.deepEqual(
    merged.profile.newPreference,
    incoming.profile.newPreference,
  );
  assert.throws(
    () =>
      mergeBackups(current, { ...incoming, futureWorkspace: { nested: [3] } }),
    /Conflicting unknown/,
  );
});
