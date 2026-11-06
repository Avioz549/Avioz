"use client";
import { useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  FileDown,
  Printer,
  Clock3,
  Sparkles,
} from "lucide-react";
import {
  goalSaved,
  recordedMonthTransactions,
  totals,
  type FinanceData,
  type Shift,
} from "@/lib/finance";
import { dateKey, monthlyPayroll } from "@/lib/payroll";
import { localInsights, previousMonth } from "@/lib/insights";
import { categoryLabel } from "@/lib/categories";
import { Field } from "./ui";
export function downloadCSV(name: string, rows: (string | number)[][]) {
  const text =
    "\uFEFF" +
    rows
      .map((r) =>
        r
          .map(
            (v) =>
              '"' +
              String(v)
                .replace(/^[=+@\-\t\r]/, "'$&")
                .replaceAll('"', '""') +
              '"',
          )
          .join(","),
      )
      .join("\r\n");
  const url = URL.createObjectURL(
    new Blob([text], { type: "text/csv;charset=utf-8" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = name + ".csv";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function SalaryOverview({
  data,
  month,
  now,
  compact = false,
}: {
  data: FinanceData;
  month: string;
  now: Date;
  compact?: boolean;
}) {
  const he = data.profile.language === "he",
    tr = (en: string, h: string) => (he ? h : en);
  const report = monthlyPayroll(data, month, now),
    previous = monthlyPayroll(data, previousMonth(month), now),
    sum = totals(recordedMonthTransactions(data.transactions, month));
  const money = (n: number) =>
    new Intl.NumberFormat(he ? "he-IL" : "en-US", {
      style: "currency",
      currency: data.profile.currency,
    }).format(n);
  const active = data.shifts.find((s) => !s.end && !s.scheduled),
    w = data.workplaces.find((w) => w.id === active?.workplaceId);
  const live = active ? report.byShift[active.id] : undefined;
  return (
    <section className="panel salary-overview">
      <span className="eyebrow">{tr("WORK & EARNINGS", "עבודה והכנסות")}</span>
      <h2>
        {active
          ? tr("Your shift, live", "המשמרת שלך, בזמן אמת")
          : tr("Salary outlook", "תמונת השכר שלך")}
      </h2>
      {active && w && live && (
        <div className="live-earnings" role="status">
          <span>
            <Clock3 size={20} />
            {w.name} ·{" "}
            {active.pauseStartedAt
              ? tr("On break", "בהפסקה")
              : tr("Active", "פעילה")}
          </span>
          <strong>{money(live.gross)}</strong>
          <span dir="ltr">
            {[
              Math.floor(live.hours),
              Math.floor(live.hours * 60) % 60,
              Math.floor(live.hours * 3600) % 60,
            ]
              .map((n) => String(n).padStart(2, "0"))
              .join(":")}
          </span>
          <span>
            {live.hours.toFixed(2)} {tr("paid hours", "שעות בתשלום")} ·{" "}
            {money(w.wage)} / {tr("hour", "שעה")}
          </span>
        </div>
      )}
      <div className="suite-stats">
        <div>
          <span>{tr("Gross estimate to date", "אומדן ברוטו עד כה")}</span>
          <strong>{money(report.gross)}</strong>
        </div>
        <div>
          <span>{tr("Income received (records)", "הכנסה שהתקבלה ותועדה")}</span>
          <strong>{money(sum.income)}</strong>
        </div>
        {!compact && (
          <>
            <div>
              <span>
                {tr("Scheduled shifts estimate", "אומדן משמרות מתוכננות")}
              </span>
              <strong>
                {report.hasSchedule ? money(report.scheduled) : "—"}
              </strong>
            </div>
            <div>
              <span>{tr("Month-end estimate", "תחזית לסוף החודש")}</span>
              <strong>
                {report.hasSchedule ? money(report.forecast) : "—"}
              </strong>
            </div>
          </>
        )}
      </div>
      <p className="small muted">
        {report.hours.toFixed(1)} {tr("worked hours", "שעות עבודה")} ·{" "}
        {report.scheduledHours.toFixed(1)}{" "}
        {tr("scheduled hours", "שעות מתוכננות")}
      </p>
      {!compact && (
        <p className="small muted">
          {previous.hours
            ? tr(
                `Gross change from previous month: ${money(report.gross - previous.gross)}.`,
                `שינוי באומדן הברוטו מהחודש הקודם: ${money(report.gross - previous.gross)}.`,
              )
            : tr(
                "No previous-month work data for comparison.",
                "אין נתוני עבודה מהחודש הקודם להשוואה.",
              )}
        </p>
      )}
      <p className="small muted">
        {tr(
          "Total before deductions, including tips and travel reimbursements; not a certified taxable-pay base. Estimates stay separate from received income. A forecast requires remaining scheduled shifts.",
          "סכום כולל לפני ניכויים, כולל טיפים והחזר נסיעות; אינו בסיס שכר חייב במס מאומת. האומדנים מופרדים מהכנסה שהתקבלה. התחזית דורשת משמרות מתוכננות שטרם הסתיימו.",
        )}
      </p>
    </section>
  );
}
export function InsightsPanel({
  data,
  month,
  now,
}: {
  data: FinanceData;
  month: string;
  now: Date;
}) {
  return (
    <section className="panel suite-insights">
      <Sparkles className="positive" />
      <h2>
        {data.profile.language === "he" ? "התובנות שלך" : "Your insights"}
      </h2>
      <ul>
        {localInsights(data, month, now).map((s, i) => (
          <li key={i}>{s}</li>
        ))}
      </ul>
    </section>
  );
}
export function ShiftCalendar({
  data,
  month,
  now,
  onMonth,
  onAdd,
  onEdit,
}: {
  data: FinanceData;
  month: string;
  now: Date;
  onMonth: (n: number) => void;
  onAdd: (date: string) => void;
  onEdit: (s: Shift) => void;
}) {
  const he = data.profile.language === "he",
    tr = (en: string, h: string) => (he ? h : en),
    [selected, setSelected] = useState("");
  const [y, m] = month.split("-").map(Number),
    days = new Date(y, m, 0).getDate(),
    offset = new Date(y, m - 1, 1).getDay(),
    report = monthlyPayroll(data, month, now);
  const day = selected.startsWith(month) ? selected : month + "-01";
  const money = (n: number) =>
    new Intl.NumberFormat(he ? "he-IL" : "en-US", {
      style: "currency",
      currency: data.profile.currency,
      maximumFractionDigits: 0,
    }).format(n);
  const weeks = Array.from(
    { length: Math.ceil((days + offset) / 7) },
    (_, i) => {
      const dates = Array.from({ length: 7 }, (_, j) => i * 7 + j - offset + 1)
        .filter((d) => d >= 1 && d <= days)
        .map((d) => `${month}-${String(d).padStart(2, "0")}`);
      const parts = report.segments.filter((s) => dates.includes(s.date));
      return {
        first: dates[0],
        last: dates.at(-1),
        hours: parts.reduce((n, s) => n + s.hours, 0),
        gross: parts.reduce((n, s) => n + s.gross, 0),
      };
    },
  );
  const selectedRows = data.shifts.filter((s) => {
    const end = s.end ? new Date(s.end) : now;
    return dateKey(new Date(s.start)) <= day && dateKey(end) >= day;
  });
  return (
    <section className="panel shift-calendar">
      <div className="panel-heading">
        <h2>{tr("Shift calendar", "לוח משמרות")}</h2>
        <div className="button-row">
          <button
            className="icon-button"
            aria-label={tr("Previous work month", "חודש עבודה קודם")}
            onClick={() => onMonth(-1)}
          >
            <ChevronRight />
          </button>
          <strong>{month}</strong>
          <button
            className="icon-button"
            aria-label={tr("Next work month", "חודש עבודה הבא")}
            onClick={() => onMonth(1)}
          >
            <ChevronLeft />
          </button>
        </div>
      </div>
      <p className="small muted">
        {tr(
          "Dates use this device’s timezone. Saturdays are marked; holidays are marked on shifts you flag as holidays.",
          "התאריכים לפי אזור הזמן במכשיר. שבתות מסומנות; חגים מסומנים במשמרות שסומנו כחג.",
        )}
      </p>
      <div className="shift-calendar-grid">
        {(he
          ? ["א׳", "ב׳", "ג׳", "ד׳", "ה׳", "ו׳", "ש׳"]
          : ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
        ).map((d) => (
          <span key={d} className="muted">
            {d}
          </span>
        ))}
        {Array.from({ length: offset }, (_, i) => (
          <span key={"empty" + i} />
        ))}
        {Array.from({ length: days }, (_, i) => {
          const key = `${month}-${String(i + 1).padStart(2, "0")}`,
            parts = report.segments.filter((s) => s.date === key),
            active = data.shifts.some(
              (s) =>
                !s.end &&
                dateKey(new Date(s.start)) <= key &&
                key <= dateKey(now),
            ),
            holiday = data.shifts.some(
              (s) => s.holiday && dateKey(new Date(s.start)) === key,
            );
          return (
            <button
              type="button"
              className={
                (parts.length ? "worked " : "") +
                ((i + offset) % 7 === 6 ? "saturday " : "") +
                (active ? "active " : "")
              }
              key={key}
              aria-label={key}
              aria-pressed={day === key}
              onClick={() => setSelected(key)}
            >
              <b>{i + 1}</b>
              {parts.length > 0 && (
                <small>{money(parts.reduce((n, s) => n + s.gross, 0))}</small>
              )}
              {parts.some((s) => s.scheduled) && <i>{tr("Plan", "תכנון")}</i>}
              {holiday && <i>{tr("Holiday", "חג")}</i>}
            </button>
          );
        })}
      </div>
      <div className="flex-between spaced">
        <h3>{day}</h3>
        <button
          className="secondary"
          disabled={!data.workplaces.length}
          onClick={() => onAdd(day)}
        >
          <Plus size={18} />
          {tr("Add shift on date", "הוספת משמרת בתאריך")}
        </button>
      </div>
      {selectedRows.length ? (
        selectedRows.map((s) => (
          <button
            className="calendar-shift-row"
            key={s.id}
            onClick={() => onEdit(s)}
          >
            <span>
              {data.workplaces.find((w) => w.id === s.workplaceId)?.name} ·{" "}
              {new Date(s.start).toLocaleTimeString(he ? "he-IL" : "en-US", {
                hour: "2-digit",
                minute: "2-digit",
              })}{" "}
              ·{" "}
              {s.scheduled
                ? tr("Scheduled", "מתוכננת")
                : s.end
                  ? tr("Completed", "הסתיימה")
                  : tr("Active", "פעילה")}
              {s.notes && <small>{s.notes}</small>}
            </span>
            <strong>
              {money(
                report.segments
                  .filter((p) => p.shiftId === s.id && p.date === day)
                  .reduce((n, s) => n + s.gross, 0),
              )}
            </strong>
          </button>
        ))
      ) : (
        <p className="muted">
          {tr("No shifts on this day.", "אין משמרות בתאריך זה.")}
        </p>
      )}
      <details className="spaced">
        <summary>
          {tr(
            "Weekly totals (days in this month)",
            "סיכום שבועי (ימים בחודש הנבחר)",
          )}
        </summary>
        {weeks.map((w) => (
          <p key={w.first}>
            {w.first} – {w.last}: {w.hours.toFixed(1)} {tr("hours", "שעות")} ·{" "}
            {money(w.gross)}
          </p>
        ))}
      </details>
      <p>
        {tr(
          "Monthly gross including planned shifts",
          "ברוטו חודשי כולל משמרות מתוכננות",
        )}
        : <strong>{money(report.forecast)}</strong>
      </p>
    </section>
  );
}
export function CategoryManager({
  data,
  onSave,
  busy,
}: {
  data: FinanceData;
  onSave: (d: FinanceData) => Promise<boolean | undefined>;
  busy: boolean;
}) {
  const he = data.profile.language === "he",
    [name, setName] = useState("");
  return (
    <details className="panel category-manager">
      <summary>{he ? "ניהול קטגוריות אישיות" : "Custom categories"}</summary>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          const value = name.trim();
          if (
            value &&
            (await onSave({
              ...data,
              customCategories: [
                ...new Set([...(data.customCategories ?? []), value]),
              ],
            }))
          )
            setName("");
        }}
      >
        <Field label={he ? "שם קטגוריה חדשה" : "New category name"}>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={60}
            required
          />
        </Field>
        <button className="secondary" disabled={busy}>
          {he ? "הוספת קטגוריה" : "Add category"}
        </button>
      </form>
      {data.customCategories?.map((c) => (
        <div className="flex-between" key={c}>
          <span>{c}</span>
          <button
            disabled={busy}
            onClick={() => {
              if (
                confirm(
                  he
                    ? "להסיר מהרשימה? רשומות קיימות יישמרו."
                    : "Remove from choices? Existing records remain.",
                )
              )
                void onSave({
                  ...data,
                  customCategories: data.customCategories?.filter(
                    (x) => x !== c,
                  ),
                });
            }}
          >
            {he ? "הסרה" : "Remove"}
          </button>
        </div>
      ))}
    </details>
  );
}
export function ReportsScreen({
  data,
  month,
  now,
}: {
  data: FinanceData;
  month: string;
  now: Date;
}) {
  const he = data.profile.language === "he",
    tr = (en: string, h: string) => (he ? h : en);
  const report = monthlyPayroll(data, month, now),
    tx = recordedMonthTransactions(data.transactions, month),
    total = totals(tx);
  const shifts = data.shifts.filter((s) =>
    report.segments.some((p) => p.shiftId === s.id && p.date.startsWith(month)),
  );
  const salaryRows: (string | number)[][] = [
    [
      tr("Workplace", "מקום עבודה"),
      tr("Worked hours", "שעות עבודה"),
      tr("Gross estimate", "אומדן ברוטו"),
      tr("Scheduled estimate", "אומדן מתוכנן"),
    ],
    ...data.workplaces.map((w) => {
      const rows = report.segments.filter(
        (s) => s.workplaceId === w.id && s.date.startsWith(month),
      );
      return [
        w.name,
        rows.filter((s) => !s.scheduled).reduce((n, s) => n + s.hours, 0),
        rows.filter((s) => !s.scheduled).reduce((n, s) => n + s.gross, 0),
        rows.filter((s) => s.scheduled).reduce((n, s) => n + s.gross, 0),
      ];
    }),
  ];
  const historyRows: (string | number)[][] = [
    [
      tr("Workplace", "מקום עבודה"),
      tr("Start", "התחלה"),
      tr("End", "סיום"),
      tr("Hours", "שעות"),
      tr("Full shift gross", "ברוטו משמרת מלאה"),
      tr("Tips", "טיפים"),
      tr("Travel", "נסיעות"),
      tr("Notes", "הערות"),
      tr("Scheduled", "מתוכננת"),
    ],
    ...shifts.map((s) => [
      data.workplaces.find((w) => w.id === s.workplaceId)?.name ?? "",
      new Date(s.start).toLocaleString(he ? "he-IL" : "en-US"),
      s.end
        ? new Date(s.end).toLocaleString(he ? "he-IL" : "en-US")
        : tr("Active", "פעילה"),
      report.byShift[s.id]?.hours ?? 0,
      report.byShift[s.id]?.gross ?? 0,
      s.tips ?? 0,
      s.travel ?? 0,
      s.notes ?? "",
      s.scheduled ? tr("Yes", "כן") : tr("No", "לא"),
    ]),
  ];
  const incomeRows: (string | number)[][] = [
    [
      tr("Date", "תאריך"),
      tr("Description", "תיאור"),
      tr("Category", "קטגוריה"),
      tr("Kind", "סוג"),
      tr("Amount", "סכום"),
    ],
    ...tx.map((t) => [
      t.date,
      t.title,
      categoryLabel(t.category, he),
      t.kind === "income" ? tr("Income", "הכנסה") : tr("Expense", "הוצאה"),
      t.amount,
    ]),
  ];
  const goalRows: (string | number)[][] = [
    [
      tr("Goal", "יעד"),
      tr("Recorded savings", "חיסכון מתועד"),
      tr("Target", "סכום יעד"),
      tr("Target date", "תאריך יעד"),
      tr("Saving share %", "אחוז חיסכון"),
    ],
    ...data.goals.map((g) => [
      g.name,
      goalSaved(g),
      g.target,
      g.date ?? "",
      g.savingShare ?? 0,
    ]),
  ];
  return (
    <section className="panel reports-screen">
      <div className="panel-heading">
        <div>
          <span className="eyebrow">SAVIO REPORTS</span>
          <h2>
            {tr("Your monthly reports", "הדוחות החודשיים שלך")} · {month}
          </h2>
        </div>
        <button className="secondary no-print" onClick={() => window.print()}>
          <Printer size={18} />
          {tr("Print / Save PDF", "הדפסה / שמירה כ־PDF")}
        </button>
      </div>
      <p className="muted">
        {tr(
          "Payroll is a gross estimate before deductions. Savings are recorded amounts, not verified bank balances. CSV exports use UTF-8 with Hebrew headings. PDF uses your browser’s print dialog.",
          "השכר הוא אומדן ברוטו לפני ניכויים. החיסכון מתועד ואינו יתרת בנק מאומתת. ייצוא CSV תומך בעברית. שמירת PDF דרך חלון ההדפסה של הדפדפן.",
        )}
      </p>
      <p>
        {tr("Received income", "הכנסות שהתקבלו")}: {total.income.toFixed(2)} ·{" "}
        {tr("Expenses", "הוצאות")}: {total.expenses.toFixed(2)} ·{" "}
        {data.profile.currency}
      </p>
      {[
        [tr("Monthly salary", "דוח שכר חודשי"), salaryRows],
        [tr("Shift history", "היסטוריית משמרות"), historyRows],
        [tr("Income and expenses", "הכנסות והוצאות"), incomeRows],
        [tr("Savings progress", "התקדמות חיסכון"), goalRows],
      ].map(([title, rows], i) => (
        <article className="report-block" key={String(title)}>
          <div className="flex-between">
            <h3>{String(title)}</h3>
            <button
              className="secondary no-print"
              onClick={() =>
                downloadCSV(
                  `SAVIO-${month}-${i + 1}`,
                  rows as (string | number)[][],
                )
              }
            >
              <FileDown size={18} />
              CSV
            </button>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  {(rows as (string | number)[][])[0].map((h, j) => (
                    <th key={j}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(rows as (string | number)[][]).slice(1).map((row, k) => (
                  <tr key={k}>
                    {row.map((v, j) => (
                      <td key={j}>
                        {typeof v === "number" ? Math.round(v * 100) / 100 : v}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {(rows as unknown[]).length === 1 && (
            <p className="muted">
              {tr("No records yet.", "אין עדיין רשומות.")}
            </p>
          )}
        </article>
      ))}
    </section>
  );
}
