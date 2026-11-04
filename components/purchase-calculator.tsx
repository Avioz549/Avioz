"use client";
import { useState } from "react";
import { Clock3 } from "lucide-react";
import { Field } from "./ui";
import type { Workplace } from "@/lib/finance";
export function PurchaseCalculator({
  workplaces,
  he,
}: {
  workplaces: Workplace[];
  he: boolean;
}) {
  const [hours, setHours] = useState<number | null>(null);
  return (
    <article className="panel">
      <div className="panel-heading">
        <div>
          <span className="eyebrow">
            {he ? "קונים במחשבה תחילה" : "A LITTLE PERSPECTIVE"}
          </span>
          <h2>{he ? "כמה שעות זה עולה?" : "What does it cost in hours?"}</h2>
        </div>
        <Clock3 className="positive" />
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          setHours(Number(f.get("price")) / Number(f.get("wage")));
        }}
      >
        <div className="form-grid">
          <Field label={he ? "מחיר רכישה" : "Purchase price"}>
            <input name="price" type="number" min="0" step="0.01" required />
          </Field>
          <Field label={he ? "שכר שעתי ברוטו" : "Gross hourly wage"}>
            <input
              name="wage"
              type="number"
              min="0.01"
              step="0.01"
              defaultValue={workplaces.find((w) => w.wage > 0)?.wage}
              required
            />
          </Field>
        </div>
        <button className="secondary">
          {he ? "חישוב שעות עבודה" : "Calculate work hours"}
        </button>
      </form>
      {hours !== null && (
        <p className="calculator-result" role="status">
          <strong>{hours.toFixed(1)}</strong>{" "}
          {he ? "שעות עבודה ברוטו" : "gross work hours"}
        </p>
      )}
      <p className="small muted">
        {he
          ? "לפני מסים, ניכויים ושעות נוספות."
          : "Before taxes, deductions and overtime."}
      </p>
    </article>
  );
}
