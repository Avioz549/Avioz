import { z } from "zod";
const date = z.iso.date(),
  stamp = z.iso.datetime({ offset: true });
export const recurrence = z.enum([
  "none",
  "daily",
  "weekly",
  "monthly",
  "yearly",
]);
export const taskSchema = z
  .looseObject({
    id: z.uuid(),
    title: z.string().trim().min(1).max(120),
    due: date,
    time: z
      .string()
      .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
      .nullable(),
    priority: z.enum(["high", "normal", "low"]),
    category: z.string().trim().min(1).max(60),
    notes: z.string().max(2000),
    repeat: recurrence,
    until: date.nullable(),
    completions: z.record(z.string(), stamp),
    goalId: z.uuid().nullable(),
    savingsGoalId: z.uuid().nullable().optional(),
  })
  .refine(
    (t) => !t.until || t.until >= t.due,
    "Repeat end must follow the first date",
  );
export const eventSchema = z
  .looseObject({
    id: z.uuid(),
    title: z.string().trim().min(1).max(120),
    date,
    time: z
      .string()
      .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
      .nullable(),
    endTime: z
      .string()
      .regex(/^([01]\d|2[0-3]):[0-5]\d$/)
      .nullable(),
    category: z.string().trim().min(1).max(60),
    notes: z.string().max(2000),
    repeat: recurrence,
    until: date.nullable(),
  })
  .refine(
    (e) => !e.until || e.until >= e.date,
    "Repeat end must follow the first date",
  )
  .refine(
    (e) => !e.endTime || Boolean(e.time && e.endTime > e.time),
    "Event end must follow its start on the same day",
  );
export const personalGoalSchema = z
  .looseObject({
    id: z.uuid(),
    name: z.string().trim().min(1).max(100),
    kind: z.enum(["personal", "habit", "custom"]),
    category: z.string().trim().min(1).max(60),
    target: z.number().positive().max(1e9),
    unit: z.string().trim().min(1).max(30),
    deadline: date.nullable(),
    milestones: z
      .array(
        z.looseObject({
          id: z.uuid(),
          title: z.string().trim().min(1).max(120),
          doneAt: stamp.nullable(),
        }),
      )
      .max(100),
    history: z
      .array(
        z.looseObject({
          id: z.uuid(),
          date,
          amount: z.number().positive().max(1e9),
          note: z.string().max(200),
        }),
      )
      .max(10000),
    completedAt: stamp.nullable(),
    completionHistory: z.array(stamp).max(10000).optional(),
  })
  .refine(
    (g) =>
      new Set(g.milestones.map((m) => m.id)).size === g.milestones.length &&
      new Set(g.history.map((h) => h.id)).size === g.history.length,
    "Duplicate goal entry",
  );
export const subscriptionSchema = z
  .looseObject({
    id: z.uuid(),
    name: z.string().trim().min(1).max(120),
    amount: z.number().positive().max(1e9),
    kind: z.enum(["income", "expense"]),
    category: z.string().trim().min(1).max(60),
    start: date,
    repeat: z.enum(["weekly", "monthly", "yearly"]),
    until: date.nullable(),
    active: z.boolean(),
  })
  .refine((s) => !s.until || s.until >= s.start, "End must follow start");
export const payslipSchema = z.looseObject({
  id: z.uuid(),
  workplaceId: z.uuid(),
  month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
  gross: z.number().min(0).max(1e9),
  net: z.number().min(0).max(1e9).nullable(),
  verified: z.boolean(),
  notes: z.string().max(2000),
});
export const widgetIds = [
  "smart",
  "finance",
  "work",
  "savings",
  "goals",
  "payments",
  "insights",
  "recent",
] as const;
export const actionIds = [
  "transaction",
  "shift",
  "task",
  "event",
  "goal",
] as const;
export const preferencesSchema = z.looseObject({
  widgets: z.array(z.enum(widgetIds)).max(8),
  hidden: z.array(z.enum(widgetIds)).max(8),
  actions: z.array(z.enum(actionIds)).max(5),
  home: z.enum([
    "overview",
    "smart",
    "planner",
    "shifts",
    "transactions",
    "goals",
  ]),
  shiftReminders: z.boolean(),
  plannerReminders: z.boolean().optional(),
});
export const lifeSchema = z
  .looseObject({
    version: z.literal(1),
    tasks: z.array(taskSchema).max(10000),
    events: z.array(eventSchema).max(10000),
    personalGoals: z.array(personalGoalSchema).max(1000),
    subscriptions: z.array(subscriptionSchema).max(1000),
    payslips: z.array(payslipSchema).max(1000),
    workTargets: z.record(
      z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
      z.looseObject({
        hours: z.number().min(0).max(744),
        gross: z.number().min(0).max(1e9),
      }),
    ),
    preferences: preferencesSchema,
  })
  .refine(
    (d) =>
      [d.tasks, d.events, d.personalGoals, d.subscriptions, d.payslips].every(
        (rows) => new Set(rows.map((r) => r.id)).size === rows.length,
      ),
    "Duplicate life record ID",
  )
  .refine(
    (d) =>
      d.tasks.every(
        (t) => !t.goalId || d.personalGoals.some((g) => g.id === t.goalId),
      ),
    "Task goal does not exist",
  )
  .refine(
    (d) =>
      new Set(d.preferences.widgets).size === d.preferences.widgets.length &&
      new Set(d.preferences.hidden).size === d.preferences.hidden.length &&
      new Set(d.preferences.actions).size === d.preferences.actions.length,
    "Duplicate preference",
  )
  .refine(
    (d) =>
      new Set(d.payslips.map((p) => `${p.workplaceId}:${p.month}`)).size ===
      d.payslips.length,
    "Only one payslip per workplace and month",
  );
export type LifeData = z.infer<typeof lifeSchema>;
export type Task = z.infer<typeof taskSchema>;
export type PersonalEvent = z.infer<typeof eventSchema>;
export type PersonalGoal = z.infer<typeof personalGoalSchema>;
export type Subscription = z.infer<typeof subscriptionSchema>;
export type Payslip = z.infer<typeof payslipSchema>;
export function emptyLife(): LifeData {
  return {
    version: 1,
    tasks: [],
    events: [],
    personalGoals: [],
    subscriptions: [],
    payslips: [],
    workTargets: {},
    preferences: {
      widgets: [
        "finance",
        "smart",
        "work",
        "savings",
        "goals",
        "payments",
        "insights",
        "recent",
      ],
      hidden: [],
      actions: ["transaction", "shift", "task"],
      home: "overview",
      shiftReminders: false,
    },
  };
}
