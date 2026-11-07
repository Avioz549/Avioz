"use client";
import { Plus, Pencil, Trash2, Check, Target } from "lucide-react";
import { lifeOf, personalProgress } from "@/lib/life";
import { recordGoalCompletion as withCompletion } from "@/lib/life";
import { ProgressRing } from "../progress-ring";
import type { LifeProps } from "./types";
export function PersonalGoalsScreen({
  data,
  busy,
  onSave,
  onEdit,
  onNavigate,
}: LifeProps) {
  const he = data.profile.language === "he",
    tr = (en: string, h: string) => (he ? h : en),
    life = lifeOf(data);
  return (
    <section className="life-personal-goals">
      <div className="life-section-head">
        <div>
          <span className="eyebrow">LIFE GOALS</span>
          <h2>{tr("Your next chapter", "הפרק הבא שלך")}</h2>
        </div>
        <button
          className="primary"
          onClick={() => onEdit({ kind: "personal-goal" })}
        >
          <Plus size={18} />
          {tr("New personal goal", "יעד אישי חדש")}
        </button>
      </div>
      {!life.personalGoals.length && (
        <div className="panel empty">
          <Target size={40} />
          <h3>{tr("More than a number", "יותר ממספר")}</h3>
          <p>
            {tr(
              "Build a habit, finish a project or learn something new. Savings goals remain separate above.",
              "בונים הרגל, מסיימים פרויקט או לומדים משהו חדש. יעדי החיסכון נשמרים בנפרד למעלה.",
            )}
          </p>
        </div>
      )}
      <div className="life-goal-grid">
        {life.personalGoals.map((g) => {
          const progress = personalProgress(g),
            tasks = life.tasks.filter((t) => t.goalId === g.id);
          return (
            <article className="panel life-goal-card" key={g.id}>
              <div className="flex-between">
                <span className="pill">
                  {tr(
                    g.kind,
                    { personal: "אישי", habit: "הרגל", custom: "מותאם אישית" }[
                      g.kind
                    ],
                  )}{" "}
                  · {g.category}
                </span>
                <div className="button-row">
                  <button
                    className="icon-button"
                    aria-label={tr("Edit goal ", "עריכת יעד ") + g.name}
                    onClick={() => onEdit({ kind: "personal-goal", value: g })}
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    className="icon-button"
                    disabled={busy}
                    aria-label={tr("Delete goal ", "מחיקת יעד ") + g.name}
                    onClick={() => {
                      if (
                        confirm(
                          tr(
                            "Delete this goal and its history? Linked tasks will be kept and unlinked.",
                            "למחוק את היעד וההיסטוריה שלו? משימות קשורות יישמרו וינותקו מהיעד.",
                          ),
                        )
                      )
                        void onSave({
                          ...data,
                          life: {
                            ...life,
                            personalGoals: life.personalGoals.filter(
                              (x) => x.id !== g.id,
                            ),
                            tasks: life.tasks.map((t) =>
                              t.goalId === g.id ? { ...t, goalId: null } : t,
                            ),
                          },
                        });
                    }}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              <h3>{g.name}</h3>
              <div className="life-goal-progress">
                <ProgressRing value={progress} size={128}>
                  <strong>{Math.round(progress)}%</strong>
                </ProgressRing>
                <div>
                  <strong>
                    {g.milestones.length
                      ? `${g.milestones.filter((m) => m.doneAt).length} / ${g.milestones.length}`
                      : `${g.history.reduce((n, h) => n + h.amount, 0)} / ${g.target}`}
                  </strong>
                  <span>
                    {g.milestones.length
                      ? tr("milestones", "אבני דרך")
                      : g.unit}
                  </span>
                  <small>
                    {g.deadline ?? tr("No deadline", "ללא מועד יעד")}
                  </small>
                </div>
              </div>
              <div className="button-row">
                <button
                  className="secondary"
                  onClick={() => onEdit({ kind: "goal-progress", value: g })}
                >
                  {tr("Record progress", "רישום התקדמות")}
                </button>
                <button
                  className="secondary"
                  onClick={() => onEdit({ kind: "milestone", value: g })}
                >
                  {tr("Add milestone", "הוספת אבן דרך")}
                </button>
              </div>
              {g.milestones.length > 0 && (
                <p className="small muted">
                  {tr(
                    "Progress is measured by milestone completion. Numeric progress is retained in history.",
                    "ההתקדמות נמדדת לפי השלמת אבני דרך. התקדמות מספרית נשמרת בהיסטוריה.",
                  )}
                </p>
              )}
              {g.milestones.map((m) => (
                <div className="life-milestone" key={m.id}>
                  <button
                    className="icon-button task-check"
                    aria-pressed={Boolean(m.doneAt)}
                    aria-label={
                      tr("Toggle milestone ", "סימון אבן דרך ") + m.title
                    }
                    disabled={busy}
                    onClick={() => {
                      const updated = withCompletion({
                        ...g,
                        milestones: g.milestones.map((x) =>
                          x.id === m.id
                            ? {
                                ...x,
                                doneAt: x.doneAt
                                  ? null
                                  : new Date().toISOString(),
                              }
                            : x,
                        ),
                      });
                      void onSave({
                        ...data,
                        life: {
                          ...life,
                          personalGoals: life.personalGoals.map((x) =>
                            x.id === g.id ? updated : x,
                          ),
                        },
                      });
                    }}
                  >
                    <Check size={18} />
                  </button>
                  <span>{m.title}</span>
                  <button
                    className="icon-button"
                    aria-label={
                      tr("Edit milestone ", "עריכת אבן דרך ") + m.title
                    }
                    onClick={() =>
                      onEdit({ kind: "milestone", value: g, milestoneId: m.id })
                    }
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    className="icon-button"
                    aria-label={
                      tr("Delete milestone ", "מחיקת אבן דרך ") + m.title
                    }
                    disabled={busy}
                    onClick={() => {
                      if (confirm(tr("Delete milestone?", "למחוק אבן דרך?")))
                        void onSave({
                          ...data,
                          life: {
                            ...life,
                            personalGoals: life.personalGoals.map((x) =>
                              x.id === g.id
                                ? withCompletion({
                                    ...g,
                                    milestones: g.milestones.filter(
                                      (y) => y.id !== m.id,
                                    ),
                                  })
                                : x,
                            ),
                          },
                        });
                    }}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
              <button
                className="text-button"
                onClick={() => onNavigate?.("planner")}
              >
                {tasks.length}{" "}
                {tr(
                  "related tasks · open planner",
                  "משימות קשורות · פתיחת התכנון",
                )}
              </button>
              <details>
                <summary>
                  {tr(
                    "Progress & completion history",
                    "היסטוריית התקדמות והשלמות",
                  )}
                </summary>
                {g.history.map((h) => (
                  <div className="flex-between" key={h.id}>
                    <span>
                      {h.date} · +{h.amount} {g.unit} · {h.note}
                    </span>
                    <button
                      className="icon-button"
                      aria-label={tr(
                        "Delete progress entry",
                        "מחיקת רישום התקדמות",
                      )}
                      disabled={busy}
                      onClick={() => {
                        if (
                          confirm(
                            tr(
                              "Delete this progress entry?",
                              "למחוק רישום התקדמות זה?",
                            ),
                          )
                        )
                          void onSave({
                            ...data,
                            life: {
                              ...life,
                              personalGoals: life.personalGoals.map((x) =>
                                x.id === g.id
                                  ? withCompletion({
                                      ...g,
                                      history: g.history.filter(
                                        (y) => y.id !== h.id,
                                      ),
                                    })
                                  : x,
                              ),
                            },
                          });
                      }}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
                {(
                  g.completionHistory ?? (g.completedAt ? [g.completedAt] : [])
                ).map((stamp, i) => (
                  <p className="positive" key={stamp + i}>
                    {tr("Completed", "הושלם")} ·{" "}
                    {new Date(stamp).toLocaleString(he ? "he-IL" : "en-US")}
                  </p>
                ))}
                {!g.history.length && !g.completedAt && (
                  <p className="muted">
                    {tr(
                      "No recorded progress yet.",
                      "עדיין אין התקדמות מתועדת.",
                    )}
                  </p>
                )}
              </details>
            </article>
          );
        })}
      </div>
    </section>
  );
}
