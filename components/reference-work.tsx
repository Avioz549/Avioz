"use client";
import { useState } from "react";
import { Plus, Play, Pause, Square, Clock3, CalendarDays } from "lucide-react";
import { shiftPay, type FinanceData } from "@/lib/finance";
import { monthlyPayroll } from "@/lib/payroll";
export function ReferenceWork({
  data,
  month,
  now,
  busy,
  onStart,
  onStop,
  onPause,
  onManual,
}: {
  data: FinanceData;
  month: string;
  now: Date;
  busy: boolean;
  onStart: (id: string) => void;
  onStop: () => void;
  onPause: () => void;
  onManual: () => void;
}) {
  const he = data.profile.language === "he",
    tr = (en: string, heb: string) => (he ? heb : en),
    [workplaceId, setWorkplaceId] = useState("");
  const active = data.shifts.find((s) => !s.end && !s.scheduled),
    work =
      data.workplaces.find(
        (w) => w.id === (active?.workplaceId || workplaceId),
      ) || data.workplaces[0];
  const report = monthlyPayroll(data, month, now);
  const rows = data.shifts.filter((s) =>
    report.segments.some((p) => p.shiftId === s.id && p.date.startsWith(month)),
  );
  const gross = report.gross,
    hours = report.hours;
  const current = active && work ? shiftPay(active, work, now).hours * 3600 : 0;
  const timer = [
    Math.floor(current / 3600),
    Math.floor(current / 60) % 60,
    Math.floor(current) % 60,
  ]
    .map((n) => String(n).padStart(2, "0"))
    .join(":");
  const money = (n: number) =>
    new Intl.NumberFormat(he ? "he-IL" : "en-US", {
      style: "currency",
      currency: data.profile.currency,
      maximumFractionDigits: 2,
    }).format(n);
  const totalMinutes = Math.round(hours * 60);
  return (
    <section className="reference-work">
      <div className="work-segments">
        <span>{tr("This month", "החודש הנבחר")}</span>
        <span>
          {rows.length} {tr("shifts", "משמרות")}
        </span>
        <span>{tr("Gross estimates", "הערכות ברוטו")}</span>
      </div>
      <article
        className={"work-timer-card timer " + (active ? "is-running" : "")}
      >
        <span>
          {active
            ? active.pauseStartedAt
              ? tr("Shift paused", "המשמרת בהפסקה")
              : tr("Shift in progress", "המשמרת פעילה")
            : tr("Ready for your next shift", "מוכנים למשמרת הבאה")}
        </span>
        <strong className="reference-timer" dir="ltr">
          {timer}
        </strong>
        <small>
          {active
            ? work?.name
            : tr(
                "Choose a workplace and start your timer",
                "בחרו מקום עבודה והפעילו את הטיימר",
              )}
        </small>
        {active && work && (
          <p className="live-pay">
            {money(report.byShift[active.id]?.gross ?? 0)} · {money(work.wage)}{" "}
            / {tr("hour", "שעה")}
          </p>
        )}
        {active ? (
          <div className="timer-controls">
            <button
              className="stop-control"
              aria-label={tr("Stop shift", "סיום משמרת")}
              disabled={busy}
              onClick={onStop}
            >
              <Square size={18} fill="currentColor" />
            </button>
            <button
              className="pause-control"
              aria-label={
                active.pauseStartedAt
                  ? tr("Resume shift", "המשך משמרת")
                  : tr("Pause shift", "הפסקת משמרת")
              }
              disabled={busy}
              onClick={onPause}
            >
              {active.pauseStartedAt ? <Play size={20} /> : <Pause size={20} />}
            </button>
          </div>
        ) : (
          <div className="timer-start">
            <select
              aria-label={tr("Timer workplace", "מקום עבודה לטיימר")}
              value={workplaceId || work?.id || ""}
              onChange={(e) => setWorkplaceId(e.target.value)}
              disabled={!data.workplaces.length}
            >
              {!data.workplaces.length && (
                <option value="">
                  {tr("Add a workplace below", "הוסיפו מקום עבודה בהמשך")}
                </option>
              )}
              {data.workplaces.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
            <button
              className="primary"
              disabled={!work || busy}
              onClick={() => work && onStart(work.id)}
            >
              <Play size={18} />
              {tr("Start", "התחלה")}
            </button>
          </div>
        )}
      </article>
      <div className="work-month-summary">
        <div>
          <CalendarDays size={21} />
          <span>{tr("Gross this month", "ברוטו החודש")}</span>
          <strong>{money(gross)}</strong>
        </div>
        <div>
          <Clock3 size={21} />
          <span>{tr("Paid hours", "שעות בתשלום")}</span>
          <strong dir="ltr">
            {Math.floor(totalMinutes / 60)}:
            {String(totalMinutes % 60).padStart(2, "0")}
          </strong>
        </div>
      </div>
      <button
        className="primary full"
        onClick={onManual}
        disabled={!data.workplaces.length}
      >
        <Plus size={18} />
        {tr("Manual shift entry", "הוספת משמרת")}
      </button>
      <p className="small muted">
        {tr(
          "Gross estimate before deductions. Workplace-specific rules, not one universal payroll policy.",
          "הערכת ברוטו לפני ניכויים, לפי כללים לכל מקום עבודה ולא לפי כלל שכר אחיד.",
        )}
      </p>
    </section>
  );
}
