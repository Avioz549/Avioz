"use client";
import { useState } from "react";
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { Eye, EyeOff, ArrowDownRight, Target, Plus } from "lucide-react";
import { sumMoney } from "@/lib/money";
import {
  recordedMonthTransactions,
  totals,
  goalSaved,
  type FinanceData,
} from "@/lib/finance";
export function ReferenceDashboard({
  data,
  month,
  money,
  pay,
  onAdd,
  onWork,
  onSavings,
}: {
  data: FinanceData;
  month: string;
  money: (n: number) => string;
  pay: number;
  onAdd: () => void;
  onWork: () => void;
  onSavings: () => void;
  recent: React.ReactNode;
}) {
  const he = data.profile.language === "he",
    tr = (en: string, heb: string) => (he ? heb : en);
  const [hidden, setHidden] = useState(false),
    [kind, setKind] = useState<"expense" | "income">("expense");
  const sum = totals(recordedMonthTransactions(data.transactions, month));
  const [y, m] = month.split("-").map(Number),
    days = new Date(y, m, 0).getDate();
  const chart = Array.from({ length: 7 }, (_, i) => {
    const from = Math.floor((i * days) / 7) + 1,
      to = Math.floor(((i + 1) * days) / 7);
    return {
      label: String(from),
      value: recordedMonthTransactions(data.transactions, month)
        .filter(
          (t) =>
            t.kind === kind &&
            Number(t.date.slice(8)) >= from &&
            Number(t.date.slice(8)) <= to,
        )
        .reduce((n, t) => n + t.amount, 0),
    };
  });
  const last = chart.findLastIndex((c) => c.value > 0);
  const previous = new Date(y, m - 2, 1);
  const prev = totals(
    recordedMonthTransactions(
      data.transactions,
      `${previous.getFullYear()}-${String(previous.getMonth() + 1).padStart(2, "0")}`,
    ),
  );
  const savings = sumMoney(data.goals.map(goalSaved));
  return (
    <div className="reference-dashboard ocean-finance">
      <div className="ocean-summary-cards">
        <article>
          <ArrowDownRight size={22} />
          <span>{tr("Monthly income", "הכנסה חודשית")}</span>
          <strong dir="ltr">{hidden ? "••••" : money(sum.income)}</strong>
          <small>
            {tr("Recorded income received", "הכנסות שהתקבלו ותועדו")}
          </small>
        </article>
        <button onClick={onSavings}>
          <Target size={22} />
          <span>{tr("Current savings", "החיסכון הנוכחי")}</span>
          <strong dir="ltr">{hidden ? "••••" : money(savings)}</strong>
          <small>
            {tr(
              "Recorded savings · not a bank balance",
              "חיסכון מתועד · לא יתרת בנק",
            )}
          </small>
        </button>
      </div>
      <div className="ocean-cash-line">
        <div>
          <span>{tr("Recorded balance", "יתרה מתועדת")}</span>
          <strong className="hero-balance" dir="ltr">
            {hidden ? "••••••" : money(sum.balance)}
          </strong>
        </div>
        <div>
          <span>{tr("Monthly expenses", "הוצאות החודש")}</span>
          <strong dir="ltr">{hidden ? "••••" : money(sum.expenses)}</strong>
        </div>
        <button
          className="icon-button"
          onClick={() => setHidden(!hidden)}
          aria-label={tr(
            hidden ? "Show balance" : "Hide balance",
            hidden ? "הצגת יתרה" : "הסתרת יתרה",
          )}
        >
          {hidden ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
      <details className="ocean-finance-details">
        <summary>
          {tr("Cash flow & monthly comparison", "תזרים והשוואה חודשית")}
        </summary>
        <article className="reference-chart panel">
          <div className="panel-heading">
            <h2>{tr("My cash flow", "תזרים חודשי")}</h2>
            <div className="chart-switch">
              <button
                aria-pressed={kind === "expense"}
                onClick={() => setKind("expense")}
              >
                {tr("Expenses", "הוצאות")}
              </button>
              <button
                aria-pressed={kind === "income"}
                onClick={() => setKind("income")}
              >
                {tr("Income", "הכנסות")}
              </button>
            </div>
          </div>
          <div
            className="chart"
            role="img"
            aria-label={tr(
              "Financial activity in the selected month",
              "פעילות פיננסית בחודש הנבחר",
            )}
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chart}
                margin={{ top: 12, right: 4, bottom: 0, left: 4 }}
              >
                <defs>
                  <linearGradient
                    id="reference-bar"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop stopColor="var(--green)" />
                    <stop offset="1" stopColor="var(--green-bg)" />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  vertical={false}
                  stroke="var(--line)"
                  strokeDasharray="2 6"
                />
                <XAxis
                  dataKey="label"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "var(--muted)", fontSize: 11 }}
                />
                <Tooltip
                  cursor={{ fill: "#ffffff04" }}
                  contentStyle={{
                    background: "var(--panel)",
                    border: "1px solid var(--line)",
                    borderRadius: 12,
                  }}
                  formatter={(v) => money(Number(v))}
                />
                <Bar
                  dataKey="value"
                  name={
                    kind === "expense"
                      ? tr("Expenses", "הוצאות")
                      : tr("Income", "הכנסות")
                  }
                  radius={[5, 5, 2, 2]}
                  isAnimationActive={false}
                >
                  {chart.map((c, i) => (
                    <Cell
                      key={c.label}
                      fill={i === last ? "url(#reference-bar)" : "var(--line)"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          {!data.transactions.length && (
            <p className="chart-empty-copy">
              {tr(
                "Add your first transaction to reveal your trends.",
                "הוסיפו תנועה ראשונה כדי לראות את המגמות שלכם.",
              )}
            </p>
          )}
        </article>

        <p className="small muted">
          {tr("Income change", "שינוי בהכנסות")}:{" "}
          {prev.income
            ? Math.round(((sum.income - prev.income) / prev.income) * 100) + "%"
            : "—"}{" "}
          · {tr("Expected gross salary", "שכר ברוטו צפוי")}: {money(pay)}
        </p>
        <div className="button-row">
          <button className="secondary" onClick={onWork}>
            {tr("Open work", "פתיחת העבודה")}
          </button>
          <button className="secondary" onClick={onAdd}>
            <Plus size={18} />
            {tr("Add transaction", "הוספת תנועה")}
          </button>
        </div>
      </details>
    </div>
  );
}
