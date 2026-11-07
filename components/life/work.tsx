"use client";
import { useState } from "react";
import { Plus, Pencil, Trash2, Target, Bell } from "lucide-react";
import { lifeOf, shiftDate, workStats } from "@/lib/life";
import { dateKey, monthlyPayroll } from "@/lib/payroll";
import { sumMoney } from "@/lib/money";
import type { LifeProps } from "./types";
export function WorkPro(
  props: LifeProps & {
    onNewShift: (date: string) => void;
    view?: "salary" | "planning" | "settings";
  },
) {
  const { data, now, month, busy, onSave, onEdit, onShift, onNewShift, view } =
      props,
    he = data.profile.language === "he",
    tr = (en: string, h: string) => (he ? h : en),
    life = lifeOf(data),
    [week, setWeek] = useState(dateKey(now)),
    [notice, setNotice] = useState(""),
    stats = workStats(data, month, now);
  const from = shiftDate(week, -new Date(week + "T12:00:00").getDay()),
    days = Array.from({ length: 7 }, (_, i) => shiftDate(from, i));
  const money = (n: number) =>
    new Intl.NumberFormat(he ? "he-IL" : "en-US", {
      style: "currency",
      currency: data.profile.currency,
    }).format(n);
  const priorDate = new Date(month + "-15T12:00:00");
  priorDate.setMonth(priorDate.getMonth() - 1);
  const prior = monthlyPayroll(data, dateKey(priorDate).slice(0, 7), now);
  return (
    <section className="work-pro">
      {(!view || view === "salary") && (
        <article className="panel">
          <div className="life-section-head">
            <div>
              <span className="eyebrow">WORK PRO</span>
              <h2>{tr("Your month, your targets", "החודש שלך, היעדים שלך")}</h2>
            </div>
            <button
              className="secondary"
              onClick={() => onEdit({ kind: "targets", month })}
            >
              <Target size={18} />
              {tr("Set work targets", "הגדרת יעדי עבודה")}
            </button>
          </div>
          <div className="suite-stats">
            <div>
              <span>{tr("Paid hours / target", "שעות בתשלום / יעד")}</span>
              <strong>
                {stats.pay.hours.toFixed(1)} / {stats.target.hours || "—"}
              </strong>
            </div>
            <div>
              <span>{tr("Estimated gross / target", "ברוטו משוער / יעד")}</span>
              <strong>
                {money(stats.pay.gross)} /{" "}
                {stats.target.gross ? money(stats.target.gross) : "—"}
              </strong>
            </div>
            <div>
              <span>{tr("Shifts to gross target", "משמרות ליעד הברוטו")}</span>
              <strong>
                {stats.target.gross ? (stats.requiredShifts ?? "—") : "—"}
              </strong>
            </div>
            <div>
              <span>{tr("Shifts to hours target", "משמרות ליעד השעות")}</span>
              <strong>
                {stats.target.hours ? (stats.requiredHourShifts ?? "—") : "—"}
              </strong>
            </div>
          </div>
          <p className="small muted">
            {tr(
              "Required shifts use this month’s completed-shift average. No estimate is invented without completed shifts.",
              "מספר המשמרות מבוסס על ממוצע משמרות שהסתיימו החודש. ללא נתונים לא מוצגת הערכה.",
            )}
          </p>
          <div className="life-mini-row">
            <span>
              {tr(
                "Gross change from previous month",
                "שינוי ברוטו מהחודש הקודם",
              )}
            </span>
            <strong>
              {prior.hours
                ? money(sumMoney([stats.pay.gross, -prior.gross]))
                : "—"}
            </strong>
          </div>
          <div className="life-mini-row">
            <span>{tr("Hours change", "שינוי בשעות")}</span>
            <strong>
              {prior.hours ? (stats.pay.hours - prior.hours).toFixed(1) : "—"}
            </strong>
          </div>
          <p className="small muted">
            {tr(
              "Overtime and premiums follow the existing workplace agreements. Imported frozen estimates have no inferred breakdown.",
              "שעות נוספות ותוספות מחושבות לפי ההסכמים הקיימים. לא משוחזר פירוט לאומדנים היסטוריים קפואים.",
            )}
          </p>
          <details>
            <summary>{tr("Overtime breakdown", "פירוט שעות נוספות")}</summary>
            {data.workplaces.map((w) => {
              const rows = data.shifts.filter(
                (s) =>
                  !s.scheduled &&
                  s.workplaceId === w.id &&
                  stats.pay.segments.some(
                    (p) => p.shiftId === s.id && p.date.startsWith(month),
                  ),
              );
              return (
                <div key={w.id}>
                  <h3>{w.name}</h3>
                  <p>
                    {tr(
                      "Paid overtime hours (full selected shifts)",
                      "שעות נוספות בתשלום (משמרות מלאות שנבחרו)",
                    )}
                    :{" "}
                    {rows
                      .filter((s) => s.legacyGross === undefined)
                      .reduce(
                        (n, s) => n + stats.pay.byShift[s.id].overtimeHours,
                        0,
                      )
                      .toFixed(2)}
                  </p>
                  <p>
                    {tr("Overtime increment", "תוספת שעות נוספות")}:{" "}
                    {money(
                      sumMoney(
                        rows
                          .filter((s) => s.legacyGross === undefined)
                          .map((s) => stats.pay.byShift[s.id].overtimePay),
                      ),
                    )}{" "}
                    ·{" "}
                    {tr(
                      "Weekend / holiday / night increment",
                      "תוספת שבת / חג / לילה",
                    )}
                    :{" "}
                    {money(
                      sumMoney(
                        rows
                          .filter((s) => s.legacyGross === undefined)
                          .map((s) => stats.pay.byShift[s.id].premiumPay),
                      ),
                    )}
                  </p>
                  <p>
                    {tr("Daily regular threshold", "סף שעות רגילות יומי")}:{" "}
                    {w.regularHours} · {tr("First tier", "מדרגה ראשונה")}: ×
                    {w.overtimeRate} · {tr("Next tier", "מדרגה נוספת")}: ×
                    {w.extraRate}
                  </p>
                  <p>
                    {tr(
                      "Estimated overtime/premium increment for selected full shifts",
                      "תוספת שעות נוספות ופרמיה משוערת למשמרות המלאות שנבחרו",
                    )}
                    :{" "}
                    {money(
                      sumMoney(
                        rows
                          .filter((s) => s.legacyGross === undefined)
                          .map((s) => {
                            const result = stats.pay.byShift[s.id];
                            return sumMoney([
                              result.overtimePay,
                              result.premiumPay,
                            ]);
                          }),
                      ),
                    )}
                  </p>
                </div>
              );
            })}
          </details>
        </article>
      )}
      {(!view || view === "planning") && (
        <article className="panel">
          <div className="life-section-head">
            <h2>{tr("Weekly shift planner", "תכנון משמרות שבועי")}</h2>
            <input
              aria-label={tr("Work week date", "תאריך לשבוע עבודה")}
              type="date"
              value={week}
              onChange={(e) => {
                if (e.target.value) setWeek(e.target.value);
              }}
            />
          </div>
          <div className="button-row">
            <button
              className="secondary"
              onClick={() => setWeek(shiftDate(week, -7))}
            >
              {tr("Previous week", "שבוע קודם")}
            </button>
            <button
              className="secondary"
              onClick={() => setWeek(shiftDate(week, 7))}
            >
              {tr("Next week", "שבוע הבא")}
            </button>
          </div>
          <div className="life-work-week">
            {days.map((date) => {
              const rows = data.shifts.filter(
                (s) => dateKey(new Date(s.start)) === date,
              );
              return (
                <section key={date}>
                  <div className="flex-between">
                    <strong>
                      {new Date(date + "T12:00:00").toLocaleDateString(
                        he ? "he-IL" : "en-US",
                        { weekday: "short", day: "numeric", month: "short" },
                      )}
                    </strong>
                    <button
                      className="icon-button"
                      disabled={!data.workplaces.length}
                      aria-label={
                        tr("Plan shift on ", "תכנון משמרת בתאריך ") + date
                      }
                      onClick={() => onNewShift(date)}
                    >
                      <Plus size={17} />
                    </button>
                  </div>
                  {rows.map((s) => (
                    <button
                      className="life-week-shift"
                      key={s.id}
                      onClick={() => onShift?.(s)}
                    >
                      <strong>
                        {
                          data.workplaces.find((w) => w.id === s.workplaceId)
                            ?.name
                        }
                      </strong>
                      <small>
                        {new Date(s.start).toLocaleTimeString(
                          he ? "he-IL" : "en-US",
                          { hour: "2-digit", minute: "2-digit" },
                        )}{" "}
                        ·{" "}
                        {s.scheduled
                          ? tr("Planned", "מתוכננת")
                          : s.end
                            ? tr("Completed", "הסתיימה")
                            : tr("Active", "פעילה")}
                      </small>
                    </button>
                  ))}
                  {!rows.length && (
                    <small className="muted">
                      {tr("No shifts", "ללא משמרות")}
                    </small>
                  )}
                </section>
              );
            })}
          </div>
        </article>
      )}
      {(!view || view === "salary") && (
        <article className="panel">
          <div className="life-section-head">
            <h2>{tr("Payslip comparison", "השוואה לתלוש שכר")}</h2>
            <button
              className="primary"
              disabled={!data.workplaces.length}
              onClick={() => onEdit({ kind: "payslip" })}
            >
              <Plus size={18} />
              {tr("Record payslip", "רישום תלוש")}
            </button>
          </div>
          {life.payslips
            .filter((p) => p.month === month)
            .map((p) => {
              const estimate = sumMoney(
                stats.pay.segments
                  .filter(
                    (s) =>
                      !s.scheduled &&
                      s.workplaceId === p.workplaceId &&
                      s.date.startsWith(month),
                  )
                  .map((s) => s.gross),
              );
              return (
                <section className="life-payslip" key={p.id}>
                  <div className="flex-between">
                    <strong>
                      {
                        data.workplaces.find((w) => w.id === p.workplaceId)
                          ?.name
                      }
                    </strong>
                    <span className="pill">
                      {p.verified
                        ? tr("Checked by you", "נבדק על ידך")
                        : tr("Unverified manual entry", "הזנה ידנית שלא אומתה")}
                    </span>
                  </div>
                  <div className="suite-stats">
                    <div>
                      <span>{tr("Estimated gross", "ברוטו משוער")}</span>
                      <strong>{money(estimate)}</strong>
                    </div>
                    <div>
                      <span>
                        {tr(
                          "Gross recorded from payslip",
                          "ברוטו שהוזן מהתלוש",
                        )}
                      </span>
                      <strong>{money(p.gross)}</strong>
                    </div>
                    <div>
                      <span>
                        {tr("Recorded − estimated", "מתועד פחות משוער")}
                      </span>
                      <strong>{money(sumMoney([p.gross, -estimate]))}</strong>
                    </div>
                    <div>
                      <span>
                        {tr(
                          "Net recorded (not calculated)",
                          "נטו שהוזן (לא מחושב)",
                        )}
                      </span>
                      <strong>{p.net === null ? "—" : money(p.net)}</strong>
                    </div>
                  </div>
                  {p.notes && <p>{p.notes}</p>}
                  <div className="button-row">
                    <button
                      className="secondary"
                      onClick={() => onEdit({ kind: "payslip", value: p })}
                    >
                      <Pencil size={16} />
                      {tr("Edit payslip", "עריכת תלוש")}
                    </button>
                    <button
                      className="icon-button"
                      disabled={busy}
                      aria-label={tr("Delete payslip", "מחיקת תלוש")}
                      onClick={() => {
                        if (
                          confirm(
                            tr(
                              "Delete this payslip record? Financial transactions remain unchanged.",
                              "למחוק את רישום התלוש? התנועות הפיננסיות לא ישתנו.",
                            ),
                          )
                        )
                          void onSave({
                            ...data,
                            life: {
                              ...life,
                              payslips: life.payslips.filter(
                                (x) => x.id !== p.id,
                              ),
                            },
                          });
                      }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </section>
              );
            })}
          {!life.payslips.some((p) => p.month === month) && (
            <p className="muted">
              {tr(
                "No payslip recorded for this month.",
                "לא הוזן תלוש לחודש זה.",
              )}
            </p>
          )}
          <p className="small muted">
            {tr(
              "Estimates include recorded tips and travel. Employer payroll may classify these differently. Payslip amounts are entered manually; no employer verification or income posting occurs.",
              "האומדן כולל טיפים ונסיעות, שעשויים להיות מסווגים אחרת בתלוש. הסכומים מוזנים ידנית; אין אימות מול מעסיק או רישום הכנסה אוטומטי.",
            )}
          </p>
        </article>
      )}
      {(!view || view === "settings") && (
        <article className="panel">
          <Bell className="positive" />
          <h3>{tr("Shift reminders", "תזכורות למשמרות")}</h3>
          <p className="muted">
            {tr(
              "Where supported, remind me within 30 minutes of a planned shift while SAVIO is open. Background delivery is not guaranteed.",
              "בדפדפנים נתמכים, תזכורת בטווח 30 דקות ממשמרת מתוכננת כשהאפליקציה פתוחה. אין הבטחה למסירה ברקע.",
            )}
          </p>
          <button
            className="secondary"
            disabled={busy}
            onClick={async () => {
              if (!life.preferences.shiftReminders) {
                if (!("Notification" in window)) {
                  setNotice(
                    tr("Notifications are unavailable.", "התראות אינן זמינות."),
                  );
                  return;
                }
                if ((await Notification.requestPermission()) !== "granted") {
                  setNotice(
                    tr(
                      "Notification permission was not granted.",
                      "לא ניתן אישור להתראות.",
                    ),
                  );
                  return;
                }
              }
              void onSave({
                ...data,
                life: {
                  ...life,
                  preferences: {
                    ...life.preferences,
                    shiftReminders: !life.preferences.shiftReminders,
                  },
                },
              });
            }}
          >
            {life.preferences.shiftReminders
              ? tr("Disable shift reminders", "כיבוי תזכורות משמרת")
              : tr("Enable shift reminders", "הפעלת תזכורות משמרת")}
          </button>
          {notice && <p role="status">{notice}</p>}
        </article>
      )}
    </section>
  );
}
