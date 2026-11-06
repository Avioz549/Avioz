import {
  goalSaved,
  recordedMonthTransactions,
  totals,
  type FinanceData,
  type Goal,
} from "./finance";
import { sumMoney } from "./money";
import { monthlyPayroll } from "./payroll";
import { categoryLabel } from "./categories";
export function previousMonth(month: string) {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(y, m - 2, 15);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
export function goalShifts(
  data: FinanceData,
  goal: Goal,
  now = new Date(),
  byShift?: Record<string, { gross: number }>,
) {
  const complete = data.shifts.filter(
    (s) => s.end && !s.scheduled && Date.parse(s.end) <= now.getTime(),
  );
  const ledger =
    byShift ??
    monthlyPayroll({ ...data, shifts: complete }, "1900-01", now).byShift;
  const average = complete.length
    ? sumMoney(complete.map((s) => ledger[s.id]?.gross ?? 0)) / complete.length
    : 0;
  const share = (goal.savingShare ?? 0) / 100;
  return average > 0 && share > 0
    ? Math.ceil(Math.max(0, goal.target - goalSaved(goal)) / (average * share))
    : null;
}
export function localInsights(
  data: FinanceData,
  month: string,
  now = new Date(),
) {
  const he = data.profile.language === "he",
    tr = (en: string, heb: string) => (he ? heb : en);
  const money = (n: number) =>
    new Intl.NumberFormat(he ? "he-IL" : "en-US", {
      style: "currency",
      currency: data.profile.currency,
      maximumFractionDigits: 2,
    }).format(n);
  const current = totals(recordedMonthTransactions(data.transactions, month)),
    prior = totals(
      recordedMonthTransactions(data.transactions, previousMonth(month)),
    );
  const work = monthlyPayroll(data, month, now),
    oldWork = monthlyPayroll(data, previousMonth(month), now);
  const items: string[] = [];
  if (data.transactions.length) {
    items.push(
      tr(
        `Recorded income ${money(current.income)}; spending ${money(current.expenses)}. Received money and estimated shift pay are kept separate.`,
        `הכנסות מתועדות ${money(current.income)}; הוצאות ${money(current.expenses)}. כסף שהתקבל מופרד מאומדני שכר.`,
      ),
    );
    if (
      recordedMonthTransactions(data.transactions, previousMonth(month)).length
    )
      items.push(
        tr(
          `Spending change from last month: ${money(current.expenses - prior.expenses)}. Income change: ${money(current.income - prior.income)}.`,
          `שינוי בהוצאות מהחודש הקודם: ${money(current.expenses - prior.expenses)}. שינוי בהכנסות: ${money(current.income - prior.income)}.`,
        ),
      );
  }
  if (work.hours) {
    items.push(
      tr(
        `Worked ${work.hours.toFixed(1)} paid hours; estimated gross ${money(work.gross)}.`,
        `תועדו ${work.hours.toFixed(1)} שעות בתשלום; אומדן ברוטו ${money(work.gross)}.`,
      ),
    );
    if (oldWork.hours)
      items.push(
        tr(
          `Work hours changed by ${(work.hours - oldWork.hours).toFixed(1)} from the previous month.`,
          `שעות העבודה השתנו ב־${(work.hours - oldWork.hours).toFixed(1)} לעומת החודש הקודם.`,
        ),
      );
    for (const w of data.workplaces) {
      const gross = sumMoney(
        work.segments
          .filter(
            (s) =>
              !s.scheduled &&
              s.workplaceId === w.id &&
              s.date.startsWith(month),
          )
          .map((s) => s.gross),
      );
      if (gross > 0)
        items.push(
          `${w.name}: ${money(gross)} ${tr("estimated gross", "ברוטו משוער")}`,
        );
    }
  }
  for (const [key, limit] of Object.entries(data.budgets)) {
    if (!key.startsWith(month + ":") || limit <= 0) continue;
    const cat = key.slice(8),
      spent = recordedMonthTransactions(data.transactions, month)
        .filter((t) => t.kind === "expense" && t.category === cat)
        .reduce((n, t) => n + t.amount, 0);
    if (spent >= limit * 0.8)
      items.push(
        `${categoryLabel(cat, he)}: ${Math.round((spent / limit) * 100)}% ${tr("of budget used", "מהתקציב נוצלו")}${spent > limit ? ` · ${tr("over budget", "חריגה")} ${money(spent - limit)}` : ""}`,
      );
  }
  for (const g of data.goals) {
    const shifts = goalShifts(data, g, now, work.byShift);
    items.push(
      `${g.name}: ${Math.min(100, Math.round((goalSaved(g) / g.target) * 100))}% · ${tr("remaining", "נותרו")} ${money(Math.max(0, g.target - goalSaved(g)))}${shifts !== null ? ` · ${shifts} ${tr("average shifts at your chosen saving share", "משמרות ממוצעות לפי שיעור החיסכון שבחרת")}` : ""}`,
    );
  }
  return items.length
    ? items
    : [
        tr(
          "Add transactions or completed shifts to unlock personal insights.",
          "הוסיפו תנועות או משמרות שהסתיימו כדי לקבל תובנות אישיות.",
        ),
      ];
}
export function localAnswer(
  question: string,
  data: FinanceData,
  month: string,
  now = new Date(),
) {
  const he = data.profile.language === "he",
    tr = (en: string, heb: string) => (he ? heb : en);
  const money = (n: number) =>
    new Intl.NumberFormat(he ? "he-IL" : "en-US", {
      style: "currency",
      currency: data.profile.currency,
    }).format(n);
  const q = question.toLowerCase(),
    rows = recordedMonthTransactions(data.transactions, month),
    sum = totals(rows),
    work = monthlyPayroll(data, month, now);
  const prefix = tr(
    "Local calculation · no AI model or external request. ",
    "חישוב מקומי · ללא מודל AI וללא שליחת נתונים. ",
  );
  if (/משמרות|shifts/.test(q)) {
    const amount = Number(q.replaceAll(",", "").match(/\d+(?:\.\d+)?/)?.[0]);
    const share = (data.goals[0]?.savingShare ?? 0) / 100;
    const completed = data.shifts.filter(
      (s) => s.end && !s.scheduled && Date.parse(s.end) <= now.getTime(),
    );
    const avg = completed.length
      ? sumMoney(completed.map((s) => work.byShift[s.id]?.gross ?? 0)) /
        completed.length
      : 0;
    return (
      prefix +
      (amount > 0 && avg > 0 && share > 0
        ? tr(
            `About ${Math.ceil(amount / (avg * share))} average shifts, saving ${share * 100}% of estimated gross. This is an estimate before deductions.`,
            `כ־${Math.ceil(amount / (avg * share))} משמרות ממוצעות, בחיסכון של ${share * 100}% מאומדן הברוטו. זו הערכה לפני ניכויים.`,
          )
        : tr(
            "Complete shifts and set a goal’s saving percentage, then ask with a target amount.",
            "תעדו משמרות שהסתיימו והגדירו אחוז חיסכון ביעד, ואז שאלו עם סכום יעד.",
          ))
    );
  }
  if (/הרווחתי|salary|earn|שכר/.test(q))
    return (
      prefix +
      tr(
        `Estimated gross: ${money(work.gross)}. Actual recorded income: ${money(sum.income)}. These amounts are not added together.`,
        `ברוטו משוער: ${money(work.gross)}. הכנסות שהתקבלו ותועדו: ${money(sum.income)}. הסכומים אינם מחוברים זה לזה.`,
      )
    );
  const category = [...new Set(rows.map((t) => t.category))].find(
    (c) =>
      q.includes(c.toLowerCase()) ||
      q.includes(categoryLabel(c, true)) ||
      (/אוכל|food/.test(q) && /grocer|food|dining/i.test(c)),
  );
  if (/הוצאתי|spend|spent|הוצאות/.test(q))
    return (
      prefix +
      tr(
        `Recorded spending${category ? " · " + categoryLabel(category, he) : ""}: ${money(rows.filter((t) => t.kind === "expense" && (!category || t.category === category)).reduce((n, t) => n + t.amount, 0))}.`,
        `הוצאות מתועדות${category ? " · " + categoryLabel(category, he) : ""}: ${money(rows.filter((t) => t.kind === "expense" && (!category || t.category === category)).reduce((n, t) => n + t.amount, 0))}.`,
      )
    );
  if (/חיסכון|לחסוך|saving|budget|תקציב/.test(q))
    return (
      prefix +
      localInsights(data, month, now).join("\n") +
      "\n" +
      tr(
        `Conservative saving capacity from recorded surplus: ${money(Math.max(0, sum.balance) * 0.2)}.`,
        `יכולת חיסכון שמרנית מהעודף המתועד: ${money(Math.max(0, sum.balance) * 0.2)}.`,
      )
    );
  return (
    prefix +
    tr(
      "Supported: monthly earnings, spending by category, saving plans and shifts needed for a stated amount. Choose a month using the month selector.",
      "ניתן לשאול על שכר חודשי, הוצאות לפי קטגוריה, חיסכון ומספר משמרות לסכום מסוים. הנתונים מתייחסים לחודש שבחרתם למעלה.",
    )
  );
}
