"use client";
import { useMemo, useState } from "react";
import {
  ArrowUp,
  ArrowDown,
  SlidersHorizontal,
  Plus,
  Check,
  Clock3,
  Target,
  CalendarDays,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  ArrowUpRight,
  Wallet,
} from "lucide-react";
import {
  lifeOf,
  smartDay,
  dailyExplanations,
  personalProgress,
  toggleTask,
  plannerEntries,
  shiftDate,
} from "@/lib/life";
import { widgetIds, actionIds } from "@/lib/life-model";
import { goalSaved } from "@/lib/finance";
import { dateKey, monthlyPayroll } from "@/lib/payroll";
import { Modal } from "../ui";
import { InsightsPanel } from "../production-suite";
import type { LifeProps } from "./types";
export function SmartDayScreen({
  data,
  now,
  busy,
  onSave,
  onEdit,
  onNavigate,
  onShift,
}: LifeProps) {
  const he = data.profile.language === "he",
    tr = (en: string, h: string) => (he ? h : en),
    today = dateKey(now),
    life = lifeOf(data),
    day = useMemo(() => smartDay(data, today), [data, today]);
  const upcomingAppointments = useMemo(
    () =>
      plannerEntries(data, shiftDate(today, 1), shiftDate(today, 7))
        .filter((e) => e.type === "event")
        .slice(0, 4),
    [data, today],
  );
  const labels: Record<string, string> = {
    task: tr("Task", "משימה"),
    event: tr("Event", "אירוע"),
    shift: tr("Shift", "משמרת"),
    payment: tr("Payment", "תשלום"),
    subscription: tr("Subscription", "מנוי"),
    reminder: tr("Reminder", "תזכורת"),
  };
  return (
    <section className="smart-day">
      <div className="life-section-head">
        <div>
          <span className="eyebrow">SAVIO SMART DAY</span>
          <h2>{tr("A clearer day starts here", "היום שלך מתחיל ברור")}</h2>
          <p className="muted">
            {new Date(today + "T12:00:00").toLocaleDateString(
              he ? "he-IL" : "en-US",
              { weekday: "long", day: "numeric", month: "long" },
            )}
          </p>
        </div>
        <button
          className="primary"
          onClick={() => onEdit({ kind: "task", date: today })}
        >
          <Plus size={18} />
          {tr("New task", "משימה חדשה")}
        </button>
      </div>
      <article className="life-day-score panel">
        <div>
          <span>{tr("Today’s task completion", "השלמת המשימות להיום")}</span>
          <strong>
            {day.completion === null ? "—" : day.completion + "%"}
          </strong>
          <p className="muted">
            {day.done} / {day.total} {tr("recorded tasks", "משימות מתועדות")}
          </p>
        </div>
        <div className="progress">
          <i style={{ width: (day.completion ?? 0) + "%" }} />
        </div>
      </article>
      <div className="life-grid-two">
        <article className="panel">
          <h3>{tr("Today’s timeline", "ציר הזמן להיום")}</h3>
          {day.entries.map((e) => (
            <div className="life-agenda-row" key={e.key}>
              {e.type === "task" ? (
                <button
                  className="icon-button task-check"
                  aria-label={tr("Complete task ", "השלמת משימה ") + e.title}
                  aria-pressed={e.done}
                  disabled={busy}
                  onClick={() =>
                    void onSave({
                      ...data,
                      life: {
                        ...life,
                        tasks: life.tasks.map((t) =>
                          t.id === e.id
                            ? toggleTask(t, today, new Date().toISOString())
                            : t,
                        ),
                      },
                    })
                  }
                >
                  <Check size={18} />
                </button>
              ) : (
                <CalendarDays size={20} />
              )}
              <button
                className="life-entry-body"
                onClick={() => {
                  if (e.type === "shift") {
                    const s = data.shifts.find((s) => s.id === e.id);
                    if (s) onShift?.(s);
                  } else
                    onNavigate?.(
                      e.type === "payment"
                        ? "transactions"
                        : e.type === "subscription"
                          ? "subscriptions"
                          : "planner",
                    );
                }}
              >
                <strong>{e.title}</strong>
                <small>
                  {e.time ?? tr("All day", "כל היום")} · {labels[e.type]}
                </small>
              </button>
            </div>
          ))}
          {!day.entries.length && (
            <p className="muted">
              {tr(
                "Nothing recorded for today. Add a task or event to plan your day.",
                "אין רשומות להיום. הוסיפו משימה או אירוע כדי לתכנן את היום.",
              )}
            </p>
          )}
        </article>
        <article className="panel">
          <Sparkles className="positive" />
          <h3>{tr("Suggested priorities", "סדר עדיפויות מוצע")}</h3>
          {dailyExplanations(data, today).map((p) => (
            <p key={p.key}>{p.text}</p>
          ))}
          {!day.priorities.length && (
            <p className="muted">
              {tr(
                "No open tasks in the recent planning window.",
                "אין משימות פתוחות בחלון התכנון האחרון.",
              )}
            </p>
          )}
          <p className="small muted">
            {tr(
              "Local rules: overdue tasks first, then your selected priority and due date. No AI service is used.",
              "כללים מקומיים: קודם משימות באיחור, ואז העדיפות ומועד היעד שסימנתם. ללא שירות AI.",
            )}
          </p>
          <button className="secondary" onClick={() => onNavigate?.("planner")}>
            {tr("Open planner", "פתיחת התכנון")}
          </button>
        </article>
      </div>
      <article className="panel">
        <h3>{tr("Upcoming appointments", "פגישות קרובות")}</h3>
        {upcomingAppointments.map((e) => (
          <div className="life-mini-row" key={e.key}>
            <span>{e.title}</span>
            <small>
              {e.date} · {e.time ?? tr("All day", "כל היום")}
            </small>
          </div>
        ))}
        {!upcomingAppointments.length && (
          <p className="muted">
            {tr(
              "No appointments recorded for the next seven days.",
              "אין פגישות מתועדות לשבעת הימים הקרובים.",
            )}
          </p>
        )}
      </article>
      <div className="life-grid-two">
        <article className="panel">
          <Target className="positive" />
          <h3>{tr("Your goals today", "היעדים שלך היום")}</h3>
          {life.personalGoals
            .filter((g) => !g.completedAt)
            .slice(0, 4)
            .map((g) => (
              <div key={g.id}>
                <p>
                  {g.name} · {Math.round(personalProgress(g))}%
                </p>
                <div className="progress">
                  <i style={{ width: personalProgress(g) + "%" }} />
                </div>
              </div>
            ))}
          {data.goals.slice(0, 3).map((g) => (
            <p key={g.id}>
              {g.name} ·{" "}
              {Math.round(Math.min(100, (goalSaved(g) / g.target) * 100))}%{" "}
              {tr("recorded savings progress", "התקדמות חיסכון מתועדת")}
            </p>
          ))}
          {!life.personalGoals.length && !data.goals.length && (
            <p className="muted">
              {tr(
                "Add your first goal to connect today with your future.",
                "הוסיפו יעד ראשון כדי לחבר בין היום לעתיד.",
              )}
            </p>
          )}
        </article>
        <article className="panel">
          <h3>{tr("Financial reminders", "תזכורות כלכליות")}</h3>
          {day.entries
            .filter((e) =>
              ["reminder", "payment", "subscription"].includes(e.type),
            )
            .map((e) => (
              <p key={e.key}>
                {e.title} ·{" "}
                {e.done
                  ? tr("Recorded / completed", "תועד / הושלם")
                  : tr("Pending", "ממתין")}
              </p>
            ))}
          {!day.entries.some((e) =>
            ["reminder", "payment", "subscription"].includes(e.type),
          ) && (
            <p className="muted">
              {tr(
                "No financial reminders today.",
                "אין תזכורות כלכליות להיום.",
              )}
            </p>
          )}
        </article>
      </div>
    </section>
  );
}
export function LifeHome(
  props: LifeProps & {
    finance: React.ReactNode;
    recent: React.ReactNode;
    periodControl?: React.ReactNode;
    onQuick: (key: string) => void;
  },
) {
  const { data, now, onSave, busy, onNavigate, onEdit, onQuick } = props,
    he = data.profile.language === "he",
    tr = (en: string, h: string) => (he ? h : en),
    life = lifeOf(data),
    [optimisticPrefs, setOptimisticPrefs] = useState<
      typeof life.preferences | null
    >(null),
    [preferenceError, setPreferenceError] = useState(""),
    prefs = optimisticPrefs ?? life.preferences,
    today = dateKey(now),
    [customizing, setCustomizing] = useState(false);
  const day = useMemo(() => smartDay(data, today), [data, today]),
    upcoming = data.shifts
      .filter((s) => s.scheduled && s.end && Date.parse(s.end) > now.getTime())
      .sort((a, b) => Date.parse(a.start) - Date.parse(b.start)),
    next = upcoming[0];
  const primaryGoal =
    data.goals.find((g) => g.id === prefs.primarySavingsGoalId) ??
    data.goals.find((g) => goalSaved(g) < g.target) ??
    data.goals[0];
  const pay = useMemo(
    () => monthlyPayroll(data, props.month, now),
    [data, props.month, now],
  );
  const payments = useMemo(
    () =>
      plannerEntries(
        data,
        today,
        dateKey(
          new Date(Number(today.slice(0, 4)), Number(today.slice(5, 7)), 0),
        ),
      ).filter(
        (e) =>
          ["payment", "subscription", "reminder"].includes(e.type) && !e.done,
      ),
    [data, today],
  );
  const labels: Record<string, string> = {
    smart: tr("Smart Day", "היום החכם"),
    finance: tr("Financial overview", "תמונת הכסף"),
    work: tr("Work & salary", "עבודה ושכר"),
    savings: tr("Savings", "חיסכון"),
    goals: tr("Active goals", "יעדים פעילים"),
    payments: tr("Upcoming payments", "תשלומים קרובים"),
    insights: tr("Insights", "תובנות"),
    recent: tr("Recent transactions", "תנועות אחרונות"),
  };
  const actions: Record<string, string> = {
    transaction: tr("Transaction", "תנועה"),
    shift: tr("Shift", "משמרת"),
    task: tr("Task", "משימה"),
    event: tr("Event", "אירוע"),
    goal: tr("Goal", "יעד"),
  };
  const money = (n: number) =>
    new Intl.NumberFormat(he ? "he-IL" : "en-US", {
      style: "currency",
      currency: data.profile.currency,
      maximumFractionDigits: 2,
    }).format(n);
  const savePreferences = async (nextPrefs: typeof prefs) => {
    if (busy) return;
    setOptimisticPrefs(nextPrefs);
    setPreferenceError("");
    const saved = await onSave({
      ...data,
      life: { ...life, preferences: nextPrefs },
    });
    setOptimisticPrefs(null);
    if (!saved)
      setPreferenceError(
        tr(
          "Preferences could not be saved. Please try again.",
          "לא ניתן לשמור את ההעדפות. נסו שוב.",
        ),
      );
  };
  const legacyDefaultOrder = [
    "finance",
    "smart",
    "work",
    "savings",
    "goals",
    "payments",
    "insights",
    "recent",
  ];
  const preferredOrder =
    prefs.widgets.join(",") === legacyDefaultOrder.join(",")
      ? ([
          "work",
          "finance",
          "savings",
          "smart",
          "goals",
          "payments",
          "insights",
          "recent",
        ] as const)
      : prefs.widgets;
  const allOrdered = [
    ...preferredOrder,
    ...widgetIds.filter((id) => !prefs.widgets.includes(id)),
  ];
  const primaryWidget = (id: string) =>
    ["work", "finance", "savings", "smart"].includes(id);
  const order = [
    ...allOrdered.filter(primaryWidget),
    ...allOrdered.filter((id) => !primaryWidget(id)),
  ];
  const move = (id: (typeof widgetIds)[number], delta: number) => {
    const next = [...order],
      index = next.indexOf(id),
      other = index + delta;
    if (
      other < 0 ||
      other >= next.length ||
      primaryWidget(next[index]) !== primaryWidget(next[other])
    )
      return;
    [next[index], next[other]] = [next[other], next[index]];
    savePreferences({ ...prefs, widgets: next });
  };
  const widgets: Record<(typeof widgetIds)[number], React.ReactNode> = {
    finance: (
      <>
        <div className="home-period">{props.periodControl}</div>
        {props.finance}
      </>
    ),
    smart: (
      <article className="panel ocean-tasks">
        <div className="panel-heading">
          <h2>{tr("Today’s tasks", "המשימות להיום")}</h2>
          <button
            className="text-button"
            onClick={() => onNavigate?.("planner")}
          >
            {tr("Full planner", "לתכנון המלא")}
            <ChevronLeft size={16} />
          </button>
        </div>
        {day.entries
          .filter((e) => e.type === "task")
          .slice(0, 3)
          .map((e) => (
            <div className="life-mini-row" key={e.key}>
              <button
                className="icon-button task-check"
                disabled={busy}
                aria-label={tr("Complete task ", "סימון משימה ") + e.title}
                aria-pressed={e.done}
                onClick={() =>
                  void onSave({
                    ...data,
                    life: {
                      ...life,
                      tasks: life.tasks.map((task) =>
                        task.id === e.id
                          ? toggleTask(task, today, new Date().toISOString())
                          : task,
                      ),
                    },
                  })
                }
              >
                <Check size={16} />
              </button>
              <span className={e.done ? "completed-task" : ""}>{e.title}</span>
              <small>{e.time ?? tr("All day", "כל היום")}</small>
            </div>
          ))}
        {!day.total && (
          <p className="muted">
            {tr(
              "A little room for what matters. Add your first task for today.",
              "מקום למה שחשוב לך. הוסיפו משימה ראשונה להיום.",
            )}
          </p>
        )}
        <button
          className="text-button"
          onClick={() => onEdit({ kind: "task", date: today })}
        >
          <Plus size={16} />
          {tr("Add task", "הוספת משימה")}
        </button>
      </article>
    ),
    work: (
      <article className="panel ocean-next-shift">
        <span className="ocean-feature-icon">
          <CalendarDays size={27} />
        </span>
        <div className="grow">
          <span className="eyebrow">
            {tr("Your next shift", "המשמרת הבאה שלך")}
          </span>
          {next ? (
            <>
              <h2>
                {data.workplaces.find((w) => w.id === next.workplaceId)?.name}
              </h2>
              <p className="ocean-shift-date">
                {new Date(next.start).toLocaleDateString(
                  he ? "he-IL" : "en-US",
                  { weekday: "short", day: "numeric", month: "short" },
                )}{" "}
                ·{" "}
                <bdi>
                  {new Date(next.start).toLocaleTimeString(
                    he ? "he-IL" : "en-US",
                    { hour: "2-digit", minute: "2-digit", hour12: false },
                  )}{" "}
                  –{" "}
                  {new Date(next.end!).toLocaleTimeString(
                    he ? "he-IL" : "en-US",
                    { hour: "2-digit", minute: "2-digit", hour12: false },
                  )}
                </bdi>
              </p>
              <small>
                {tr("Estimated gross", "ברוטו משוער")}:{" "}
                {money(pay.byShift[next.id]?.gross ?? 0)}
              </small>
            </>
          ) : (
            <>
              <h2>{tr("Make room for your next step", "מקום לצעד הבא שלך")}</h2>
              <p className="muted">
                {tr(
                  "No upcoming shift has been planned.",
                  "לא נשמרה משמרת עתידית.",
                )}
              </p>
            </>
          )}
        </div>
        <button
          className="icon-button"
          aria-label={tr("Open work", "פתיחת העבודה")}
          onClick={() => onNavigate?.("shifts")}
        >
          {he ? <ChevronLeft size={22} /> : <ChevronRight size={22} />}
        </button>
      </article>
    ),
    savings: (
      <article className="panel ocean-main-goal">
        <div className="panel-heading">
          <span className="eyebrow">
            {tr("Your main savings goal", "יעד החיסכון המרכזי שלך")}
          </span>
          <Target size={24} />
        </div>
        {primaryGoal ? (
          <>
            <h2>{primaryGoal.name}</h2>
            <div className="flex-between">
              <strong>
                {Math.min(
                  100,
                  Math.round(
                    (goalSaved(primaryGoal) / primaryGoal.target) * 100,
                  ),
                )}
                %
              </strong>
              <span className="ocean-goal-amounts">
                <bdi>{money(goalSaved(primaryGoal))}</bdi>
                <span aria-hidden="true"> / </span>
                <bdi>{money(primaryGoal.target)}</bdi>
              </span>
            </div>
            <div
              className="progress"
              role="progressbar"
              aria-label={primaryGoal.name}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.min(
                100,
                Math.round((goalSaved(primaryGoal) / primaryGoal.target) * 100),
              )}
            >
              <i
                style={{
                  width:
                    Math.min(
                      100,
                      (goalSaved(primaryGoal) / primaryGoal.target) * 100,
                    ) + "%",
                }}
              />
            </div>
          </>
        ) : (
          <>
            <h2>
              {tr("Something worth saving for", "משהו ששווה לחסוך בשבילו")}
            </h2>
            <p className="muted">
              {tr(
                "Choose a goal. Make it yours, one step at a time.",
                "בחרו יעד משלכם. מתקדמים אליו צעד אחר צעד.",
              )}
            </p>
          </>
        )}
        <button className="text-button" onClick={() => onNavigate?.("goals")}>
          {tr("Open savings", "פתיחת החיסכון")}
          <ArrowUpRight size={16} />
        </button>
      </article>
    ),
    goals: (
      <article className="panel">
        <h3>{tr("Active goals", "יעדים פעילים")}</h3>
        {life.personalGoals
          .filter((g) => !g.completedAt)
          .slice(0, 4)
          .map((g) => (
            <p key={g.id}>
              {g.name} · {Math.round(personalProgress(g))}%
            </p>
          ))}
        {!life.personalGoals.some((g) => !g.completedAt) && (
          <p className="muted">
            {tr("No active personal goals.", "אין יעדים אישיים פעילים.")}
          </p>
        )}
        <button className="secondary" onClick={() => onNavigate?.("goals")}>
          {tr("My goals", "היעדים שלי")}
        </button>
      </article>
    ),
    payments: (
      <article className="panel">
        <h3>
          {tr("Upcoming payments & reminders", "תשלומים ותזכורות קרובים")}
        </h3>
        {payments.slice(0, 5).map((e) => (
          <p key={e.key}>
            {e.title} · {e.date}
          </p>
        ))}
        {!payments.length && (
          <p className="muted">
            {tr(
              "No unconfirmed payments recorded for the rest of this month.",
              "אין תשלומים שלא אושרו להמשך החודש.",
            )}
          </p>
        )}
        <button
          className="secondary"
          onClick={() => onNavigate?.("subscriptions")}
        >
          {tr("Manage recurring payments", "ניהול תשלומים חוזרים")}
        </button>
      </article>
    ),
    insights: <InsightsPanel data={data} month={props.month} now={now} />,
    recent: (
      <article className="panel">
        <h3>{tr("Recent transactions", "תנועות אחרונות")}</h3>
        {props.recent}
        <button
          className="secondary"
          onClick={() => onNavigate?.("transactions")}
        >
          {tr("All transactions", "כל התנועות")}
        </button>
      </article>
    ),
  };
  return (
    <div className="life-home">
      <div className="life-home-intro">
        <div>
          <p className="eyebrow">
            {new Date(today + "T12:00:00").toLocaleDateString(
              he ? "he-IL" : "en-US",
              {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
              },
            )}
          </p>
          <h1>
            {he
              ? `שלום${data.profile.name ? " " + data.profile.name : ""}, זה היום שלך.`
              : `Hello${data.profile.name ? " " + data.profile.name : ""}. Make today yours.`}
          </h1>
          <p className="muted">הכסף שלך. העתיד שלך.</p>
        </div>
        <button
          className="icon-button"
          aria-label={tr("Customize dashboard", "התאמת הבית")}
          onClick={() => setCustomizing(true)}
        >
          <SlidersHorizontal />
        </button>
      </div>
      <div className="life-widget-grid">
        {order
          .filter(
            (id) =>
              !prefs.hidden.includes(id) &&
              ["work", "finance", "savings", "smart"].includes(id),
          )
          .map((id) => (
            <section
              className={"life-widget widget-" + id}
              data-widget={id}
              key={id}
            >
              {widgets[id]}
            </section>
          ))}
      </div>
      <section className="ocean-actions-section">
        <h2>{tr("Quick actions", "פעולות מהירות")}</h2>
        <div className="life-quick-actions">
          {prefs.actions.map((a) => {
            const Icon = {
              transaction: Wallet,
              shift: Clock3,
              task: Check,
              event: CalendarDays,
              goal: Target,
            }[a];
            return (
              <button
                key={a}
                aria-label={
                  a === "transaction"
                    ? tr("Add transaction", "הוספת תנועה")
                    : undefined
                }
                onClick={() => onQuick(a)}
              >
                <Icon size={22} />
                <span>{actions[a]}</span>
              </button>
            );
          })}
        </div>
      </section>
      {order.some(
        (id) =>
          !prefs.hidden.includes(id) &&
          !["work", "finance", "savings", "smart"].includes(id),
      ) && (
        <details className="ocean-more-widgets">
          <summary>{tr("More from your day", "עוד מהיום שלך")}</summary>
          <div className="life-widget-grid">
            {order
              .filter(
                (id) =>
                  !prefs.hidden.includes(id) &&
                  !["work", "finance", "savings", "smart"].includes(id),
              )
              .map((id) => (
                <section
                  className={"life-widget widget-" + id}
                  data-widget={id}
                  key={id}
                >
                  {widgets[id]}
                </section>
              ))}
          </div>
        </details>
      )}
      {prefs.hidden.length === widgetIds.length && (
        <article className="panel">
          <p>
            {tr(
              "All widgets are hidden. Restore your dashboard anytime.",
              "כל הרכיבים מוסתרים. אפשר לשחזר את הבית בכל רגע.",
            )}
          </p>
          <button
            className="primary"
            onClick={() => savePreferences({ ...prefs, hidden: [] })}
          >
            {tr("Restore widgets", "שחזור רכיבים")}
          </button>
        </article>
      )}
      {customizing && (
        <Modal
          title={tr("Make SAVIO yours", "הבית שלך, בדרך שלך")}
          onClose={() => setCustomizing(false)}
        >
          {preferenceError && <p role="alert">{preferenceError}</p>}
          <p className="muted">
            {tr(
              "Changes are saved on this device. Arrange the daily cards and optional extras within their groups. Additional widgets stay in the expandable overview.",
              "השינויים נשמרים במכשיר. סדרו את כרטיסי היום ואת התוספות בתוך הקבוצות שלהם. הרכיבים הנוספים נשארים באזור הנפתח.",
            )}
          </p>
          {order.map((id, i) => (
            <div className="life-widget-control" key={id}>
              <label className="checkbox">
                <input
                  type="checkbox"
                  checked={!prefs.hidden.includes(id)}
                  disabled={busy}
                  onChange={() =>
                    savePreferences({
                      ...prefs,
                      hidden: prefs.hidden.includes(id)
                        ? prefs.hidden.filter((x) => x !== id)
                        : [...prefs.hidden, id],
                    })
                  }
                />
                {labels[id]}
              </label>
              <button
                className="icon-button"
                aria-label={tr("Move up ", "הזזה למעלה ") + labels[id]}
                disabled={
                  busy ||
                  i === 0 ||
                  primaryWidget(id) !== primaryWidget(order[i - 1])
                }
                onClick={() => move(id, -1)}
              >
                <ArrowUp size={18} />
              </button>
              <button
                className="icon-button"
                aria-label={tr("Move down ", "הזזה למטה ") + labels[id]}
                disabled={
                  busy ||
                  i === order.length - 1 ||
                  primaryWidget(id) !== primaryWidget(order[i + 1])
                }
                onClick={() => move(id, 1)}
              >
                <ArrowDown size={18} />
              </button>
            </div>
          ))}
          <label className="field">
            <span>{tr("Primary savings goal", "יעד חיסכון מרכזי")}</span>
            <select
              aria-label={tr("Primary savings goal", "יעד חיסכון מרכזי")}
              value={prefs.primarySavingsGoalId ?? ""}
              disabled={busy}
              onChange={(e) =>
                savePreferences({
                  ...prefs,
                  primarySavingsGoalId: e.target.value || null,
                })
              }
            >
              <option value="">
                {tr("First active savings goal", "יעד החיסכון הפעיל הראשון")}
              </option>
              {data.goals.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </label>
          <h3>{tr("Quick actions", "פעולות מהירות")}</h3>
          {actionIds.map((a) => (
            <label className="checkbox" key={a}>
              <input
                type="checkbox"
                disabled={busy}
                checked={prefs.actions.includes(a)}
                onChange={() =>
                  savePreferences({
                    ...prefs,
                    actions: prefs.actions.includes(a)
                      ? prefs.actions.filter((x) => x !== a)
                      : [...prefs.actions, a],
                  })
                }
              />
              {actions[a]}
            </label>
          ))}
          <label className="field">
            <span>{tr("Preferred opening screen", "מסך פתיחה מועדף")}</span>
            <select
              aria-label={tr("Preferred opening screen", "מסך פתיחה מועדף")}
              value={prefs.home}
              disabled={busy}
              onChange={(e) =>
                savePreferences({
                  ...prefs,
                  home: e.target.value as typeof prefs.home,
                })
              }
            >
              {(
                [
                  "overview",
                  "smart",
                  "planner",
                  "shifts",
                  "transactions",
                  "goals",
                ] as const
              ).map((tab) => (
                <option key={tab} value={tab}>
                  {he
                    ? {
                        overview: "בית",
                        smart: "היום החכם",
                        planner: "תכנון",
                        shifts: "עבודה",
                        transactions: "כסף",
                        goals: "יעדים",
                      }[tab]
                    : tab}
                </option>
              ))}
            </select>
          </label>
          <button
            className="secondary full"
            disabled={busy}
            onClick={() =>
              savePreferences({
                ...prefs,
                widgets: [
                  "work",
                  "finance",
                  "savings",
                  "smart",
                  "goals",
                  "payments",
                  "insights",
                  "recent",
                ],
                hidden: [],
                actions: ["transaction", "shift", "task"],
                home: "overview",
                primarySavingsGoalId: null,
              })
            }
          >
            {tr("Restore dashboard defaults", "שחזור ברירות המחדל של הבית")}
          </button>
        </Modal>
      )}
    </div>
  );
}
