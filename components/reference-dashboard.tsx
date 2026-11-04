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
import {
  Eye,
  EyeOff,
  ArrowUpRight,
  ArrowDownRight,
  Clock3,
  Target,
  Plus,
  Sparkles,
} from "lucide-react";
import {
  monthTransactions,
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
  recent,
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
  const sum = totals(monthTransactions(data.transactions, month));
  const [y, m] = month.split("-").map(Number),
    days = new Date(y, m, 0).getDate();
  const chart = Array.from({ length: 7 }, (_, i) => {
    const from = Math.floor((i * days) / 7) + 1,
      to = Math.floor(((i + 1) * days) / 7);
    return {
      label: String(from),
      value: monthTransactions(data.transactions, month)
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
    monthTransactions(
      data.transactions,
      `${previous.getFullYear()}-${String(previous.getMonth() + 1).padStart(2, "0")}`,
    ),
  );
  const savings = data.goals.reduce((n, g) => n + goalSaved(g), 0),
    target = data.goals.reduce((n, g) => n + g.target, 0);
  return (
    <div className="reference-dashboard">
      <article className="reference-balance">
        <div className="balance-symbol">
          <Target size={27} />
        </div>
        <div>
          <span>{tr("Available balance", "יתרה פנויה")}</span>
          <strong className="hero-balance" dir="ltr">
            {hidden ? "••••••" : money(sum.balance)}
          </strong>
          <small>
            {tr(
              "Recorded cash flow · not a bank balance",
              "תזרים מתועד · לא יתרת בנק",
            )}
          </small>
        </div>
        <button
          aria-label={tr(
            hidden ? "Show balance" : "Hide balance",
            hidden ? "הצגת יתרה" : "הסתרת יתרה",
          )}
          className="icon-button"
          onClick={() => setHidden(!hidden)}
        >
          {hidden ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </article>
      <div className="reference-flow-cards hero-metrics">
        {[
          {
            key: "income",
            label: tr("Monthly income", "הכנסות החודש"),
            value: sum.income,
            previous: prev.income,
            icon: ArrowDownRight,
          },
          {
            key: "expense",
            label: tr("Monthly expenses", "הוצאות החודש"),
            value: sum.expenses,
            previous: prev.expenses,
            icon: ArrowUpRight,
          },
        ].map(({ key, label, value, previous, icon: Icon }) => (
          <article key={key}>
            <div>
              <span>{label}</span>
              <Icon size={17} />
            </div>
            <strong>{money(value)}</strong>
            <small className={key === "expense" ? "expense-color" : "positive"}>
              {previous
                ? `${value >= previous ? "+" : ""}${Math.round(((value - previous) / previous) * 100)}%`
                : tr("This month", "החודש הנבחר")}
            </small>
          </article>
        ))}
      </div>
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
                <linearGradient id="reference-bar" x1="0" y1="0" x2="0" y2="1">
                  <stop stopColor="#54ff9f" />
                  <stop offset="1" stopColor="#0c743d" />
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
                    fill={i === last ? "url(#reference-bar)" : "#263b2f"}
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
      <div className="reference-summary">
        <button onClick={onWork}>
          <Clock3 size={20} />
          <div>
            <span>{tr("Expected gross salary", "שכר ברוטו צפוי")}</span>
            <strong>{money(pay)}</strong>
          </div>
        </button>
        <button onClick={onSavings}>
          <Target size={20} />
          <div>
            <span>{tr("Recorded savings", "חיסכון מתועד")}</span>
            <strong>{money(savings)}</strong>
          </div>
          <small>
            {target
              ? Math.min(100, Math.round((savings / target) * 100)) + "%"
              : "—"}
          </small>
        </button>
      </div>
      <section className="reference-recent">
        <div className="panel-heading">
          <h2>{tr("Recent transactions", "תנועות אחרונות")}</h2>
          <button className="text-button" onClick={onAdd}>
            <Plus size={18} />
            {tr("Add transaction", "הוספת תנועה")}
          </button>
        </div>
        {recent}
      </section>
      <article className="reference-insight">
        <Sparkles size={20} />
        <p>
          {sum.income
            ? `${tr("A conservative saving allowance", "מרווח חיסכון שמרני")}: ${money(Math.max(0, sum.balance) * 0.2)}`
            : tr(
                "Your next step: record income and expenses for insights based on your own numbers.",
                "הצעד הבא: תעדו הכנסות והוצאות לקבלת תובנות שמבוססות עליכם.",
              )}
        </p>
      </article>
    </div>
  );
}
