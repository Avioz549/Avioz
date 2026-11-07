import { test } from "node:test";
import assert from "node:assert/strict";
import {
  emptyData,
  dataSchema,
  goalSaved,
  monthTransactions,
  type FinanceData,
} from "../lib/finance";
import { emptyLife, type Task, type PersonalGoal } from "../lib/life-model";
import {
  occursOn,
  taskOccurrences,
  subscriptionOccurrences,
  plannerEntries,
  toggleTask,
  cashForecast,
  personalProgress,
  smartDay,
  workStats,
  monthRecap,
  recordGoalCompletion,
  recapText,
} from "../lib/life";
import { monthlyPayroll } from "../lib/payroll";
import { sumMoney } from "../lib/money";
import { backupDocument, parseBackup } from "../lib/storage";
import { mergeBackups } from "../lib/merge";
function fixture() {
  const d = emptyData();
  d.life = emptyLife();
  return d as FinanceData & { life: ReturnType<typeof emptyLife> };
}
function task(extra: Partial<Task> = {}): Task {
  return {
    id: crypto.randomUUID(),
    title: "A real task",
    due: "2026-11-01",
    time: null,
    priority: "normal",
    category: "Personal",
    notes: "",
    repeat: "daily",
    until: null,
    goalId: null,
    completions: {},
    ...extra,
  };
}
function goal(extra: Partial<PersonalGoal> = {}): PersonalGoal {
  return {
    id: crypto.randomUUID(),
    name: "Learn",
    kind: "personal",
    category: "Study",
    target: 10,
    unit: "lessons",
    deadline: null,
    milestones: [],
    history: [],
    completedAt: null,
    ...extra,
  };
}
test("recurrences clamp monthly/yearly endpoints and keep local weekly dates across DST", () => {
  assert.equal(occursOn("2026-01-31", "monthly", "2026-02-28"), true);
  assert.equal(occursOn("2026-01-31", "monthly", "2026-03-28"), false);
  assert.equal(occursOn("2024-02-29", "yearly", "2025-02-28"), true);
  assert.equal(occursOn("2026-03-20", "weekly", "2026-03-27"), true);
  assert.equal(
    occursOn("2026-11-01", "daily", "2026-11-03", "2026-11-02"),
    false,
  );
  assert.equal(occursOn("2026-11-03", "daily", "2026-11-02"), false);
});
test("repeating task instances stay virtual and completion is isolated to the chosen date", () => {
  const d = fixture(),
    t = task({ futureMetadata: { keep: true } });
  d.life.tasks = [t];
  assert.equal(taskOccurrences(d, "2026-11-01", "2026-11-03").length, 3);
  assert.equal(d.life.tasks.length, 1);
  const completed = toggleTask(t, "2026-11-02", "2026-11-02T12:00:00Z");
  d.life.tasks = [completed];
  assert.deepEqual(
    taskOccurrences(d, "2026-11-01", "2026-11-03").map((o) => o.done),
    [false, true, false],
  );
  assert.deepEqual(completed.futureMetadata, { keep: true });
  assert.deepEqual(
    toggleTask(completed, "2026-11-02", "2026-11-02T13:00:00Z").completions,
    {},
  );
});
test("integrated calendar uses original shift IDs and does not duplicate a midnight end day", () => {
  const d = fixture(),
    work = crypto.randomUUID();
  d.workplaces = [
    {
      id: work,
      name: "Cafe",
      wage: 50,
      regularHours: 8,
      overtimeHours: 2,
      overtimeRate: 1.25,
      extraRate: 1.5,
      premiumRate: 1.5,
    },
  ];
  const shift = {
    id: crypto.randomUUID(),
    workplaceId: work,
    start: new Date(2026, 10, 1, 22).toISOString(),
    end: new Date(2026, 10, 2, 0).toISOString(),
    breakMinutes: 0,
    paidBreak: false,
    premium: false,
  };
  d.shifts = [shift];
  d.life.tasks = [task({ repeat: "none" })];
  const before = JSON.stringify(d),
    items = plannerEntries(d, "2026-11-01", "2026-11-02");
  assert.equal(items.filter((i) => i.type === "shift").length, 1);
  assert.equal(items.find((i) => i.type === "shift")?.id, shift.id);
  assert.equal(JSON.stringify(d), before);
});
test("confirmed and projected cash flow reconcile when a subscription occurrence is confirmed once", () => {
  const d = fixture();
  d.transactions = [
    {
      id: crypto.randomUUID(),
      title: "Income",
      kind: "income",
      amount: 1000,
      category: "Salary",
      date: "2026-11-01",
      recurring: false,
    },
    {
      id: crypto.randomUUID(),
      title: "Paid bill",
      kind: "expense",
      amount: 200,
      category: "Bills",
      date: "2026-11-02",
      recurring: false,
    },
  ];
  const s = {
    id: crypto.randomUUID(),
    name: "Service",
    amount: 100,
    kind: "expense" as const,
    category: "Bills",
    start: "2026-11-01",
    repeat: "monthly" as const,
    until: null,
    active: true,
  };
  d.life.subscriptions = [s];
  const before = cashForecast(d, "2026-11");
  assert.equal(before.balance, 800);
  assert.equal(before.projectedBalance, 700);
  d.transactions.push({
    id: crypto.randomUUID(),
    title: s.name,
    kind: s.kind,
    amount: s.amount,
    category: s.category,
    date: s.start,
    recurring: false,
    subscriptionId: s.id,
    subscriptionOccurrence: s.start,
  });
  d.transactions.at(-1)!.date = "2026-11-05"; // Editing payment date must not recreate its original occurrence.
  const after = cashForecast(d, "2026-11");
  assert.equal(after.balance, 700);
  assert.equal(after.pendingExpenses, 0);
  assert.equal(after.projectedBalance, before.projectedBalance);
  assert.equal(
    subscriptionOccurrences(d, "2026-11-01", "2026-11-30")[0].confirmed,
    true,
  );
  assert.equal(
    dataSchema.safeParse({
      ...d,
      transactions: [
        ...d.transactions,
        { ...d.transactions.at(-1)!, id: crypto.randomUUID() },
      ],
    }).success,
    false,
  );
});
test("cash forecasts exclude unreceived gross shift estimates and preserve old recurring semantics", () => {
  const d = fixture(),
    work = crypto.randomUUID();
  d.workplaces = [
    {
      id: work,
      name: "Cafe",
      wage: 100,
      regularHours: 8,
      overtimeHours: 2,
      overtimeRate: 1.25,
      extraRate: 1.5,
      premiumRate: 1.5,
    },
  ];
  d.shifts = [
    {
      id: crypto.randomUUID(),
      workplaceId: work,
      start: "2026-11-20T08:00:00Z",
      end: "2026-11-20T16:00:00Z",
      breakMinutes: 0,
      paidBreak: false,
      premium: false,
      scheduled: true,
    },
  ];
  d.transactions = [
    {
      id: crypto.randomUUID(),
      title: "Expected rent",
      kind: "expense",
      amount: 100,
      category: "Housing",
      date: "2026-10-01",
      recurring: true,
    },
  ];
  assert.equal(cashForecast(d, "2026-11").projectedBalance, -100);
  assert.equal(cashForecast(d, "2026-11").income, 0);
});
test("smart recommendations explain actual priorities and completion percentages", () => {
  const d = fixture();
  d.life.tasks = [
    task({ title: "Low", priority: "low" }),
    task({ title: "High", priority: "high" }),
    task({ title: "Overdue", due: "2026-10-31", repeat: "none" }),
  ];
  let day = smartDay(d, "2026-11-01");
  assert.equal(day.priorities[0].task.title, "Overdue");
  assert.equal(day.priorities[1].task.title, "High");
  assert.equal(day.completion, 0);
  d.life.tasks[0] = toggleTask(
    d.life.tasks[0],
    "2026-11-01",
    "2026-11-01T12:00:00Z",
  );
  day = smartDay(d, "2026-11-01");
  assert.equal(day.completion, 50);
  assert.equal(smartDay(emptyData(), "2026-11-01").completion, null);
});
test("personal milestones and habit progress keep completion history without touching savings", () => {
  const d = fixture(),
    g = goal({
      milestones: [
        { id: crypto.randomUUID(), title: "First", doneAt: null },
        { id: crypto.randomUUID(), title: "Second", doneAt: null },
      ],
    });
  assert.equal(personalProgress(g), 0);
  g.milestones[0].doneAt = "2026-11-01T12:00:00Z";
  assert.equal(personalProgress(g), 50);
  g.milestones[1].doneAt = "2026-11-02T12:00:00Z";
  const done = recordGoalCompletion(g, "2026-11-02T12:00:00Z");
  assert.equal(done.completedAt, "2026-11-02T12:00:00Z");
  assert.equal(done.completionHistory.length, 1);
  assert.equal(
    recordGoalCompletion(done, "2026-11-03T12:00:00Z").completionHistory.length,
    1,
  );
  const undone = recordGoalCompletion({
    ...done,
    milestones: done.milestones.map((m) => ({ ...m, doneAt: null })),
  });
  assert.equal(undone.completedAt, null);
  assert.equal(undone.completionHistory.length, 1);
  assert.deepEqual(d.goals, []);
});
test("work targets and overtime breakdown reuse the central payroll ledger and completed averages", () => {
  const d = fixture(),
    id = crypto.randomUUID();
  d.workplaces = [
    {
      id,
      name: "Cafe",
      wage: 50,
      regularHours: 8,
      overtimeHours: 2,
      overtimeRate: 1.25,
      extraRate: 1.5,
      premiumRate: 1.5,
    },
  ];
  d.shifts = [
    {
      id: crypto.randomUUID(),
      workplaceId: id,
      start: "2026-11-01T08:00:00Z",
      end: "2026-11-01T18:00:00Z",
      breakMinutes: 0,
      paidBreak: false,
      premium: false,
    },
  ];
  d.life.workTargets["2026-11"] = { hours: 30, gross: 1500 };
  const now = new Date("2026-11-06T12:00:00Z"),
    r = workStats(d, "2026-11", now),
    pay = monthlyPayroll(d, "2026-11", now).byShift[d.shifts[0].id];
  assert.equal(r.pay.gross, 525);
  assert.equal(r.requiredShifts, 2);
  assert.equal(pay.overtimeHours, 2);
  assert.equal(pay.overtimePay, 25);
  assert.equal(
    sumMoney([pay.basePay, pay.overtimePay, pay.premiumPay]),
    pay.wages,
  );
  assert.equal(workStats(fixture(), "2026-11", now).average, null);
});
test("monthly recap uses recorded completion dates and savings movements, not invented historical balances", () => {
  const d = fixture();
  d.life.tasks = [
    task({
      completions: {
        "2026-11-01": "2026-11-01T12:00:00Z",
        "2026-10-31": "2026-10-31T12:00:00Z",
      },
    }),
  ];
  d.life.personalGoals = [
    goal({ completionHistory: ["2026-11-02T12:00:00Z"] }),
  ];
  d.goals = [
    {
      id: crypto.randomUUID(),
      name: "Saved",
      target: 1000,
      existing: 100,
      monthly: 10,
      date: null,
      contributions: [
        { id: crypto.randomUUID(), amount: 50, date: "2026-11-01" },
        {
          id: crypto.randomUUID(),
          amount: 20,
          date: "2026-11-02",
          kind: "withdrawal",
        },
      ],
    },
  ];
  const r = monthRecap(d, "2026-11", new Date("2026-11-06"));
  assert.equal(r.completedTasks, 1);
  assert.equal(r.completedGoals, 1);
  assert.equal(r.savingsMovement, 30);
  assert.equal(goalSaved(d.goals[0]), 130);
  assert.match(recapText(d, "2026-11"), /SAVIO 4.0/);
});
test("all life types and opaque fields roundtrip in V5 backups and merge without duplicate IDs", () => {
  const d = fixture();
  d.life.tasks = [task({ opaque: { safe: true } })];
  d.life.personalGoals = [goal()];
  d.life.events = [
    {
      id: crypto.randomUUID(),
      title: "Appointment",
      date: "2026-11-07",
      time: "12:00",
      endTime: "13:00",
      category: "Personal",
      notes: "Private",
      repeat: "weekly",
      until: null,
      opaque: true,
    },
  ];
  d.life.subscriptions = [
    {
      id: crypto.randomUUID(),
      name: "Rent",
      amount: 500,
      kind: "expense",
      category: "Home",
      start: "2026-11-01",
      repeat: "monthly",
      until: null,
      active: true,
      opaque: true,
    },
  ];
  const workplaceId = crypto.randomUUID();
  d.workplaces = [
    {
      id: workplaceId,
      name: "Job",
      wage: 50,
      regularHours: 8,
      overtimeHours: 2,
      overtimeRate: 1.25,
      extraRate: 1.5,
      premiumRate: 1.5,
    },
  ];
  d.life.payslips = [
    {
      id: crypto.randomUUID(),
      workplaceId,
      month: "2026-11",
      gross: 1000,
      net: 900,
      verified: true,
      notes: "Manual comparison",
      opaque: true,
    },
  ];
  d.life.workTargets = { "2026-11": { hours: 80, gross: 4000 } };
  d.life.preferences.opaque = { keep: true };
  d.life.opaque = { keep: "yes" };
  d.futureRoot = { preserved: true };
  const json = JSON.stringify(backupDocument(d)),
    restored = parseBackup(json).data;
  assert.equal(JSON.parse(json).schemaVersion, 5);
  assert.deepEqual(restored, d);
  assert.equal(mergeBackups(d, restored).life?.tasks.length, 1);
  assert.throws(
    () =>
      mergeBackups(d, {
        ...d,
        life: { ...d.life, tasks: [{ ...d.life.tasks[0], title: "Conflict" }] },
      }),
    /Conflicting/,
  );
  for (const version of [3, 4])
    assert.deepEqual(
      parseBackup(
        JSON.stringify({
          application: "SAVIO",
          schemaVersion: version,
          data: emptyData(),
        }),
      ).data,
      emptyData(),
    );
});
test("invalid links, repeats, preferences and duplicate payslips fail validation", () => {
  const d = fixture();
  d.life.tasks = [task({ goalId: crypto.randomUUID() })];
  assert.equal(dataSchema.safeParse(d).success, false);
  d.life.tasks = [];
  d.life.preferences.widgets = ["smart", "smart"];
  assert.equal(dataSchema.safeParse(d).success, false);
  d.life.preferences = emptyLife().preferences;
  d.life.events = [
    {
      id: crypto.randomUUID(),
      title: "Invalid",
      date: "2026-11-01",
      time: "18:00",
      endTime: "17:00",
      category: "Personal",
      notes: "",
      repeat: "none",
      until: null,
    },
  ];
  assert.equal(dataSchema.safeParse(d).success, false);
});

