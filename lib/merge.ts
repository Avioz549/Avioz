import { dataSchema, type FinanceData } from "./finance";
const canonical = (v: unknown): string =>
  JSON.stringify(v, function (k, value) {
    return value && typeof value === "object" && !Array.isArray(value)
      ? Object.fromEntries(
          Object.entries(value).sort(([a], [b]) => a.localeCompare(b)),
        )
      : value;
  });

function mergeOpaqueFields(
  current: Record<string, unknown>,
  incoming: Record<string, unknown>,
  known: object,
) {
  const extra: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(incoming)) {
    if (Object.hasOwn(known, key)) continue;
    if (
      Object.hasOwn(current, key) &&
      canonical(current[key]) !== canonical(value)
    )
      throw new Error("Conflicting unknown field: " + key);
    Object.defineProperty(extra, key, {
      value,
      enumerable: true,
      configurable: true,
      writable: true,
    });
  }
  return extra;
}
// Same ID + different content is a conflict, never a silent overwrite.
function mergeRows<T extends { id: string }>(
  current: T[],
  incoming: T[],
  scope: string,
): T[] {
  const all = new Map(current.map((r) => [r.id, r]));
  for (const row of incoming) {
    const old = all.get(row.id);
    if (old && canonical(old) !== canonical(row))
      throw new Error(`Conflicting record in ${scope}: ${row.id}`);
    if (!old) all.set(row.id, row);
  }
  return [...all.values()];
}
export function mergeBackups(
  current: FinanceData,
  incoming: FinanceData,
): FinanceData {
  const budgets = { ...current.budgets };
  for (const [key, value] of Object.entries(incoming.budgets)) {
    if (key in budgets && budgets[key] !== value)
      throw new Error("Conflicting budget: " + key);
    budgets[key] = value;
  }
  return dataSchema.parse({
    ...current,
    ...mergeOpaqueFields(current, incoming, dataSchema.shape),
    profile: {
      ...current.profile,
      ...mergeOpaqueFields(
        current.profile,
        incoming.profile,
        dataSchema.shape.profile.shape,
      ),
    },
    transactions: mergeRows(
      current.transactions,
      incoming.transactions,
      "transactions",
    ),
    workplaces: mergeRows(
      current.workplaces,
      incoming.workplaces,
      "workplaces",
    ),
    shifts: mergeRows(current.shifts, incoming.shifts, "shifts"),
    goals: mergeRows(current.goals, incoming.goals, "goals"),
    reminders: mergeRows(current.reminders, incoming.reminders, "reminders"),
    budgets,
    customCategories: [
      ...new Set([
        ...(current.customCategories ?? []),
        ...(incoming.customCategories ?? []),
      ]),
    ],
  });
}
