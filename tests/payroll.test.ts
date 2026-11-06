import { test } from "node:test";
import assert from "node:assert/strict";
import { monthlyPayroll, calculatePayroll, dateKey } from "../lib/payroll";
import {
  emptyData,
  shiftSchema,
  dataSchema,
  goalSaved,
  type Workplace,
  type Shift,
} from "../lib/finance";
import { localAnswer, goalShifts } from "../lib/insights";
import { mergeBackups } from "../lib/merge";
import { backupDocument, parseBackup } from "../lib/storage";
const w: Workplace = {
  id: crypto.randomUUID(),
  name: "Cafe",
  wage: 50,
  regularHours: 8,
  overtimeHours: 2,
  overtimeRate: 1.25,
  extraRate: 1.5,
  premiumRate: 1.5,
};
const iso = (day: number, hour: number, month = 0) =>
  new Date(2026, month, day, hour).toISOString();
const shift = (day = 4, hours = 8, extra: Partial<Shift> = {}): Shift => ({
  id: crypto.randomUUID(),
  workplaceId: w.id,
  start: iso(day, 8),
  end: iso(day, 8 + hours),
  breakMinutes: 0,
  paidBreak: false,
  premium: false,
  ...extra,
});
const policy: NonNullable<Workplace["policy"]> = {
  weeklyHours: 10,
  weeklyRate: 1.5,
  weekStart: 0,
  saturday: true,
  holidayRate: 2,
  nightRate: 1.2,
  nightStart: 22,
  nightEnd: 6,
  combination: "multiply",
  dailyAcrossShifts: true,
};
test("daily and weekly overtime use higher rate; workplaces keep independent weekly totals", () => {
  const a = shift(4),
    b = shift(5),
    other = { ...w, id: crypto.randomUUID(), policy };
  const p = calculatePayroll(
    [a, b, { ...shift(5), workplaceId: other.id }],
    [{ ...w, policy }, other],
  );
  assert.equal(p.byShift[a.id].gross, 400);
  assert.equal(p.byShift[b.id].gross, 550);
  assert.equal(
    p.segments
      .filter((s) => s.workplaceId === other.id)
      .reduce((n, s) => n + s.gross, 0),
    400,
  );
});
test("Saturday holiday and overtime overlap by explicitly selected combination", () => {
  const s = shift(3, 10, { holiday: true }); // Jan 3 2026 Saturday
  const result = (combination: "multiply" | "maximum" | "add") =>
    calculatePayroll(
      [s],
      [{ ...w, policy: { ...policy, weeklyHours: 168, combination } }],
    ).byShift[s.id].gross;
  assert.equal(result("multiply"), 1050);
  assert.equal(result("maximum"), 1000);
  assert.equal(result("add"), 1025);
});
test("overnight night premiums, paid/unpaid breaks and tips/travel remain separate", () => {
  const s = shift(4, 8, {
    start: iso(4, 22),
    end: iso(5, 6),
    breakMinutes: 60,
    tips: 30,
    travel: 20,
  });
  const p = calculatePayroll([s], [{ ...w, policy }]).byShift[s.id];
  assert.equal(p.hours, 7);
  assert.equal(p.wages, 420);
  assert.equal(p.gross, 470);
  assert.equal(
    calculatePayroll([{ ...s, paidBreak: true }], [{ ...w, policy }]).byShift[
      s.id
    ].gross,
    530,
  );
});
test("daily accumulation is optional and editing recomputes weekly estimates", () => {
  const a = shift(4, 5),
    b = shift(4, 5, { start: iso(4, 14), end: iso(4, 19) }),
    work = { ...w, policy: { ...policy, weeklyHours: 168 } };
  assert.equal(calculatePayroll([a, b], [work]).byShift[b.id].gross, 275);
  assert.equal(
    calculatePayroll([a, { ...b, end: iso(4, 17) }], [work]).byShift[b.id]
      .gross,
    150,
  );
  assert.equal(
    calculatePayroll(
      [a, b],
      [{ ...work, policy: { ...work.policy, dailyAcrossShifts: false } }],
    ).byShift[b.id].gross,
    250,
  );
});
test("month allocation uses local midnight and includes preceding week context", () => {
  const s = shift(31, 4, { start: iso(31, 22), end: iso(1, 2, 1) }),
    d = emptyData();
  d.workplaces = [w];
  d.shifts = [s];
  assert.equal(monthlyPayroll(d, "2026-01").gross, 100);
  assert.equal(monthlyPayroll(d, "2026-02").gross, 100);
  assert.equal(dateKey(new Date(s.start)), "2026-01-31");
});
test("scheduled forecast includes already worked hours for weekly threshold without counting as earned", () => {
  const d = emptyData();
  d.workplaces = [{ ...w, policy }];
  const a = shift(4),
    b = shift(5, 8, { scheduled: true });
  d.shifts = [a, b];
  const p = monthlyPayroll(d, "2026-01", new Date(2026, 0, 4, 18));
  assert.equal(p.gross, 400);
  assert.equal(p.scheduled, 550);
  assert.equal(p.forecast, 950);
  assert.equal(
    monthlyPayroll({ ...d, shifts: [a] }, "2026-01").hasSchedule,
    false,
  );
});
test("invalid and scheduled running shifts rejected; received income never includes estimates", () => {
  assert.equal(
    shiftSchema.safeParse({ ...shift(), end: "bad" }).success,
    false,
  );
  assert.equal(
    shiftSchema.safeParse({ ...shift(), end: null, scheduled: true }).success,
    false,
  );
  const d = emptyData();
  d.workplaces = [w];
  d.shifts = [shift()];
  d.transactions = [
    {
      id: crypto.randomUUID(),
      title: "Received",
      amount: 100,
      kind: "income",
      category: "Salary",
      date: "2026-01-04",
      recurring: false,
      linkedShiftId: d.shifts[0].id,
    },
  ];
  assert.equal(dataSchema.safeParse(d).success, true);
  assert.match(localAnswer("כמה הרווחתי", d, "2026-01"), /400/);
  assert.equal(
    dataSchema.safeParse({
      ...d,
      transactions: [{ ...d.transactions[0], kind: "expense" }],
    }).success,
    false,
  );
});
test("withdrawals cannot overdraw ledger and shift goal estimates respect saving share", () => {
  const d = emptyData();
  d.workplaces = [w];
  d.shifts = [shift()];
  const g = {
    id: crypto.randomUUID(),
    name: "Goal",
    target: 1000,
    existing: 200,
    monthly: 100,
    date: null,
    savingShare: 50,
    contributions: [
      {
        id: crypto.randomUUID(),
        amount: 100,
        date: "2026-01-05",
        kind: "withdrawal" as const,
      },
    ],
  };
  d.goals = [g];
  assert.equal(goalSaved(g), 100);
  assert.equal(goalShifts(d, g, new Date("2026-02-01")), 5);
  assert.equal(
    dataSchema.safeParse({ ...d, goals: [{ ...g, existing: 0 }] }).success,
    false,
  );
  assert.equal(goalShifts(d, { ...g, savingShare: 0 }), null);
});
test("extended backups preserve fields; merge deduplicates identical records and blocks conflicts", () => {
  const d = emptyData();
  d.workplaces = [{ ...w, policy }];
  d.shifts = [shift(4, 8, { tips: 12, travel: 8, notes: "note" })];
  d.customCategories = ["Personal"];
  const saved = parseBackup(JSON.stringify(backupDocument(d))).data;
  assert.deepEqual(saved, d);
  assert.equal(mergeBackups(d, saved).shifts.length, 1);
  assert.throws(
    () =>
      mergeBackups(d, { ...saved, shifts: [{ ...saved.shifts[0], tips: 99 }] }),
    /Conflicting/,
  );
  assert.equal(
    parseBackup(
      JSON.stringify({
        application: "SAVIO",
        schemaVersion: 3,
        data: emptyData(),
      }),
    ).data.profile.theme,
    "dark",
  );
});

