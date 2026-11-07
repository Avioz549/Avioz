"use client";
import { useState, useMemo } from "react";
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Trash2,
  Check,
  CalendarDays,
} from "lucide-react";
import {
  lifeOf,
  plannerEntries,
  dateRange,
  shiftDate,
  toggleTask,
  taskOccurrences,
} from "@/lib/life";
import { dateKey } from "@/lib/payroll";
import type { LifeProps } from "./types";
export function PlannerScreen({
  data,
  now,
  busy,
  onSave,
  onEdit,
  onShift,
  onNavigate,
}: LifeProps) {
  const he = data.profile.language === "he",
    tr = (en: string, h: string) => (he ? h : en),
    life = lifeOf(data),
    today = dateKey(now),
    [selected, setSelected] = useState(today),
    [view, setView] = useState<"day" | "week" | "month">("day"),
    [filter, setFilter] = useState("all"),
    [category, setCategory] = useState("all"),
    [search, setSearch] = useState(""),
    [notice, setNotice] = useState("");
  const [y, m] = selected.slice(0, 7).split("-").map(Number),
    weekStart = shiftDate(selected, -new Date(selected + "T12:00:00").getDay());
  const from =
      view === "day"
        ? selected
        : view === "week"
          ? weekStart
          : selected.slice(0, 7) + "-01",
    to =
      view === "day"
        ? selected
        : view === "week"
          ? shiftDate(weekStart, 6)
          : dateKey(new Date(y, m, 0));
  const entries = useMemo(
      () => plannerEntries(data, from, to),
      [data, from, to],
    ),
    categories = [...new Set(entries.map((e) => e.category))];
  const rows = entries.filter(
    (e) =>
      (filter === "all" || e.type === filter) &&
      (category === "all" || e.category === category) &&
      e.title.toLowerCase().includes(search.toLowerCase()),
  );
  const dates = dateRange(from, to),
    offset = view === "month" ? new Date(from + "T12:00:00").getDay() : 0;
  const move = (delta: number) => {
    if (view === "month") setSelected(dateKey(new Date(y, m - 1 + delta, 1)));
    else setSelected(shiftDate(selected, delta * (view === "week" ? 7 : 1)));
  };
  const remove = async (type: string, id: string) => {
    if (
      !confirm(
        tr(
          "Delete this series and its completion history?",
          "למחוק סדרה זו ואת היסטוריית ההשלמות שלה?",
        ),
      )
    )
      return;
    await onSave({
      ...data,
      life: {
        ...life,
        tasks:
          type === "task" ? life.tasks.filter((t) => t.id !== id) : life.tasks,
        events:
          type === "event"
            ? life.events.filter((e) => e.id !== id)
            : life.events,
      },
    });
  };
  const edit = (type: string, id: string) => {
    if (type === "task") {
      const value = life.tasks.find((t) => t.id === id);
      if (value) onEdit({ kind: "task", value });
    } else if (type === "event") {
      const value = life.events.find((t) => t.id === id);
      if (value) onEdit({ kind: "event", value });
    } else if (type === "shift") {
      const s = data.shifts.find((s) => s.id === id);
      if (s) onShift?.(s);
    } else if (type === "subscription") onNavigate?.("subscriptions");
    else onNavigate?.(type === "reminder" ? "calendar" : "transactions");
  };
  const renderEntry = (entry: (typeof rows)[number]) => (
    <article
      className={"life-agenda-row " + (entry.done ? "is-done" : "")}
      key={entry.key}
    >
      {entry.type === "task" ? (
        <button
          className="icon-button task-check"
          aria-label={tr("Toggle task ", "סימון משימה ") + entry.title}
          aria-pressed={entry.done}
          disabled={busy}
          onClick={() => {
            const task = life.tasks.find((t) => t.id === entry.id)!;
            void onSave({
              ...data,
              life: {
                ...life,
                tasks: life.tasks.map((t) =>
                  t.id === task.id
                    ? toggleTask(t, entry.date, new Date().toISOString())
                    : t,
                ),
              },
            });
          }}
        >
          <Check size={18} />
        </button>
      ) : (
        <span className="life-entry-icon">
          <CalendarDays size={18} />
        </span>
      )}
      <button
        className="life-entry-body"
        onClick={() => edit(entry.type, entry.id)}
      >
        <strong>{entry.title}</strong>
        <small>
          {entry.date} · {entry.time ?? tr("All day", "כל היום")} ·{" "}
          {tr(
            entry.type,
            (
              {
                task: "משימה",
                event: "אירוע",
                shift: "משמרת",
                reminder: "תזכורת",
                payment: "תשלום",
                subscription: "מנוי",
              } as Record<string, string>
            )[entry.type],
          )}{" "}
          {entry.priority === "high"
            ? " · " + tr("High priority", "עדיפות גבוהה")
            : ""}
        </small>
        {entry.notes && <small>{entry.notes}</small>}
      </button>
      {["task", "event"].includes(entry.type) && (
        <>
          <button
            className="icon-button"
            aria-label={tr("Edit ", "עריכת ") + entry.title}
            onClick={() => edit(entry.type, entry.id)}
          >
            <Pencil size={16} />
          </button>
          <button
            className="icon-button"
            disabled={busy}
            aria-label={tr("Delete ", "מחיקת ") + entry.title}
            onClick={() => void remove(entry.type, entry.id)}
          >
            <Trash2 size={16} />
          </button>
        </>
      )}
    </article>
  );
  const overdue = taskOccurrences(
    data,
    shiftDate(today, -30),
    shiftDate(today, -1),
  ).filter((t) => !t.done).length;
  return (
    <section className="life-planner">
      <div className="life-section-head">
        <div>
          <span className="eyebrow">SAVIO PLANNER</span>
          <h2>{tr("Make room for your life", "מקום לכל מה שחשוב")}</h2>
        </div>
        <div className="button-row">
          <button
            className="primary"
            onClick={() => onEdit({ kind: "task", date: selected })}
          >
            <Plus size={18} />
            {tr("New task", "משימה חדשה")}
          </button>
          <button
            className="secondary"
            onClick={() => onEdit({ kind: "event", date: selected })}
          >
            <Plus size={18} />
            {tr("New event", "אירוע חדש")}
          </button>
        </div>
      </div>
      <div
        className="life-segments"
        role="group"
        aria-label={tr("Calendar view", "תצוגת לוח")}
      >
        {(["day", "week", "month"] as const).map((v) => (
          <button key={v} aria-pressed={view === v} onClick={() => setView(v)}>
            {tr(v, { day: "יום", week: "שבוע", month: "חודש" }[v])}
          </button>
        ))}
      </div>
      <div className="life-calendar-toolbar">
        <button
          className="icon-button"
          aria-label={tr("Previous period", "תקופה קודמת")}
          onClick={() => move(-1)}
        >
          <ChevronRight />
        </button>
        <input
          aria-label={tr("Selected date", "תאריך נבחר")}
          type="date"
          value={selected}
          onChange={(e) => {
            if (e.target.value) setSelected(e.target.value);
          }}
        />
        <button
          className="icon-button"
          aria-label={tr("Next period", "תקופה הבאה")}
          onClick={() => move(1)}
        >
          <ChevronLeft />
        </button>
        <button className="secondary" onClick={() => setSelected(today)}>
          {tr("Today", "היום")}
        </button>
      </div>
      <details className="planner-filter-disclosure">
        <summary>{tr("Search & filters", "חיפוש וסינון")}</summary>{" "}
        <div className="life-filters">
          <input
            aria-label={tr("Search planner", "חיפוש בתכנון")}
            placeholder={tr("Search your plans…", "חיפוש בתכניות שלך…")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            aria-label={tr("Calendar filter", "סינון לוח")}
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            {[
              "all",
              "task",
              "event",
              "shift",
              "reminder",
              "payment",
              "subscription",
            ].map((f) => (
              <option key={f} value={f}>
                {he
                  ? (
                      {
                        all: "הכול",
                        task: "משימות",
                        event: "אירועים",
                        shift: "משמרות",
                        reminder: "תזכורות",
                        payment: "תשלומים",
                        subscription: "מנויים",
                      } as Record<string, string>
                    )[f]
                  : f}
              </option>
            ))}
          </select>
          <select
            aria-label={tr("Planner category", "קטגוריית תכנון")}
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="all">{tr("All categories", "כל הקטגוריות")}</option>
            {categories.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>
      </details>
      {overdue > 0 && (
        <p className="notice">
          {he
            ? `${overdue} משימות פתוחות שמועדן עבר ב־30 הימים האחרונים. ניתן לבחור תאריך ולסנן משימות.`
            : `${overdue} open task occurrences were due in the last 30 days. Select a date to review.`}
        </p>
      )}
      {view === "month" && (
        <div className="life-month-grid">
          {(he
            ? ["א׳", "ב׳", "ג׳", "ד׳", "ה׳", "ו׳", "ש׳"]
            : ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
          ).map((d) => (
            <span key={d}>{d}</span>
          ))}
          {Array.from({ length: offset }, (_, i) => (
            <span key={"gap" + i} />
          ))}
          {dates.map((date) => (
            <button
              aria-label={tr("Open date ", "פתיחת תאריך ") + date}
              aria-pressed={selected === date}
              key={date}
              onClick={() => {
                setSelected(date);
                setView("day");
              }}
            >
              <strong>{Number(date.slice(8))}</strong>
              <small>{rows.filter((e) => e.date === date).length || ""}</small>
              {rows.some((e) => e.date === date && e.type === "shift") && <i />}
            </button>
          ))}
        </div>
      )}
      <div className={"life-agenda " + (view === "week" ? "week-agenda" : "")}>
        {dates.map((date) => (
          <section className="panel life-day" key={date}>
            <div className="flex-between">
              <h3>
                {new Date(date + "T12:00:00").toLocaleDateString(
                  he ? "he-IL" : "en-US",
                  { weekday: "short", day: "numeric", month: "short" },
                )}
                {date === today ? " · " + tr("Today", "היום") : ""}
              </h3>
              <button
                className="icon-button"
                aria-label={tr("Add task on ", "הוספת משימה בתאריך ") + date}
                onClick={() => onEdit({ kind: "task", date })}
              >
                <Plus size={18} />
              </button>
            </div>
            {rows.filter((e) => e.date === date).map(renderEntry)}
            {!rows.some((e) => e.date === date) && (
              <p className="muted small">
                {tr("A little breathing room.", "זמן לנשום.")}
              </p>
            )}
          </section>
        ))}
      </div>
      <details className="planner-reminders">
        <summary>{tr("Planner reminders", "תזכורות לתכנון")}</summary>{" "}
        <article className="panel">
          <h3>{tr("Planner reminders", "תזכורות לתכנון")}</h3>
          <p className="small muted">
            {tr(
              "For tasks and events with a time: a reminder within 30 minutes while SAVIO is open. No guaranteed background delivery.",
              "למשימות ואירועים עם שעה: תזכורת בטווח 30 דקות כשהאפליקציה פתוחה. אין מסירה מובטחת ברקע.",
            )}
          </p>
          <button
            className="secondary"
            disabled={busy}
            onClick={async () => {
              if (!life.preferences.plannerReminders) {
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
                    plannerReminders: !life.preferences.plannerReminders,
                  },
                },
              });
            }}
          >
            {life.preferences.plannerReminders
              ? tr("Disable planner reminders", "כיבוי תזכורות תכנון")
              : tr("Enable planner reminders", "הפעלת תזכורות תכנון")}
          </button>
          {notice && <p role="status">{notice}</p>}
        </article>
      </details>

      <p className="small muted">
        {tr(
          "Shifts, payments and reminders come from their original records. Editing a repeating task or event updates its series. Times follow this device.",
          "משמרות, תשלומים ותזכורות מוצגים מהרשומות המקוריות. עריכת משימה או אירוע חוזר מעדכנת את הסדרה. השעות לפי המכשיר.",
        )}
      </p>
    </section>
  );
}
