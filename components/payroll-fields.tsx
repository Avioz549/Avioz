"use client";
import type { Workplace, Shift } from "@/lib/finance";
import { Field } from "./ui";
export function PayrollFields({
  workplace,
  he,
}: {
  workplace?: Workplace;
  he: boolean;
}) {
  const p = workplace?.policy,
    tr = (en: string, h: string) => (he ? h : en);
  return (
    <details className="payroll-policy">
      <summary>
        {tr("Advanced payroll agreement", "כללי שכר מתקדמים לפי ההסכם")}
      </summary>
      <label className="checkbox">
        <input
          type="checkbox"
          name="enablePolicy"
          defaultChecked={Boolean(p)}
        />
        {tr("Enable advanced rules", "הפעלת כללים מתקדמים")}
      </label>
      <p className="small muted">
        {tr(
          "Daily and weekly overtime use the higher rate. Saturday and holiday premiums use the higher premium. Choose how that premium combines with overtime. Dates and night hours use this device’s timezone. Breaks spanning boundaries are allocated proportionally.",
          "מבין תעריפי שעות נוספות יומיות ושבועיות נבחר הגבוה. מבין תוספות שבת וחג נבחרת הגבוהה. בחרו כיצד היא משולבת עם שעות נוספות. התאריכים ושעות הלילה לפי אזור הזמן במכשיר. הפסקות שחוצות גבולות מחולקות באופן יחסי.",
        )}
      </p>
      <div className="form-grid">
        {[
          [
            "weeklyHours",
            tr("Weekly regular hours", "סף שעות שבועיות"),
            42,
            1,
            168,
          ],
          [
            "weeklyRate",
            tr("Weekly overtime multiplier", "מכפיל שעות נוספות שבועיות"),
            1.25,
            1,
            5,
          ],
          ["holidayRate", tr("Holiday multiplier", "מכפיל חג"), 1.5, 1, 5],
          ["nightRate", tr("Night multiplier", "מכפיל לילה"), 1, 1, 5],
          [
            "nightStart",
            tr("Night starts (0–23)", "תחילת לילה (0–23)"),
            22,
            0,
            23,
          ],
          ["nightEnd", tr("Night ends (0–23)", "סיום לילה (0–23)"), 6, 0, 23],
        ].map(([key, label, value, min, max]) => (
          <Field key={String(key)} label={String(label)}>
            <input
              type="number"
              name={String(key)}
              min={Number(min)}
              max={Number(max)}
              step={String(key).startsWith("night") ? "1" : ".01"}
              defaultValue={Number(p?.[key as keyof typeof p] ?? value)}
            />
          </Field>
        ))}
      </div>
      <Field label={tr("Week starts", "תחילת שבוע")}>
        <select name="weekStart" defaultValue={p?.weekStart ?? 0}>
          {(he
            ? ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"]
            : [
                "Sunday",
                "Monday",
                "Tuesday",
                "Wednesday",
                "Thursday",
                "Friday",
                "Saturday",
              ]
          ).map((s, i) => (
            <option key={s} value={i}>
              {s}
            </option>
          ))}
        </select>
      </Field>
      <Field label={tr("Premium + overtime", "שילוב תוספת ושעות נוספות")}>
        <select name="combination" defaultValue={p?.combination ?? "multiply"}>
          <option value="multiply">
            {tr("Multiply (1.5 × 1.25)", "הכפלה (1.5 × 1.25)")}
          </option>
          <option value="maximum">
            {tr("Higher rate only", "התעריף הגבוה בלבד")}
          </option>
          <option value="add">
            {tr("Add premiums (1 + .5 + .25)", "חיבור תוספות (1 + .5 + .25)")}
          </option>
        </select>
      </Field>
      <label className="checkbox">
        <input name="saturday" type="checkbox" defaultChecked={p?.saturday} />
        {tr("Automatically apply Saturday rate", "החלת תוספת שבת אוטומטית")}
      </label>
      <label className="checkbox">
        <input
          name="dailyAcrossShifts"
          type="checkbox"
          defaultChecked={p?.dailyAcrossShifts}
        />
        {tr(
          "Combine hours from shifts on the same day",
          "צבירת שעות מכל המשמרות באותו יום",
        )}
      </label>
    </details>
  );
}
export function ShiftExtras({ shift, he }: { shift?: Shift; he: boolean }) {
  const tr = (en: string, h: string) => (he ? h : en);
  return (
    <>
      <div className="form-grid">
        <Field label={tr("Tips", "טיפים")}>
          <input
            type="number"
            min="0"
            max="1000000000"
            step=".01"
            name="tips"
            defaultValue={shift?.tips ?? 0}
          />
        </Field>
        <Field label={tr("Travel reimbursement", "החזר נסיעות")}>
          <input
            type="number"
            min="0"
            max="1000000000"
            step=".01"
            name="travel"
            defaultValue={shift?.travel ?? 0}
          />
        </Field>
      </div>
      <Field label={tr("Shift notes", "הערות למשמרת")}>
        <textarea name="notes" maxLength={2000} defaultValue={shift?.notes} />
      </Field>
      <label className="checkbox">
        <input name="holiday" type="checkbox" defaultChecked={shift?.holiday} />
        {tr("Holiday shift", "משמרת חג")}
      </label>
      <label className="checkbox">
        <input
          name="scheduled"
          type="checkbox"
          defaultChecked={shift?.scheduled}
        />
        {tr(
          "Scheduled shift — exclude from worked earnings",
          "משמרת מתוכננת — לא תיכלל בשכר שכבר נצבר",
        )}
      </label>
    </>
  );
}
