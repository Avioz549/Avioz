import { lifeSchema } from "./life-model";
import { z } from "zod";
import { calculateShift } from "./payroll";
export const transactionSchema = z.looseObject({
  id: z.uuid(),
  title: z.string().trim().min(1).max(120),
  amount: z.number().positive().max(1e9),
  kind: z.enum(["income", "expense"]),
  category: z.string().min(1).max(60),
  date: z.iso.date(),
  recurring: z.boolean(),
  linkedShiftId: z.uuid().optional(),
  recurrenceId: z.uuid().optional(),
  subscriptionId: z.uuid().optional(),
  subscriptionOccurrence: z.iso.date().optional(),
  recurrenceMonth: z
    .string()
    .regex(/^\d{4}-(0[1-9]|1[0-2])$/)
    .optional(),
});
export type Transaction = z.infer<typeof transactionSchema> & {
  projected?: boolean;
};
export const workplaceSchema = z.looseObject({
  id: z.uuid(),
  name: z.string().trim().min(1).max(100),
  wage: z.number().min(0).max(100000),
  regularHours: z.number().min(0).max(24),
  overtimeHours: z.number().min(0).max(24),
  overtimeRate: z.number().min(1).max(5),
  extraRate: z.number().min(1).max(5),
  premiumRate: z.number().min(1).max(5),
  policy: z
    .looseObject({
      weeklyHours: z.number().min(1).max(168),
      weeklyRate: z.number().min(1).max(5),
      weekStart: z.number().int().min(0).max(6),
      saturday: z.boolean(),
      holidayRate: z.number().min(1).max(5),
      nightRate: z.number().min(1).max(5),
      nightStart: z.number().int().min(0).max(23),
      nightEnd: z.number().int().min(0).max(23),
      combination: z.enum(["multiply", "maximum", "add"]),
      dailyAcrossShifts: z.boolean(),
    })
    .optional(),
});
export type Workplace = z.infer<typeof workplaceSchema>;
export const shiftSchema = z
  .looseObject({
    id: z.uuid(),
    workplaceId: z.uuid(),
    start: z.iso.datetime({ offset: true }),
    end: z.iso.datetime({ offset: true }).nullable(),
    breakMinutes: z.number().min(0).max(1440),
    paidBreak: z.boolean(),
    premium: z.boolean(),
    legacyGross: z.number().min(0).max(1e9).optional(),
    tips: z.number().min(0).max(1e9).optional(),
    travel: z.number().min(0).max(1e9).optional(),
    notes: z.string().max(2000).optional(),
    holiday: z.boolean().optional(),
    scheduled: z.boolean().optional(),
    pauseStartedAt: z.iso.datetime({ offset: true }).optional(),
  })
  .refine(
    (s) => !s.end || new Date(s.end).getTime() > new Date(s.start).getTime(),
    "Shift end must be after start",
  )
  .refine(
    (s) =>
      !s.end ||
      s.breakMinutes <= (Date.parse(s.end) - Date.parse(s.start)) / 60000,
    "Break cannot exceed shift duration",
  )
  .refine(
    (s) => !s.scheduled || Boolean(s.end),
    "Scheduled shifts require an end time",
  )
  .refine(
    (s) =>
      !s.pauseStartedAt ||
      (!s.end && Date.parse(s.pauseStartedAt) >= Date.parse(s.start)),
    "Invalid pause timestamp",
  );
