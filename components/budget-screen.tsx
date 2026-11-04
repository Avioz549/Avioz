"use client";
import { useState } from "react";
import {
  Plus,
  Pencil,
  Utensils,
  Car,
  ShoppingBag,
  House,
  Heart,
  Wallet,
  Gift,
} from "lucide-react";
import { monthTransactions, type FinanceData } from "@/lib/finance";
import { categoryLabel } from "@/lib/categories";
import { ProgressRing } from "./progress-ring";
import { Field, Modal } from "./ui";
export function BudgetScreen({
  data,
  month,
  categories,
  money,
  onSave,
  busy,
}: {
  data: FinanceData;
  month: string;
  categories: string[];
  money: (n: number) => string;
  onSave: (d: FinanceData) => Promise<boolean | undefined>;
  busy: boolean;
}) {
  const he = data.profile.language === "he",
    tr = (en: string, heb: string) => (he ? heb : en),
    [editing, setEditing] = useState<string | null>(null),
    [error, setError] = useState("");
  const rows = categories.map((category) => ({
    category,
    budget:
      data.budgets[month + ":" + category] ??
      data.budgets["default:" + category] ??
      0,
    spent: monthTransactions(data.transactions, month)
      .filter((t) => t.kind === "expense" && t.category === category)
      .reduce((n, t) => n + t.amount, 0),
  }));
  const relevant = rows.filter((r) => r.budget > 0 || r.spent > 0);
  const budget = rows.reduce((n, r) => n + r.budget, 0),
    spent = rows.reduce((n, r) => n + r.spent, 0),
    remaining = budget ? Math.max(0, ((budget - spent) / budget) * 100) : 0;
  const icons = [Utensils, Car, ShoppingBag, House, Heart, Wallet, Gift];
  return (
    <div className="reference-budgets">
      <section className="budget-overview">
        <ProgressRing value={remaining}>
          <strong>{budget ? Math.round(remaining) + "%" : "—"}</strong>
          <span>{tr("Remaining this month", "נותרו מהתקציב החודשי")}</span>
        </ProgressRing>
        <p className="budget-ratio">
          <strong>{money(spent)}</strong>
          <span> / {money(budget)}</span>
        </p>
        <small>
          {budget
            ? tr(
                "Based on recorded expenses and this month’s category limits",
                "לפי ההוצאות המתועדות והתקציבים לחודש הנבחר",
              )
            : tr(
                "Set your monthly budget to see your progress",
                "הגדירו תקציב חודשי כדי לראות התקדמות",
              )}
        </small>
      </section>
      <div className="budget-category-list">
        {relevant.map((row, i) => {
          const Icon = icons[i % icons.length];
          const percentage = row.budget
            ? Math.min(100, (row.spent / row.budget) * 100)
            : 100;
          return (
            <article className="budget-category-card" key={row.category}>
              <span className="budget-category-icon">
                <Icon size={23} />
              </span>
              <div className="grow">
                <div className="flex-between">
                  <h3>{categoryLabel(row.category, he)}</h3>
                  <button
                    className="icon-button"
                    aria-label={
                      tr("Edit budget ", "עריכת תקציב ") + row.category
                    }
                    onClick={() => {
                      setEditing(row.category);
                      setError("");
                    }}
                  >
                    <Pencil size={15} />
                  </button>
                </div>
                <p>
                  {money(row.spent)} <span>/ {money(row.budget)}</span>
                </p>
                <div
                  className={
                    "progress " + (row.spent > row.budget ? "over-budget" : "")
                  }
                >
                  <i style={{ width: percentage + "%" }} />
                </div>
                <small>
                  {row.budget
                    ? Math.round((row.spent / row.budget) * 100) + "%"
                    : tr("No limit set", "לא הוגדרה מסגרת")}
                </small>
              </div>
            </article>
          );
        })}
      </div>
      <button
        className="primary full"
        onClick={() => {
          setEditing("");
          setError("");
        }}
      >
        <Plus size={18} />
        {tr("Set category budget", "הגדרת תקציב לקטגוריה")}
      </button>
      {editing !== null && (
        <Modal
          title={tr("Monthly category budget", "תקציב חודשי לקטגוריה")}
          onClose={() => setEditing(null)}
        >
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              const category = String(f.get("category")),
                limit = Number(f.get("limit"));
              if (
                await onSave({
                  ...data,
                  budgets: { ...data.budgets, [month + ":" + category]: limit },
                })
              )
                setEditing(null);
              else
                setError(
                  tr(
                    "Could not save. Reload if another tab changed your records.",
                    "לא ניתן לשמור. רעננו אם הנתונים שונו בלשונית אחרת.",
                  ),
                );
            }}
          >
            <Field label={tr("Category", "קטגוריה")}>
              <select name="category" defaultValue={editing || categories[0]}>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {categoryLabel(c, he)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={tr("Monthly budget", "תקציב חודשי")}>
              <input
                name="limit"
                type="number"
                min="0"
                max="1000000000"
                step=".01"
                required
                defaultValue={
                  rows.find((r) => r.category === editing)?.budget ?? 0
                }
              />
            </Field>
            {error && (
              <p className="notice" role="alert">
                {error}
              </p>
            )}
            <button className="primary full" disabled={busy}>
              {tr("Save", "שמירה")}
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
}
