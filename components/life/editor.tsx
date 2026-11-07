"use client";
import { useState } from "react";
import { Field, Modal } from "../ui";
import { lifeOf, recordGoalCompletion as withCompletion } from "@/lib/life";
import {
  taskSchema,
  eventSchema,
  personalGoalSchema,
  subscriptionSchema,
  payslipSchema,
} from "@/lib/life-model";
import type { LifeProps, LifeDraft } from "./types";
export function LifeEditor({
  data,
  onSave,
  busy,
  draft,
  onClose,
}: {
  data: LifeProps["data"];
  onSave: LifeProps["onSave"];
  busy: boolean;
  draft: LifeDraft;
  onClose: () => void;
}) {
  const he = data.profile.language === "he",
    tr = (en: string, h: string) => (he ? h : en),
    life = lifeOf(data),
    [error, setError] = useState("");
  const old = "value" in draft ? draft.value : undefined;
  const text = (key: string, fallback = "") => String(old?.[key] ?? fallback),
    num = (key: string, fallback = 0) => Number(old?.[key] ?? fallback);
  const today = new Date().toLocaleDateString("en-CA"),
    defaultDate = "date" in draft ? (draft.date ?? today) : today;
  const title = {
    task: tr("Task", "משימה"),
    event: tr("Personal event", "אירוע אישי"),
    "personal-goal": tr("Personal goal", "יעד אישי"),
    subscription: tr("Recurring payment / income", "תשלום / הכנסה חוזרת"),
    payslip: tr("Recorded payslip", "תלוש שהוזן"),
    targets: tr("Monthly work targets", "יעדי עבודה חודשיים"),
    "goal-progress": tr("Record progress", "רישום התקדמות"),
    milestone: tr("Milestone", "אבן דרך"),
  }[draft.kind];
  const input = (
    name: string,
    label: string,
    props: React.InputHTMLAttributes<HTMLInputElement> = {},
  ) => (
    <Field label={label}>
      <input name={name} defaultValue={text(name)} {...props} />
    </Field>
  );
  const number = (name: string, label: string, value = 0, max = 1e9) =>
    input(name, label, {
      type: "number",
      min: "0",
      max: String(max),
      step: ".01",
      defaultValue: num(name, value),
      required: true,
    });
  const repeats = (subscription = false) => (
    <Field label={tr("Repeat", "חזרה")}>
      <select
        name="repeat"
        defaultValue={text("repeat", subscription ? "monthly" : "none")}
      >
        {(subscription
          ? ["weekly", "monthly", "yearly"]
          : ["none", "daily", "weekly", "monthly", "yearly"]
        ).map((r) => (
          <option key={r} value={r}>
            {he
              ? (
                  {
                    none: "ללא חזרה",
                    daily: "יומית",
                    weekly: "שבועית",
                    monthly: "חודשית",
                    yearly: "שנתית",
                  } as Record<string, string>
                )[r]
              : r}
          </option>
        ))}
      </select>
    </Field>
  );
  return (
    <Modal title={title} onClose={onClose}>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (busy) return;
          setError("");
          const form = new FormData(e.currentTarget),
            v = (k: string) => String(form.get(k) ?? ""),
            n = (k: string) => Number(form.get(k)),
            id = () => crypto.randomUUID();
          try {
            const next = { ...life };
            if (draft.kind === "task") {
              const ref = v("goalRef"),
                value = taskSchema.parse({
                  ...draft.value,
                  id: draft.value?.id ?? id(),
                  title: v("title"),
                  due: v("due"),
                  time: v("time") || null,
                  priority: v("priority"),
                  category: v("category"),
                  notes: v("notes"),
                  repeat: v("repeat"),
                  until: v("until") || null,
                  goalId: ref.startsWith("personal:") ? ref.slice(9) : null,
                  savingsGoalId: ref.startsWith("savings:")
                    ? ref.slice(8)
                    : undefined,
                  completions: draft.value?.completions ?? {},
                });
              next.tasks = draft.value
                ? life.tasks.map((t) => (t.id === value.id ? value : t))
                : [...life.tasks, value];
            }
            if (draft.kind === "event") {
              const value = eventSchema.parse({
                ...draft.value,
                id: draft.value?.id ?? id(),
                title: v("title"),
                date: v("date"),
                time: v("time") || null,
                endTime: v("endTime") || null,
                category: v("category"),
                notes: v("notes"),
                repeat: v("repeat"),
                until: v("until") || null,
              });
              next.events = draft.value
                ? life.events.map((t) => (t.id === value.id ? value : t))
                : [...life.events, value];
            }
            if (draft.kind === "personal-goal") {
              const value = withCompletion(
                personalGoalSchema.parse({
                  ...draft.value,
                  id: draft.value?.id ?? id(),
                  name: v("name"),
                  kind: v("kind"),
                  category: v("category"),
                  target: n("target"),
                  unit: v("unit"),
                  deadline: v("deadline") || null,
                  milestones: draft.value?.milestones ?? [],
                  history: draft.value?.history ?? [],
                  completedAt: draft.value?.completedAt ?? null,
                  completionHistory: draft.value?.completionHistory ?? [],
                }),
              );
              next.personalGoals = draft.value
                ? life.personalGoals.map((t) => (t.id === value.id ? value : t))
                : [...life.personalGoals, value];
            }
            if (draft.kind === "subscription") {
              const value = subscriptionSchema.parse({
                ...draft.value,
                id: draft.value?.id ?? id(),
                name: v("name"),
                amount: n("amount"),
                kind: v("kind"),
                category: v("category"),
                start: v("start"),
                repeat: v("repeat"),
                until: v("until") || null,
                active: form.get("active") === "on",
              });
              next.subscriptions = draft.value
                ? life.subscriptions.map((t) => (t.id === value.id ? value : t))
                : [...life.subscriptions, value];
            }
            if (draft.kind === "payslip") {
              const value = payslipSchema.parse({
                ...draft.value,
                id: draft.value?.id ?? id(),
                workplaceId: v("workplaceId"),
                month: v("month"),
                gross: n("gross"),
                net: v("net") === "" ? null : n("net"),
                verified: form.get("verified") === "on",
                notes: v("notes"),
              });
              next.payslips = draft.value
                ? life.payslips.map((t) => (t.id === value.id ? value : t))
                : [...life.payslips, value];
            }
            if (draft.kind === "targets")
              next.workTargets = {
                ...life.workTargets,
                [draft.month]: {
                  ...life.workTargets[draft.month],
                  hours: n("hours"),
                  gross: n("gross"),
                },
              };
            if (draft.kind === "goal-progress") {
              if (!(n("amount") > 0)) throw new Error("positive");
              const goal = draft.value;
              if (
                goal.kind === "habit" &&
                goal.history.some((h) => h.date === v("date"))
              )
                throw new Error("duplicate habit");
              const updated = withCompletion({
                ...goal,
                history: [
                  ...goal.history,
                  {
                    id: id(),
                    date: v("date"),
                    amount: n("amount"),
                    note: v("note"),
                  },
                ],
              });
              next.personalGoals = life.personalGoals.map((g) =>
                g.id === goal.id ? updated : g,
              );
            }
            if (draft.kind === "milestone") {
              const goal = draft.value,
                old = goal.milestones.find((m) => m.id === draft.milestoneId),
                entry = {
                  ...old,
                  id: old?.id ?? id(),
                  title: v("title"),
                  doneAt: old?.doneAt ?? null,
                };
              const updated = withCompletion({
                ...goal,
                milestones: old
                  ? goal.milestones.map((m) => (m.id === old.id ? entry : m))
                  : [...goal.milestones, entry],
              });
              next.personalGoals = life.personalGoals.map((g) =>
                g.id === goal.id ? updated : g,
              );
            }
            if (await onSave({ ...data, life: next })) onClose();
            else
              setError(
                tr(
                  "Could not save. Check entries or reload after a change in another tab.",
                  "לא ניתן לשמור. בדקו את הפרטים או רעננו אחרי שינוי בלשונית אחרת.",
                ),
              );
          } catch {
            setError(
              tr(
                "Check dates, positive amounts and required fields. Duplicate payslips or habit check-ins are not allowed.",
                "בדקו תאריכים, סכומים חיוביים ושדות חובה. אין לרשום תלוש כפול או סימון הרגל נוסף באותו יום.",
              ),
            );
          }
        }}
      >
        {draft.kind === "task" && (
          <>
            {input("title", tr("Task title", "כותרת משימה"), {
              required: true,
              maxLength: 120,
              autoFocus: true,
            })}
            <div className="form-grid">
              {input("due", tr("Due date", "תאריך יעד"), {
                type: "date",
                required: true,
                defaultValue: text("due", defaultDate),
              })}
              {input("time", tr("Time (optional)", "שעה (לא חובה)"), {
                type: "time",
              })}
            </div>
            <Field label={tr("Priority", "עדיפות")}>
              <select name="priority" defaultValue={text("priority", "normal")}>
                <option value="high">{tr("High", "גבוהה")}</option>
                <option value="normal">{tr("Normal", "רגילה")}</option>
                <option value="low">{tr("Low", "נמוכה")}</option>
              </select>
            </Field>
            {repeats()}
            {input(
              "until",
              tr("Repeat until (optional)", "חזרה עד (לא חובה)"),
              { type: "date" },
            )}
            <Field label={tr("Related goal", "יעד קשור")}>
              <select
                name="goalRef"
                defaultValue={
                  draft.value?.goalId
                    ? "personal:" + draft.value.goalId
                    : draft.value?.savingsGoalId
                      ? "savings:" + draft.value.savingsGoalId
                      : ""
                }
              >
                <option value="">{tr("No goal", "ללא יעד")}</option>
                {life.personalGoals.map((g) => (
                  <option key={g.id} value={"personal:" + g.id}>
                    {g.name}
                  </option>
                ))}
                {data.goals.map((g) => (
                  <option key={g.id} value={"savings:" + g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </Field>
          </>
        )}
        {draft.kind === "event" && (
          <>
            {input("title", tr("Event title", "כותרת אירוע"), {
              required: true,
              maxLength: 120,
              autoFocus: true,
            })}
            {input("date", tr("Event date", "תאריך אירוע"), {
              type: "date",
              required: true,
              defaultValue: text("date", defaultDate),
            })}
            <p className="small muted">
              {tr(
                "Leave times blank for an all-day event. Times use this device’s timezone.",
                "השאירו שעות ריקות לאירוע יום שלם. השעות לפי אזור הזמן במכשיר.",
              )}
            </p>
            <div className="form-grid">
              {input("time", tr("Start time", "שעת התחלה"), { type: "time" })}
              {input("endTime", tr("End time", "שעת סיום"), { type: "time" })}
            </div>
            {repeats()}
            {input(
              "until",
              tr("Repeat until (optional)", "חזרה עד (לא חובה)"),
              { type: "date" },
            )}
          </>
        )}
        {draft.kind === "personal-goal" && (
          <>
            {input("name", tr("Goal name", "שם היעד"), {
              required: true,
              maxLength: 100,
              autoFocus: true,
            })}
            <Field label={tr("Goal type", "סוג יעד")}>
              <select name="kind" defaultValue={text("kind", "personal")}>
                <option value="personal">{tr("Personal", "אישי")}</option>
                <option value="habit">{tr("Habit", "הרגל")}</option>
                <option value="custom">{tr("Custom", "מותאם אישית")}</option>
              </select>
            </Field>
            {number("target", tr("Target quantity", "כמות יעד"), 1)}
            {input("unit", tr("Progress unit", "יחידת התקדמות"), {
              required: true,
              maxLength: 30,
              defaultValue: text("unit", tr("steps", "צעדים")),
            })}
            {input("deadline", tr("Target date", "תאריך יעד"), {
              type: "date",
            })}
          </>
        )}
        {draft.kind === "subscription" && (
          <>
            {input("name", tr("Payment or income name", "שם תשלום או הכנסה"), {
              required: true,
              maxLength: 120,
              autoFocus: true,
            })}
            {number("amount", tr("Amount", "סכום"))}
            <Field label={tr("Type", "סוג")}>
              <select name="kind" defaultValue={text("kind", "expense")}>
                <option value="expense">{tr("Expense", "הוצאה")}</option>
                <option value="income">{tr("Income", "הכנסה")}</option>
              </select>
            </Field>
            {input("start", tr("First renewal date", "תאריך חיוב ראשון"), {
              type: "date",
              required: true,
              defaultValue: text("start", today),
            })}
            {repeats(true)}
            {input("until", tr("End date (optional)", "תאריך סיום (לא חובה)"), {
              type: "date",
            })}
            <label className="checkbox">
              <input
                name="active"
                type="checkbox"
                defaultChecked={draft.value?.active ?? true}
              />
              {tr("Active", "פעיל")}
            </label>
          </>
        )}
        {["task", "event", "personal-goal", "subscription"].includes(
          draft.kind,
        ) &&
          input("category", tr("Category", "קטגוריה"), {
            required: true,
            maxLength: 60,
            defaultValue: text("category", tr("Personal", "אישי")),
          })}
        {["task", "event", "payslip"].includes(draft.kind) && (
          <Field label={tr("Notes", "הערות")}>
            <textarea
              name="notes"
              maxLength={2000}
              defaultValue={text("notes")}
            />
          </Field>
        )}
        {draft.kind === "payslip" && (
          <>
            <Field label={tr("Workplace", "מקום עבודה")}>
              <select
                name="workplaceId"
                defaultValue={text("workplaceId", data.workplaces[0]?.id)}
              >
                {data.workplaces.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
            </Field>
            {input("month", tr("Payslip month", "חודש התלוש"), {
              type: "month",
              required: true,
              defaultValue: text("month", today.slice(0, 7)),
            })}
            {number("gross", tr("Gross from payslip", "ברוטו מהתלוש"))}
            {input(
              "net",
              tr("Net from payslip (optional)", "נטו מהתלוש (לא חובה)"),
              { type: "number", step: ".01", min: 0, max: 1e9 },
            )}
            <label className="checkbox">
              <input
                type="checkbox"
                name="verified"
                defaultChecked={draft.value?.verified}
              />
              {tr(
                "I checked these amounts against my payslip",
                "בדקתי את הסכומים מול התלוש שלי",
              )}
            </label>
            <p className="small muted">
              {tr(
                "Manual records, not employer verification. This does not add received income or calculate net pay.",
                "רישום ידני, לא אימות מול מעסיק. הפעולה אינה מוסיפה הכנסה שהתקבלה ואינה מחשבת נטו.",
              )}
            </p>
          </>
        )}
        {draft.kind === "targets" && (
          <>
            {input("hours", tr("Monthly hours target", "יעד שעות חודשי"), {
              type: "number",
              step: ".01",
              min: 0,
              max: 744,
              required: true,
              defaultValue: life.workTargets[draft.month]?.hours ?? 0,
            })}
            {input("gross", tr("Monthly gross target", "יעד ברוטו חודשי"), {
              type: "number",
              step: ".01",
              min: 0,
              max: 1e9,
              required: true,
              defaultValue: life.workTargets[draft.month]?.gross ?? 0,
            })}
          </>
        )}
        {draft.kind === "goal-progress" && (
          <>
            {number("amount", tr("Progress amount", "כמות התקדמות"), 1)}
            {input("date", tr("Progress date", "תאריך התקדמות"), {
              type: "date",
              required: true,
              defaultValue: today,
            })}
            {input("note", tr("Progress note", "הערה להתקדמות"), {
              maxLength: 200,
            })}
          </>
        )}
        {draft.kind === "milestone" &&
          input("title", tr("Milestone title", "כותרת אבן דרך"), {
            required: true,
            maxLength: 120,
            defaultValue:
              draft.value.milestones.find((m) => m.id === draft.milestoneId)
                ?.title ?? "",
          })}
        {error && (
          <p role="alert" className="notice">
            {error}
          </p>
        )}
        <button className="primary full" disabled={busy}>
          {tr("Save", "שמירה")}
        </button>
      </form>
    </Modal>
  );
}
