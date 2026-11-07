import {
  emptyLife,
  type LifeData,
  type Task,
  type Subscription,
} from "./life-model";
import {
  goalSaved,
  monthTransactions,
  recordedMonthTransactions,
  totals,
  type FinanceData,
} from "./finance";
import { dateKey, monthlyPayroll } from "./payroll";
import { sumMoney } from "./money";
import { previousMonth, localInsights } from "./insights";
const EMPTY = emptyLife();
export const lifeOf = (data: FinanceData): LifeData => data.life ?? EMPTY;
export function shiftDate(date: string, days: number) {
  const d = new Date(date + "T12:00:00");
  d.setDate(d.getDate() + days);
  return dateKey(d);
}
export function monthBounds(month: string) {
  const [y, m] = month.split("-").map(Number);
  return {
    from: month + "-01",
    to: `${month}-${String(new Date(y, m, 0).getDate()).padStart(2, "0")}`,
  };
}
export function dateRange(from: string, to: string) {
  const dates: string[] = [];
  for (let d = from; d <= to; d = shiftDate(d, 1)) {
    if (dates.length >= 370)
      throw new Error("Choose a range of at most one year");
    dates.push(d);
  }
  return dates;
}
export function occursOn(
  anchor: string,
  rule: string,
  date: string,
  until: string | null = null,
) {
  if (date < anchor || (until && date > until)) return false;
  if (rule === "none") return date === anchor;
  if (rule === "daily") return true;
  const a = new Date(anchor + "T12:00:00"),
    d = new Date(date + "T12:00:00");
  if (rule === "weekly") return a.getDay() === d.getDay();
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  if (rule === "monthly") return d.getDate() === Math.min(a.getDate(), last);
  return (
    d.getMonth() === a.getMonth() && d.getDate() === Math.min(a.getDate(), last)
  );
}
export function taskOccurrences(data: FinanceData, from: string, to: string) {
  const life = lifeOf(data),
    dates = dateRange(from, to);
  return dates.flatMap((date) =>
    life.tasks
      .filter((t) => occursOn(t.due, t.repeat, date, t.until))
      .map((task) => ({
        task,
        date,
        key: `${task.id}:${date}`,
        done: Boolean(task.completions[date]),
        completedAt: task.completions[date] ?? null,
      })),
  );
}
export function subscriptionOccurrences(
  data: FinanceData,
  from: string,
  to: string,
) {
  const confirmed = new Set(
    data.transactions
      .filter((t) => t.subscriptionId)
      .map((t) => `${t.subscriptionId}:${t.subscriptionOccurrence ?? t.date}`),
  );
  return dateRange(from, to).flatMap((date) =>
    lifeOf(data)
      .subscriptions.filter(
        (s) => s.active && occursOn(s.start, s.repeat, date, s.until),
      )
      .map((subscription) => ({
        subscription,
        date,
        key: `${subscription.id}:${date}`,
        confirmed: confirmed.has(`${subscription.id}:${date}`),
      })),
  );
}
export function nextRenewal(subscription: Subscription, today: string) {
  const end = shiftDate(today, 369);
  return (
    dateRange(today, end).find((d) =>
      occursOn(subscription.start, subscription.repeat, d, subscription.until),
    ) ?? null
  );
}
export function personalProgress(goal: LifeData["personalGoals"][number]) {
  return goal.milestones.length
    ? (goal.milestones.filter((m) => m.doneAt).length /
        goal.milestones.length) *
        100
    : Math.min(
        100,
        (goal.history.reduce((n, h) => n + h.amount, 0) / goal.target) * 100,
      );
}
export function cashForecast(data: FinanceData, month: string) {
  const { from, to } = monthBounds(month),
    confirmed = recordedMonthTransactions(data.transactions, month),
    current = totals(confirmed);
  const recurring = monthTransactions(data.transactions, month).filter(
    (t) => t.projected,
  );
  const subscriptions = subscriptionOccurrences(data, from, to).filter(
    (s) => !s.confirmed,
  );
  const pendingIncome = sumMoney([
    ...recurring.filter((t) => t.kind === "income").map((t) => t.amount),
    ...subscriptions
      .filter((s) => s.subscription.kind === "income")
      .map((s) => s.subscription.amount),
  ]);
  const pendingExpenses = sumMoney([
    ...recurring.filter((t) => t.kind === "expense").map((t) => t.amount),
    ...subscriptions
      .filter((s) => s.subscription.kind === "expense")
      .map((s) => s.subscription.amount),
  ]);
  return {
    ...current,
    pendingIncome,
    pendingExpenses,
    projectedBalance: sumMoney([
      current.balance,
      pendingIncome,
      -pendingExpenses,
    ]),
    recurring,
    subscriptions,
  };
}
export function plannerEntries(data: FinanceData, from: string, to: string) {
  const life = lifeOf(data),
    dates = dateRange(from, to);
  const tasks = taskOccurrences(data, from, to).map((o) => ({
    key: "task:" + o.key,
    type: "task" as const,
    id: o.task.id,
    date: o.date,
    title: o.task.title,
    time: o.task.time,
    done: o.done,
    priority: o.task.priority,
    notes: o.task.notes,
    category: o.task.category,
  }));
  const events = dates.flatMap((date) =>
    life.events
      .filter((e) => occursOn(e.date, e.repeat, date, e.until))
      .map((e) => ({
        key: `event:${e.id}:${date}`,
        type: "event" as const,
        id: e.id,
        date,
        title: e.title,
        time: e.time,
        done: false,
        priority: "normal",
        notes: e.notes,
        category: e.category,
      })),
  );
  const shifts = data.shifts.flatMap((s) => {
    const start = dateKey(new Date(s.start)),
      end = s.end
        ? dateKey(new Date(Date.parse(s.end) - 1))
        : dateKey(new Date());
    return dates
      .filter((d) => d >= start && d <= end)
      .map((date) => ({
        key: `shift:${s.id}:${date}`,
        type: "shift" as const,
        id: s.id,
        date,
        title: data.workplaces.find((w) => w.id === s.workplaceId)?.name ?? "",
        time:
          date === start
            ? new Date(s.start).toTimeString().slice(0, 5)
            : "00:00",
        done: !s.scheduled && Boolean(s.end),
        priority: "normal",
        notes: s.notes ?? "",
        category: s.scheduled ? "planned" : "work",
      }));
  });
  const reminders = data.reminders
    .filter((r) => r.date >= from && r.date <= to)
    .map((r) => ({
      key: "reminder:" + r.id,
      type: "reminder" as const,
      id: r.id,
      date: r.date,
      title: r.title,
      time: null,
      done: r.done,
      priority: "normal",
      notes: "",
      category: "finance",
    }));
  const dateSet = new Set(dates);
  const payments = [...new Set(dates.map((d) => d.slice(0, 7)))]
    .flatMap((month) => monthTransactions(data.transactions, month))
    .filter((t) => t.kind === "expense" && dateSet.has(t.date))
    .map((t) => ({
      key: `payment:${t.id}:${t.date}`,
      type: "payment" as const,
      id: t.id,
      date: t.date,
      title: t.title,
      time: null,
      done: !t.projected,
      priority: "normal",
      notes: "",
      category: t.category,
    }));
  const subscriptions = subscriptionOccurrences(data, from, to).map((o) => ({
    key: "subscription:" + o.key,
    type: "subscription" as const,
    id: o.subscription.id,
    date: o.date,
    title: o.subscription.name,
    time: null,
    done: o.confirmed,
    priority: "normal",
    notes: "",
    category: o.subscription.category,
  }));
  return [
    ...tasks,
    ...events,
    ...shifts,
    ...reminders,
    ...payments,
    ...subscriptions,
  ].sort(
    (a, b) =>
      a.date.localeCompare(b.date) ||
      (a.time ?? "23:59").localeCompare(b.time ?? "23:59") ||
      a.key.localeCompare(b.key),
  );
}
export function smartDay(data: FinanceData, today: string) {
  const todayEntries = plannerEntries(data, today, today),
    pending = taskOccurrences(
      data,
      shiftDate(today, -30),
      shiftDate(today, 7),
    ).filter((o) => !o.done);
  const priorities = pending
    .sort((a, b) => {
      const rank = { high: 0, normal: 1, low: 2 };
      return (
        Number(b.date < today) - Number(a.date < today) ||
        rank[a.task.priority] - rank[b.task.priority] ||
        a.date.localeCompare(b.date)
      );
    })
    .slice(0, 3);
  const tasks = todayEntries.filter((e) => e.type === "task"),
    done = tasks.filter((t) => t.done).length;
  return {
    entries: todayEntries,
    priorities,
    upcoming: pending
      .filter((o) => o.date > today)
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 3),
    completion: tasks.length ? Math.round((done / tasks.length) * 100) : null,
    done,
    total: tasks.length,
  };
}
export function monthRecap(data: FinanceData, month: string, now = new Date()) {
  const { from, to } = monthBounds(month),
    life = lifeOf(data),
    pay = monthlyPayroll(data, month, now),
    prior = previousMonth(month),
    previousPay = monthlyPayroll(data, prior, now),
    cash = totals(recordedMonthTransactions(data.transactions, month)),
    previousCash = totals(recordedMonthTransactions(data.transactions, prior));
  const taskDone = life.tasks.reduce(
    (n, t) =>
      n +
      Object.values(t.completions).filter((stamp) =>
        dateKey(new Date(stamp)).startsWith(month),
      ).length,
    0,
  );
  const completedInMonth = (g: LifeData["personalGoals"][number]) =>
    (g.completionHistory ?? (g.completedAt ? [g.completedAt] : [])).some(
      (stamp) => dateKey(new Date(stamp)).startsWith(month),
    );
  const financialDone = data.goals.filter((g) =>
    g.completionHistory?.some((stamp) =>
      dateKey(new Date(stamp)).startsWith(month),
    ),
  );
  const goalsDone =
    life.personalGoals.filter(completedInMonth).length + financialDone.length;
  const contributions = sumMoney(
    data.goals.flatMap((g) =>
      g.contributions
        .filter((c) => c.date >= from && c.date <= to)
        .map((c) => (c.kind === "withdrawal" ? -1 : 1) * c.amount),
    ),
  );
  const achieved = life.personalGoals
    .filter(completedInMonth)
    .map((g) => g.name)
    .concat(financialDone.map((g) => g.name));
  return {
    month,
    hours: pay.hours,
    gross: pay.gross,
    income: cash.income,
    expenses: cash.expenses,
    balance: cash.balance,
    savingsMovement: contributions,
    recordedSavings: sumMoney(data.goals.map(goalSaved)),
    completedTasks: taskDone,
    completedGoals: goalsDone,
    achievements: achieved,
    change: {
      hours: pay.hours - previousPay.hours,
      gross: sumMoney([pay.gross, -previousPay.gross]),
      income: sumMoney([cash.income, -previousCash.income]),
      expenses: sumMoney([cash.expenses, -previousCash.expenses]),
    },
    forecast: cashForecast(data, month),
  };
}
export function workStats(data: FinanceData, month: string, now = new Date()) {
  const pay = monthlyPayroll(data, month, now),
    completed = data.shifts.filter(
      (s) => s.end && !s.scheduled && Date.parse(s.end) <= now.getTime(),
    ),
    selected = completed.filter((s) =>
      pay.segments.some((p) => p.shiftId === s.id && p.date.startsWith(month)),
    ),
    target = lifeOf(data).workTargets[month] ?? { hours: 0, gross: 0 };
  const completedIds = new Set(selected.map((s) => s.id)),
    completedParts = pay.segments.filter(
      (s) =>
        !s.scheduled && s.date.startsWith(month) && completedIds.has(s.shiftId),
    );
  const average = selected.length
      ? sumMoney(completedParts.map((s) => s.gross)) / selected.length
      : null,
    averageHours = selected.length
      ? completedParts.reduce((n, s) => n + s.hours, 0) / selected.length
      : null;
  return {
    pay,
    target,
    average,
    requiredShifts:
      average && target.gross > pay.gross
        ? Math.ceil((target.gross - pay.gross) / average)
        : target.gross > pay.gross
          ? null
          : 0,
    requiredHourShifts:
      averageHours && target.hours > pay.hours
        ? Math.ceil((target.hours - pay.hours) / averageHours)
        : target.hours > pay.hours
          ? null
          : 0,
    shiftCount: selected.length,
    overtimePremium: sumMoney(
      selected.map((s) => {
        const r = pay.byShift[s.id];
        return s.legacyGross === undefined
          ? sumMoney([r.overtimePay, r.premiumPay])
          : 0;
      }),
    ),
  };
}
export function toggleTask(task: Task, date: string, stamp: string): Task {
  const completions = { ...task.completions };
  if (completions[date]) delete completions[date];
  else completions[date] = stamp;
  return { ...task, completions };
}
export function dailyExplanations(data: FinanceData, today: string) {
  const he = data.profile.language === "he",
    day = smartDay(data, today);
  return day.priorities.map((o) => ({
    key: o.key,
    text: he
      ? `${o.task.title} — ${o.date < today ? "מועד היעד עבר" : o.task.priority === "high" ? "עדיפות גבוהה שסימנת" : "מועד היעד הקרוב"}`
      : `${o.task.title} — ${o.date < today ? "overdue" : o.task.priority === "high" ? "your high priority" : "nearest due date"}`,
  }));
}
export function recapText(data: FinanceData, month: string, now = new Date()) {
  const r = monthRecap(data, month, now),
    he = data.profile.language === "he";
  return `SAVIO 4.0 · ${month}\n${he ? "שעות עבודה" : "Worked hours"}: ${r.hours.toFixed(2)}\n${he ? "ברוטו משוער" : "Estimated gross"}: ${r.gross.toFixed(2)} ${data.profile.currency}\n${he ? "הכנסות מתועדות" : "Recorded income"}: ${r.income.toFixed(2)}\n${he ? "הוצאות מתועדות" : "Recorded expenses"}: ${r.expenses.toFixed(2)}\n${he ? "תנועת חיסכון מתועדת" : "Recorded savings movement"}: ${r.savingsMovement.toFixed(2)}\n${he ? "משימות שהושלמו" : "Completed tasks"}: ${r.completedTasks}\n${he ? "יעדים שהושלמו" : "Completed goals"}: ${r.completedGoals}\n${r.achievements.join("\n")}`;
}
export function lifeInsights(
  data: FinanceData,
  month: string,
  now = new Date(),
) {
  const life = lifeOf(data),
    he = data.profile.language === "he";
  return [
    ...localInsights(data, month, now),
    ...(life.tasks.length
      ? [
          he
            ? `הושלמו ${monthRecap(data, month, now).completedTasks} משימות החודש.`
            : `${monthRecap(data, month, now).completedTasks} tasks completed this month.`,
        ]
      : []),
  ];
}

export function recordGoalCompletion(
  goal: LifeData["personalGoals"][number],
  stamp = new Date().toISOString(),
) {
  const complete = personalProgress(goal) >= 100;
  return {
    ...goal,
    completedAt: complete ? (goal.completedAt ?? stamp) : null,
    completionHistory:
      complete && !goal.completedAt
        ? [...(goal.completionHistory ?? []), stamp]
        : (goal.completionHistory ?? []),
  };
}