test("expected recurring income does not become received money until confirmed once", async () => {
  const { monthTransactions, totals } = await import("../lib/finance");
  const d = emptyData(),
    source = {
      id: crypto.randomUUID(),
      title: "Salary",
      kind: "income" as const,
      amount: 1000,
      category: "Salary",
      date: "2026-01-01",
      recurring: true,
    };
  d.transactions = [source];
  assert.equal(totals(monthTransactions(d.transactions, "2026-02")).income, 0);
  d.transactions.push({
    ...source,
    id: crypto.randomUUID(),
    date: "2026-02-01",
    recurring: false,
    recurrenceId: source.id,
  });
  const feb = monthTransactions(d.transactions, "2026-02");
  assert.equal(feb.length, 1);
  assert.equal(totals(feb).income, 1000);
});

test("weekly context carries across a month boundary and clock changes use elapsed instants", () => {
  const data = emptyData();
  data.workplaces = [
    { ...w, regularHours: 24, policy: { ...policy, nightRate: 1 } },
  ];
  const before = shift(29, 8, {
    start: new Date(2026, 3, 29, 8).toISOString(),
    end: new Date(2026, 3, 29, 16).toISOString(),
  });
  const cross = shift(30, 8, {
    start: new Date(2026, 3, 30, 20).toISOString(),
    end: new Date(2026, 4, 1, 4).toISOString(),
  });
  data.shifts = [before, cross];
  assert.equal(monthlyPayroll(data, "2026-04").gross, 650);
  assert.equal(monthlyPayroll(data, "2026-05").gross, 300);
  const start = new Date(2026, 2, 27, 0),
    end = new Date(2026, 2, 27, 4),
    dst = shift(1, 4, { start: start.toISOString(), end: end.toISOString() });
  const elapsed = (end.getTime() - start.getTime()) / 3600000;
  assert.equal(calculatePayroll([dst], [w]).byShift[dst.id].hours, elapsed);
});

test("expired planned shifts do not inflate remaining forecasts or actual pay", () => {
  const d = emptyData();
  d.workplaces = [{ ...w, policy }];
  const expired = shift(4, 8, { scheduled: true }),
    next = shift(5, 8, { scheduled: true });
  d.shifts = [expired, next];
  const p = monthlyPayroll(d, "2026-01", new Date(2026, 0, 4, 18));
  assert.equal(p.gross, 0);
  assert.equal(p.scheduled, 400);
  assert.equal(
    monthlyPayroll(d, "2026-01", new Date(2026, 1, 1)).hasSchedule,
    false,
  );
});