export type Shift = z.infer<typeof shiftSchema>;
export const goalSchema = z.looseObject({
  id: z.uuid(),
  name: z.string().trim().min(1).max(100),
  target: z.number().positive().max(1e9),
  existing: z.number().min(0).max(1e9),
  monthly: z.number().min(0).max(1e9),
  date: z.iso.date().nullable(),
  savingShare: z.number().min(0).max(100).optional(),
  completionHistory: z
    .array(z.iso.datetime({ offset: true }))
    .max(10000)
    .optional(),
  contributions: z
    .array(
      z.looseObject({
        id: z.uuid(),
        amount: z.number().positive().max(1e9),
        date: z.iso.date(),
        kind: z.enum(["deposit", "withdrawal"]).optional(),
      }),
    )
    .max(10000),
});
export type Goal = z.infer<typeof goalSchema>;
export const dataSchema = z
  .looseObject({
    life: lifeSchema.optional(),
    transactions: z.array(transactionSchema).max(10000),
    workplaces: z.array(workplaceSchema).max(100),
    shifts: z.array(shiftSchema).max(10000),
    goals: z.array(goalSchema).max(100),
    budgets: z.record(z.string(), z.number().min(0).max(1e9)),
    customCategories: z
      .array(z.string().trim().min(1).max(60))
      .max(100)
      .optional(),
    reminders: z
      .array(
        z.looseObject({
          id: z.uuid(),
          title: z.string().trim().min(1).max(120),
          date: z.iso.date(),
          done: z.boolean(),
        }),
      )
      .max(1000)
      .default([]),
    profile: z.looseObject({
      name: z.string().max(100),
      currency: z.enum(["ILS", "USD", "EUR", "GBP"]),
      language: z.enum(["en", "he"]),
      theme: z.enum(["dark", "light", "midnight", "purple", "system"]),
    }),
  })
  .refine(
    (d) =>
      !d.life ||
      d.life.tasks.every(
        (t) =>
          !t.savingsGoalId || d.goals.some((g) => g.id === t.savingsGoalId),
      ),
    "Task savings goal does not exist",
  )
  .refine(
    (d) =>
      !d.life ||
      d.life.payslips.every((p) =>
        d.workplaces.some((w) => w.id === p.workplaceId),
      ),
    "Payslip workplace does not exist",
  )
  .refine(
    (d) =>
      new Set(
        d.transactions
          .filter((t) => t.subscriptionId)
          .map(
            (t) => `${t.subscriptionId}:${t.subscriptionOccurrence ?? t.date}`,
          ),
      ).size === d.transactions.filter((t) => t.subscriptionId).length,
    "Subscription occurrence already confirmed",
  )
  .refine(
    (d) =>
      d.shifts.every((s) => d.workplaces.some((w) => w.id === s.workplaceId)),
    "Shift must reference an existing workplace",
  )
  .refine(
    (d) => d.shifts.filter((s) => !s.end && !s.scheduled).length <= 1,
    "Only one running shift allowed",
  )
  .refine(
    (d) =>
      [
        d.transactions,
        d.workplaces,
        d.shifts,
        d.goals,
        d.reminders,
        ...d.goals.map((g) => g.contributions),
      ].every((rows) => new Set(rows.map((r) => r.id)).size === rows.length),
    "Record IDs must be unique",
  )
  .refine(
    (d) =>
      d.transactions.every(
        (t) =>
          !t.linkedShiftId ||
          (t.kind === "income" &&
            !t.recurring &&
            d.shifts.some(
              (s) => s.id === t.linkedShiftId && s.end && !s.scheduled,
            )),
      ),
    "Linked earnings require a completed shift and nonrecurring income",
  )
  .refine((d) => {
    const occurrences = d.transactions
      .filter((t) => t.recurrenceId)
      .map(
        (t) => `${t.recurrenceId}:${t.recurrenceMonth ?? t.date.slice(0, 7)}`,
      );
    return new Set(occurrences).size === occurrences.length;
  }, "A recurring occurrence can only be confirmed once per month")
  .refine(
    (d) =>
      d.goals.every((g) => {
        let balance = Math.round(g.existing * 100);
        return [...g.contributions]
          .sort((a, b) => a.date.localeCompare(b.date))
          .every((c) => {
            balance +=
              Math.round(c.amount * 100) * (c.kind === "withdrawal" ? -1 : 1);
            return balance >= 0;
          });
      }),
    "Savings withdrawals cannot exceed available recorded savings",
  );
