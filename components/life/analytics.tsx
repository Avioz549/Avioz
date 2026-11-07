"use client";
import { SectionTabs, SectionPanel } from "../section-tabs";
import { useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  LineChart,
  Line,
  Legend,
} from "recharts";
import {
  Download,
  Share2,
  Sparkles,
  Clock3,
  Target,
  Check,
} from "lucide-react";
import {
  monthRecap,
  recapText,
  lifeOf,
  personalProgress,
  lifeInsights,
} from "@/lib/life";
import { goalSaved } from "@/lib/finance";
import { downloadCSV } from "../production-suite";
import { SpendingAnalytics } from "../spending-analytics";
import type { LifeProps } from "./types";
export function AnalyticsScreen({ data, month, now, onNavigate }: LifeProps) {
  const he = data.profile.language === "he",
    tr = (en: string, h: string) => (he ? h : en),
    [year, m] = month.split("-").map(Number),
    life = lifeOf(data),
    money = (n: number) =>
      new Intl.NumberFormat(he ? "he-IL" : "en-US", {
        style: "currency",
        currency: data.profile.currency,
        maximumFractionDigits: 0,
      }).format(n);
  const points = useMemo(
    () =>
      Array.from({ length: 6 }, (_, i) => {
        const d = new Date(year, m - 6 + i, 15),
          key = d.toLocaleDateString("en-CA").slice(0, 7),
          r = monthRecap(data, key, now);
        return {
          label: d.toLocaleDateString(he ? "he-IL" : "en-US", {
            month: "short",
          }),
          gross: r.gross,
          hours: r.hours,
          income: r.income,
          expenses: r.expenses,
          savings: r.savingsMovement,
          tasks: r.completedTasks,
          goals: r.completedGoals,
        };
      }),
    [data, year, m, now, he],
  );
  const chart = (
    title: string,
    keys: [string, string, string][],
    line = false,
  ) => (
    <article className="panel life-chart">
      <h3>{title}</h3>
      <ResponsiveContainer width="100%" height={240}>
        {line ? (
          <LineChart data={points}>
            <CartesianGrid stroke="var(--line)" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fill: "var(--muted)", fontSize: 12 }}
            />
            <YAxis width={45} tick={{ fill: "var(--muted)", fontSize: 11 }} />
            <Tooltip
              contentStyle={{
                background: "var(--panel)",
                borderColor: "var(--line)",
                color: "var(--text)",
              }}
            />
            <Legend />
            {keys.map(([key, label, color]) => (
              <Line
                key={key}
                name={label}
                dataKey={key}
                stroke={color}
                strokeWidth={2}
                dot={{ r: 3 }}
                isAnimationActive={false}
              />
            ))}
          </LineChart>
        ) : (
          <BarChart data={points}>
            <CartesianGrid stroke="var(--line)" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fill: "var(--muted)", fontSize: 12 }}
            />
            <YAxis width={45} tick={{ fill: "var(--muted)", fontSize: 11 }} />
            <Tooltip
              contentStyle={{
                background: "var(--panel)",
                borderColor: "var(--line)",
                color: "var(--text)",
              }}
            />
            <Legend />
            {keys.map(([key, label, color]) => (
              <Bar
                key={key}
                name={label}
                dataKey={key}
                fill={color}
                radius={[5, 5, 0, 0]}
                isAnimationActive={false}
              />
            ))}
          </BarChart>
        )}
      </ResponsiveContainer>
    </article>
  );
  const [insightView, setInsightView] = useState<"money" | "work" | "life">(
    "money",
  );
  const hasHistory =
    data.transactions.length ||
    data.shifts.length ||
    life.tasks.length ||
    data.goals.length ||
    life.personalGoals.length;
  return (
    <section className="insights-screen">
      <div className="life-section-head">
        <div>
          <span className="eyebrow">SAVIO INSIGHTS</span>
          <h2>{tr("See your progress clearly", "רואים את ההתקדמות שלך")}</h2>
        </div>
        <button className="secondary" onClick={() => onNavigate?.("recap")}>
          {tr("Monthly recap", "סיכום חודשי")}
        </button>
      </div>
      {!hasHistory && (
        <p className="notice">
          {tr(
            "No personal history yet. Charts show zero recorded activity until you add records.",
            "אין עדיין היסטוריה אישית. התרשימים מציגים אפס פעילות מתועדת עד להוספת רשומות.",
          )}
        </p>
      )}
      <SectionTabs
        id="insights"
        label={tr("Insight sections", "תחומי תובנות")}
        value={insightView}
        onChange={setInsightView}
        items={[
          { key: "money", label: tr("Money", "כסף") },
          { key: "work", label: tr("Work", "עבודה") },
          { key: "life", label: tr("Goals & tasks", "יעדים ומשימות") },
        ]}
      />
      <div className="life-grid-two">
        <SectionPanel id="insights" value="work" active={insightView}>
          {" "}
          {chart(tr("Estimated gross earnings", "ברוטו משוער"), [
            ["gross", tr("Gross estimate", "ברוטו משוער"), "var(--green)"],
          ])}
          {chart(
            tr("Work hours", "שעות עבודה"),
            [["hours", tr("Paid hours", "שעות בתשלום"), "var(--green)"]],
            true,
          )}
        </SectionPanel>
        <SectionPanel id="insights" value="money" active={insightView}>
          {" "}
          {chart(
            tr(
              "Received income & recorded expenses",
              "הכנסות שהתקבלו והוצאות מתועדות",
            ),
            [
              ["income", tr("Income", "הכנסות"), "var(--green)"],
              ["expenses", tr("Expenses", "הוצאות"), "#ed8791"],
            ],
          )}
          {chart(
            tr("Recorded savings movement", "תנועת חיסכון מתועדת"),
            [
              [
                "savings",
                tr("Deposits minus withdrawals", "הפקדות פחות משיכות"),
                "var(--green)",
              ],
            ],
            true,
          )}
        </SectionPanel>
        <SectionPanel id="insights" value="life" active={insightView}>
          {" "}
          {chart(tr("Completed tasks & goals", "משימות ויעדים שהושלמו"), [
            ["tasks", tr("Tasks", "משימות"), "var(--green)"],
            ["goals", tr("Goals", "יעדים"), "#8ba7f7"],
          ])}
          <article className="panel">
            <h3>{tr("Goal progress now", "התקדמות היעדים כעת")}</h3>
            {data.goals.map((g) => (
              <div key={g.id}>
                <p>
                  {g.name} ·{" "}
                  {Math.min(100, Math.round((goalSaved(g) / g.target) * 100))}%
                </p>
                <div className="progress">
                  <i
                    style={{
                      width:
                        Math.min(100, (goalSaved(g) / g.target) * 100) + "%",
                    }}
                  />
                </div>
              </div>
            ))}
            {life.personalGoals.map((g) => (
              <div key={g.id}>
                <p>
                  {g.name} · {Math.round(personalProgress(g))}%
                </p>
                <div className="progress">
                  <i style={{ width: personalProgress(g) + "%" }} />
                </div>
              </div>
            ))}
            {!data.goals.length && !life.personalGoals.length && (
              <p className="muted">
                {tr(
                  "Add a goal to see its progress.",
                  "הוסיפו יעד כדי לראות התקדמות.",
                )}
              </p>
            )}
          </article>
        </SectionPanel>
      </div>
      {insightView === "money" && (
        <details className="analysis-detail">
          <summary>
            {tr("Spending distribution & comparisons", "פילוח הוצאות והשוואות")}
          </summary>{" "}
          <article className="panel">
            <SpendingAnalytics
              transactions={data.transactions}
              month={month}
              he={he}
              money={money}
            />
          </article>
        </details>
      )}
      <article className="panel">
        <Sparkles className="positive" />
        <h3>{tr("Your local insights", "התובנות המקומיות שלך")}</h3>
        {lifeInsights(data, month, now).map((text, i) => (
          <p key={i}>{text}</p>
        ))}
        <p className="small muted">
          {tr(
            "Historical charts use recorded activity. No past bank balances or missing goal completion dates are inferred.",
            "התרשימים ההיסטוריים משתמשים בפעילות שתועדה. לא משוחזרות יתרות בנק או השלמות יעד שתאריכיהן חסרים.",
          )}
        </p>
      </article>
    </section>
  );
}
export function RecapScreen({ data, month, now }: LifeProps) {
  const he = data.profile.language === "he",
    tr = (en: string, h: string) => (he ? h : en),
    [notice, setNotice] = useState(""),
    recap = monthRecap(data, month, now),
    money = (n: number) =>
      new Intl.NumberFormat(he ? "he-IL" : "en-US", {
        style: "currency",
        currency: data.profile.currency,
      }).format(n);
  const exportText = () => {
    const url = URL.createObjectURL(
        new Blob([recapText(data, month, now)], {
          type: "text/plain;charset=utf-8",
        }),
      ),
      a = document.createElement("a");
    a.href = url;
    a.download = `SAVIO-recap-${month}.txt`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const values = [
    {
      label: tr("Hours worked", "שעות עבודה"),
      value: recap.hours.toFixed(1),
      icon: Clock3,
    },
    {
      label: tr("Estimated gross", "ברוטו משוער"),
      value: money(recap.gross),
      icon: Clock3,
    },
    {
      label: tr("Received income", "הכנסות שהתקבלו"),
      value: money(recap.income),
      icon: Download,
    },
    {
      label: tr("Recorded expenses", "הוצאות מתועדות"),
      value: money(recap.expenses),
      icon: Download,
    },
    {
      label: tr("Savings movement", "תנועת חיסכון"),
      value: money(recap.savingsMovement),
      icon: Target,
    },
    {
      label: tr("Tasks completed", "משימות שהושלמו"),
      value: recap.completedTasks,
      icon: Check,
    },
    {
      label: tr("Goals completed", "יעדים שהושלמו"),
      value: recap.completedGoals,
      icon: Target,
    },
  ];
  return (
    <section className="life-recap">
      <article className="recap-hero">
        <span className="eyebrow">YOUR SAVIO RECAP</span>
        <h2>
          {new Date(month + "-15T12:00:00").toLocaleDateString(
            he ? "he-IL" : "en-US",
            { month: "long", year: "numeric" },
          )}
        </h2>
        <p>{tr("Your month. Your progress.", "החודש שלך. ההתקדמות שלך.")}</p>
        <div className="recap-orbit">
          <Sparkles size={48} />
        </div>
        <span>
          {tr("Calculated from your saved records", "מחושב מהרשומות ששמרת")}
        </span>
      </article>
      <div className="life-recap-grid">
        {values.map(({ label, value, icon: Icon }) => (
          <article className="panel" key={label}>
            <Icon size={22} className="positive" />
            <span>{label}</span>
            <strong>{value}</strong>
          </article>
        ))}
      </div>
      <div className="life-grid-two">
        <article className="panel">
          <h3>{tr("Compared with last month", "לעומת החודש הקודם")}</h3>
          <p>
            {tr("Income change", "שינוי בהכנסות")}: {money(recap.change.income)}
          </p>
          <p>
            {tr("Expense change", "שינוי בהוצאות")}:{" "}
            {money(recap.change.expenses)}
          </p>
          <p>
            {tr("Work hours change", "שינוי בשעות עבודה")}:{" "}
            {recap.change.hours.toFixed(1)}
          </p>
          <p className="small muted">
            {tr(
              "A month without records has no recorded activity; this is not proof that no income or expenses occurred.",
              "חודש ללא רשומות פירושו שאין פעילות מתועדת, ולא הוכחה שלא היו הכנסות או הוצאות.",
            )}
          </p>
        </article>
        <article className="panel">
          <h3>{tr("Recorded achievements", "הישגים מתועדים")}</h3>
          {recap.achievements.map((name, i) => (
            <p key={name + i}>✓ {name}</p>
          ))}
          {recap.completedTasks > 0 && (
            <p>
              ✓ {recap.completedTasks} {tr("tasks completed", "משימות שהושלמו")}
            </p>
          )}
          {recap.savingsMovement > 0 && (
            <p>
              ✓ {money(recap.savingsMovement)}{" "}
              {tr(
                "net recorded savings contributions",
                "הפקדות חיסכון נטו מתועדות",
              )}
            </p>
          )}
          {!recap.achievements.length &&
            !recap.completedTasks &&
            recap.savingsMovement <= 0 && (
              <p className="muted">
                {tr(
                  "No achievements recorded this month yet. Every next step can count.",
                  "טרם תועדו הישגים בחודש הזה. כל צעד הבא יכול להיות התחלה.",
                )}
              </p>
            )}
        </article>
      </div>
      <article className="panel">
        <h3>{tr("Your month-end outlook", "תמונת סוף החודש")}</h3>
        <strong className="life-amount">
          {money(recap.forecast.projectedBalance)}
        </strong>
        <p className="muted">
          {tr(
            "Projected recorded cash flow, including unconfirmed recurring entries. Salary estimates are separate; savings are not bank balances.",
            "תזרים מתועד חזוי, כולל מופעים חוזרים שלא אושרו. אומדני שכר נפרדים; חיסכון אינו יתרת בנק.",
          )}
        </p>
        <div className="button-row">
          <button className="primary" onClick={exportText}>
            <Download size={18} />
            {tr("Export recap", "ייצוא סיכום")}
          </button>
          <button
            className="secondary"
            onClick={() =>
              downloadCSV(`SAVIO-recap-${month}`, [
                [tr("Metric", "מדד"), tr("Value", "ערך")],
                ...values.map((v) => [v.label, String(v.value)]),
              ])
            }
          >
            CSV
          </button>
          <button
            className="secondary"
            onClick={async () => {
              if (!navigator.share) {
                exportText();
                setNotice(
                  tr(
                    "Sharing is unavailable; the summary was exported instead.",
                    "שיתוף אינו זמין; הסיכום יוצא כקובץ במקום.",
                  ),
                );
                return;
              }
              try {
                await navigator.share({
                  title: `SAVIO ${month}`,
                  text: recapText(data, month, now),
                });
              } catch (e) {
                if (!(e instanceof Error && e.name === "AbortError"))
                  setNotice(
                    tr(
                      "Sharing did not complete. Use export to keep a private copy.",
                      "השיתוף לא הושלם. השתמשו בייצוא לשמירת עותק פרטי.",
                    ),
                  );
              }
            }}
          >
            <Share2 size={18} />
            {tr("Share explicitly", "שיתוף לפי בחירתך")}
          </button>
        </div>
        <p className="small muted">
          {tr(
            "Nothing is published automatically. Share only with people you choose.",
            "שום מידע אינו מתפרסם אוטומטית. שתפו רק עם מי שבחרתם.",
          )}
        </p>
        {notice && <p role="status">{notice}</p>}
      </article>
    </section>
  );
}