test("editing confirmation dates does not recreate settled recurring months or subscription occurrences", () => {
  const base = {
    id: crypto.randomUUID(),
    title: "Salary",
    amount: 1000,
    kind: "income" as const,
    category: "Salary",
    date: "2026-10-01",
    recurring: true,
  };
  const paid = {
    ...base,
    id: crypto.randomUUID(),
    recurring: false,
    recurrenceId: base.id,
    recurrenceMonth: "2026-11",
    date: "2026-12-01",
  };
  assert.equal(monthTransactions([base, paid], "2026-11").length, 0);
  assert.equal(
    monthTransactions([base, paid], "2026-12").filter((t) => !t.projected)
      .length,
    1,
  );
  const d = fixture();
  const id = crypto.randomUUID();
  d.life.subscriptions = [
    {
      id,
      name: "Service",
      amount: 100,
      kind: "expense",
      category: "Bills",
      start: "2026-11-01",
      repeat: "monthly",
      until: null,
      active: true,
    },
  ];
  d.transactions = [
    {
      ...paid,
      subscriptionId: id,
      subscriptionOccurrence: "2026-11-01",
      recurrenceId: undefined,
      recurrenceMonth: undefined,
      kind: "expense",
    },
  ];
  assert.equal(
    subscriptionOccurrences(d, "2026-11-01", "2026-11-30")[0].confirmed,
    true,
  );
  assert.equal(cashForecast(d, "2026-11").pendingExpenses, 0);
});