export type FinanceData = z.infer<typeof dataSchema>;
export function emptyData(): FinanceData {
  return {
    transactions: [],
    workplaces: [],
    shifts: [],
    goals: [],
    budgets: {},
    reminders: [],
    profile: { name: "", currency: "ILS", language: "he", theme: "dark" },
  };
}
export function shiftPay(shift: Shift, workplace: Workplace, now = new Date()) {
  const { hours, gross } = calculateShift(shift, workplace, now);
  return { hours, gross };
}
// Recurrences are projected virtually by month; no duplicate database inserts.
export function monthTransactions(
  transactions: Transaction[],
  month: string,
): Transaction[] {
  const confirmed = new Set(
    transactions
      .filter((t) => t.recurrenceId)
      .map(
        (t) => `${t.recurrenceId}:${t.recurrenceMonth ?? t.date.slice(0, 7)}`,
      ),
  );
  return transactions.flatMap((t) => {
    if (t.date.slice(0, 7) === month) return [t];
    if (!t.recurring || t.date.slice(0, 7) > month) return [];
    const [y, m] = month.split("-").map(Number);
    const day = Math.min(Number(t.date.slice(8)), new Date(y, m, 0).getDate());
    if (confirmed.has(`${t.id}:${month}`)) return [];
    return [
      {
        ...t,
        projected: true,
        date: `${month}-${String(day).padStart(2, "0")}`,
      },
    ];
  });
}
export function recordedMonthTransactions(
  transactions: Transaction[],
  month: string,
) {
  return transactions.filter((t) => t.date.startsWith(month) && !t.projected);
}
export function totals(transactions: Transaction[]) {
  const income =
    transactions
      .filter((t) => t.kind === "income" && !t.projected)
      .reduce((s, t) => s + Math.round(t.amount * 100), 0) / 100;
  const expenses =
    transactions
      .filter((t) => t.kind === "expense" && !t.projected)
      .reduce((s, t) => s + Math.round(t.amount * 100), 0) / 100;
  return {
    income,
    expenses,
    balance: Math.round((income - expenses) * 100) / 100,
  };
}
export function goalSaved(g: Goal) {
  return (
    (Math.round(g.existing * 100) +
      g.contributions.reduce(
        (s, c) =>
          s + Math.round(c.amount * 100) * (c.kind === "withdrawal" ? -1 : 1),
        0,
      )) /
    100
  );
}
export function savingsPlan(
  goal: Goal,
  surplus: number,
  mode: "conservative" | "balanced" | "accelerated",
  now = new Date(),
) {
  const factors = { conservative: 0.2, balanced: 0.35, accelerated: 0.5 };
  const monthly = Math.max(
    0,
    Math.min(goal.monthly, Math.max(0, surplus) * factors[mode]),
  );
  const remaining = Math.max(0, goal.target - goalSaved(goal));
  const months =
    remaining === 0 ? 0 : monthly > 0 ? Math.ceil(remaining / monthly) : null;
  const completion =
    months === null
      ? null
      : new Date(
          Date.UTC(
            now.getFullYear(),
            now.getMonth() + months,
            Math.min(
              now.getDate(),
              new Date(
                now.getFullYear(),
                now.getMonth() + months + 1,
                0,
              ).getDate(),
            ),
          ),
        )
          .toISOString()
          .slice(0, 10);
  const deadline = goal.date ? new Date(goal.date + "T12:00:00") : null;
  const monthsUntilTarget = Math.max(
    1,
    (deadline ? deadline.getFullYear() - now.getFullYear() : 0) * 12 +
      (deadline?.getMonth() ?? now.getMonth()) -
      now.getMonth() +
      ((deadline?.getDate() ?? 0) > now.getDate() ? 1 : 0),
  );
  const requiredMonthly = deadline
    ? Math.ceil((remaining / monthsUntilTarget) * 100) / 100
    : null;
  return {
    monthly,
    months,
    completion,
    requiredMonthly,
    onTrack:
      remaining === 0 ||
      Boolean(completion && goal.date && completion <= goal.date),
  };
}
export function csvExport(transactions: Transaction[]) {
  const cell = (v: string | number) =>
    `"${String(v)
      .replace(/^[=+@\-\t\r]/, "'" + "$&")
      .replaceAll('"', '""')}"`;
  return (
    "\uFEFF" +
    [
      ["Date", "Description", "Category", "Type", "Amount", "Status"],
      ...transactions.map((t) => [
        t.date,
        t.title,
        t.category,
        t.kind,
        t.amount,
        t.projected ? "Expected" : "Recorded",
      ]),
    ]
      .map((row) => row.map(cell).join(","))
      .join("\r\n")
  );
}
