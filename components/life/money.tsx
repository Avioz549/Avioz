"use client";
import { Plus, Pencil, Trash2, Check, Repeat2, TrendingUp } from "lucide-react";
import { lifeOf, cashForecast, monthBounds, nextRenewal } from "@/lib/life";
import { transactionSchema } from "@/lib/finance";
import { dateKey } from "@/lib/payroll";
import type { LifeProps } from "./types";
export function CashFlowPanel({ data, month, onNavigate }: LifeProps) {
  const he = data.profile.language === "he",
    tr = (en: string, h: string) => (he ? h : en),
    forecast = cashForecast(data, month),
    money = (n: number) =>
      new Intl.NumberFormat(he ? "he-IL" : "en-US", {
        style: "currency",
        currency: data.profile.currency,
      }).format(n);
  return (
    <article className="panel life-cashflow">
      <div className="flex-between">
        <div>
          <span className="eyebrow">CASH FLOW</span>
          <h2>{tr("Plan with clarity", "מתכננים עם תמונה ברורה")}</h2>
        </div>
        <TrendingUp className="positive" />
      </div>
      <div className="suite-stats">
        <div>
          <span>{tr("Recorded balance", "יתרה מתועדת")}</span>
          <strong>{money(forecast.balance)}</strong>
        </div>
        <div>
          <span>
            {tr("Projected month-end balance", "יתרה צפויה בסוף החודש")}
          </span>
          <strong>{money(forecast.projectedBalance)}</strong>
        </div>
        <div>
          <span>
            {tr("Expected income, unconfirmed", "הכנסה צפויה, טרם אושרה")}
          </span>
          <strong>{money(forecast.pendingIncome)}</strong>
        </div>
        <div>
          <span>
            {tr("Expected expenses, unconfirmed", "הוצאות צפויות, טרם אושרו")}
          </span>
          <strong>{money(forecast.pendingExpenses)}</strong>
        </div>
      </div>
      <p className="small muted">
        {tr(
          "Projection = recorded cash flow + unconfirmed recurring income − unconfirmed payments. Gross shift estimates and savings balances are never added to available cash. No bank opening balance is assumed.",
          "התחזית = תזרים מתועד + הכנסות חוזרות שלא אושרו − תשלומים שלא אושרו. אומדני ברוטו ויתרות חיסכון אינם מתווספים לכסף הפנוי. לא מונחת יתרת פתיחה בבנק.",
        )}
      </p>
      <div className="button-row life-money-links">
        {[
          ["subscriptions", tr("Subscriptions & renewals", "מנויים וחידושים")],
          ["budgets", tr("Budgets", "תקציבים")],
          ["insights", tr("Analytics", "ניתוח נתונים")],
          ["recap", tr("Monthly recap", "סיכום חודשי")],
        ].map(([tab, title]) => (
          <button
            className="secondary"
            key={tab}
            onClick={() => onNavigate?.(tab)}
          >
            {title}
          </button>
        ))}
      </div>
    </article>
  );
}
export function SubscriptionsScreen(props: LifeProps) {
  const { data, month, now, busy, onSave, onEdit } = props,
    he = data.profile.language === "he",
    tr = (en: string, h: string) => (he ? h : en),
    life = lifeOf(data),
    bounds = monthBounds(month),
    forecast = cashForecast(data, month),
    today = dateKey(now);
  const money = (n: number) =>
    new Intl.NumberFormat(he ? "he-IL" : "en-US", {
      style: "currency",
      currency: data.profile.currency,
    }).format(n);
  return (
    <section>
      <CashFlowPanel {...props} />
      <div className="life-section-head">
        <h2>{tr("Recurring payments & income", "תשלומים והכנסות חוזרים")}</h2>
        <button
          className="primary"
          onClick={() => onEdit({ kind: "subscription" })}
        >
          <Plus size={18} />
          {tr("Add subscription", "הוספת מנוי")}
        </button>
      </div>
      <div className="life-grid-two">
        {life.subscriptions.map((s) => (
          <article className="panel" key={s.id}>
            <div className="flex-between">
              <Repeat2 className="positive" />
              <span className="pill">
                {s.active ? tr("Active", "פעיל") : tr("Paused", "מושהה")}
              </span>
            </div>
            <h3>{s.name}</h3>
            <strong className="life-amount">{money(s.amount)}</strong>
            <p className="muted">
              {s.kind === "income"
                ? tr("Income", "הכנסה")
                : tr("Expense", "הוצאה")}{" "}
              ·{" "}
              {he
                ? { weekly: "שבועי", monthly: "חודשי", yearly: "שנתי" }[
                    s.repeat
                  ]
                : s.repeat}
            </p>
            <p>
              {tr("Next renewal", "חידוש הבא")}:{" "}
              {s.active
                ? (nextRenewal(s, today) ??
                  tr("No future renewal", "אין חידוש עתידי"))
                : tr("Paused", "מושהה")}
            </p>
            <div className="button-row">
              <button
                className="secondary"
                onClick={() => onEdit({ kind: "subscription", value: s })}
              >
                <Pencil size={16} />
                {tr("Edit", "עריכה")}
              </button>
              <button
                className="secondary"
                disabled={busy}
                onClick={() =>
                  void onSave({
                    ...data,
                    life: {
                      ...life,
                      subscriptions: life.subscriptions.map((x) =>
                        x.id === s.id ? { ...x, active: !x.active } : x,
                      ),
                    },
                  })
                }
              >
                {s.active ? tr("Pause", "השהיה") : tr("Resume", "הפעלה")}
              </button>
              <button
                className="icon-button"
                aria-label={tr("Delete subscription ", "מחיקת מנוי ") + s.name}
                disabled={busy}
                onClick={() => {
                  if (
                    confirm(
                      tr(
                        "Delete this schedule? Confirmed transactions are kept.",
                        "למחוק את התכנון? תנועות שאושרו יישמרו.",
                      ),
                    )
                  )
                    void onSave({
                      ...data,
                      life: {
                        ...life,
                        subscriptions: life.subscriptions.filter(
                          (x) => x.id !== s.id,
                        ),
                      },
                    });
                }}
              >
                <Trash2 size={16} />
              </button>
            </div>
          </article>
        ))}
      </div>
      {!life.subscriptions.length && (
        <article className="panel empty">
          <Repeat2 size={36} />
          <h3>{tr("Know what is coming", "יודעים מה צפוי להגיע")}</h3>
          <p>
            {tr(
              "Add subscriptions, recurring bills or scheduled income. Existing recurring transactions remain intact.",
              "הוסיפו מנויים, חשבונות חוזרים או הכנסה מתוכננת. התנועות החוזרות הקיימות נשמרות.",
            )}
          </p>
        </article>
      )}
      <article className="panel">
        <h3>
          {tr("Unconfirmed occurrences", "מופעים שטרם אושרו")} · {bounds.from} –{" "}
          {bounds.to}
        </h3>
        {forecast.subscriptions.map((o) => (
          <div className="life-agenda-row" key={o.key}>
            <div className="grow">
              <strong>{o.subscription.name}</strong>
              <small>
                {o.date} · {money(o.subscription.amount)} ·{" "}
                {o.subscription.kind === "income"
                  ? tr("Expected income", "הכנסה צפויה")
                  : tr("Expected expense", "הוצאה צפויה")}
              </small>
            </div>
            <button
              className="secondary"
              disabled={busy}
              onClick={() => {
                if (
                  data.transactions.some(
                    (t) =>
                      t.subscriptionId === o.subscription.id &&
                      t.date === o.date,
                  )
                )
                  return;
                const record = transactionSchema.parse({
                  id: crypto.randomUUID(),
                  title: o.subscription.name,
                  amount: o.subscription.amount,
                  kind: o.subscription.kind,
                  category: o.subscription.category,
                  date: o.date,
                  recurring: false,
                  subscriptionId: o.subscription.id,
                  subscriptionOccurrence: o.date,
                });
                void onSave({
                  ...data,
                  transactions: [...data.transactions, record],
                });
              }}
            >
              <Check size={16} />
              {tr("Confirm occurrence", "אישור מופע")}
            </button>
          </div>
        ))}
        {!forecast.subscriptions.length && (
          <p className="muted">
            {tr(
              "No unconfirmed subscription occurrences this month.",
              "אין מופעי מנויים שלא אושרו בחודש זה.",
            )}
          </p>
        )}
        <p className="small muted">
          {tr(
            "Confirm only after money was received or paid. Each occurrence can be confirmed once.",
            "אשרו רק אחרי שהכסף התקבל או שולם. כל מופע ניתן לאישור פעם אחת.",
          )}
        </p>
      </article>
    </section>
  );
}
