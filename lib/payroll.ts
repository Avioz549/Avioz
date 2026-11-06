import type { FinanceData, Shift, Workplace } from "./finance";
// Device-local civil dates are deliberate: UTC timestamps preserve instants,
// calendar/payroll boundaries follow the local timezone displayed by the app.
import {
  roundMoney,
  sumMoney,
  allocateMinorUnits,
  toMinorUnits,
} from "./money";
export { roundMoney } from "./money";
export function dateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
function weekKey(d: Date, start: number) {
  const copy = new Date(d);
  copy.setHours(12, 0, 0, 0);
  copy.setDate(copy.getDate() - ((copy.getDay() - start + 7) % 7));
  return dateKey(copy);
}
export type PaySegment = {
  shiftId: string;
  workplaceId: string;
  date: string;
  week: string;
  hours: number;
  gross: number;
  unroundedGross: number;
  scheduled: boolean;
};
export type PayResult = {
  hours: number;
  gross: number;
  wages: number;
  tips: number;
  travel: number;
};
const zero = (): PayResult => ({
  hours: 0,
  gross: 0,
  wages: 0,
  tips: 0,
  travel: 0,
});
export function calculatePayroll(
  shifts: Shift[],
  workplaces: Workplace[],
  now = new Date(),
) {
  const byShift: Record<string, PayResult> = {},
    segments: PaySegment[] = [];
  const weekly = new Map<string, number>(),
    daily = new Map<string, number>();
  const ordered = [...shifts].sort(
    (a, b) =>
      Date.parse(a.start) - Date.parse(b.start) || a.id.localeCompare(b.id),
  );
  for (const s of ordered) {
    const w = workplaces.find((w) => w.id === s.workplaceId);
    if (!w) continue;
    const start = Date.parse(s.start);
    const end = s.end
      ? Date.parse(s.end)
      : s.pauseStartedAt && !s.paidBreak
        ? Math.min(Date.parse(s.pauseStartedAt), now.getTime())
        : now.getTime();
    const result = zero();
    byShift[s.id] = result;
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start)
      continue;
    const elapsed = (end - start) / 3600000;
    const hours = Math.max(
      0,
      elapsed - (s.paidBreak ? 0 : s.breakMinutes / 60),
    );
    const ratio = hours / elapsed;
    // The original model stores total break minutes, not individual intervals.
    // Allocate these proportionally across civil boundaries, never invent times.
    let cursor = start,
      shiftHours = 0;
    const localSegments: PaySegment[] = [];
    while (cursor < end) {
      const current = new Date(cursor),
        boundary = new Date(cursor);
      boundary.setHours(24, 0, 0, 0);
      const p = w.policy;
      let stop = Math.min(end, boundary.getTime());
      for (const hour of p ? [p.nightStart, p.nightEnd] : []) {
        const edge = new Date(cursor);
        edge.setHours(hour, 0, 0, 0);
        if (edge.getTime() > cursor) stop = Math.min(stop, edge.getTime());
      }
      const partHours = ((stop - cursor) / 3600000) * ratio;
      const date = dateKey(current),
        week = weekKey(current, p?.weekStart ?? 0);
      const scope = "workspace";
      const wk = `${scope}:${w.id}:${week}`,
        dk = `${scope}:${w.id}:${date}`;
      const weeklyBefore = weekly.get(wk) ?? 0;
      const dailyBefore = p?.dailyAcrossShifts
        ? (daily.get(dk) ?? 0)
        : shiftHours;
      // Integrate at exact daily/weekly thresholds. Daily and weekly overtime
      // use the higher multiplier; premiums combine by explicit workplace policy.
      const cuts = [
        0,
        partHours,
        w.regularHours - dailyBefore,
        w.regularHours + w.overtimeHours - dailyBefore,
        ...(p ? [p.weeklyHours - weeklyBefore] : []),
      ]
        .filter((h) => h >= 0 && h <= partHours)
        .sort((a, b) => a - b);
      let wages = 0;
      for (let i = 1; i < cuts.length; i++) {
        const a = cuts[i - 1],
          b = cuts[i];
        if (b <= a) continue;
        const dailyHours = dailyBefore + (a + b) / 2;
        const dr =
          dailyHours < w.regularHours
            ? 1
            : dailyHours < w.regularHours + w.overtimeHours
              ? w.overtimeRate
              : w.extraRate;
        const wr =
          p && weeklyBefore + (a + b) / 2 > p.weeklyHours ? p.weeklyRate : 1;
        const overtime = Math.max(dr, wr);
        const night =
          p &&
          (p.nightStart < p.nightEnd
            ? current.getHours() >= p.nightStart &&
              current.getHours() < p.nightEnd
            : current.getHours() >= p.nightStart ||
              current.getHours() < p.nightEnd);
        const premiums = [
          s.premium || (p?.saturday && current.getDay() === 6)
            ? w.premiumRate
            : 1,
          s.holiday ? (p?.holidayRate ?? w.premiumRate) : 1,
          night ? p!.nightRate : 1,
        ];
        const premium = Math.max(...premiums); // Saturday and holiday don't double one another.
        const multiplier =
          p?.combination === "maximum"
            ? Math.max(overtime, premium)
            : p?.combination === "add"
              ? overtime + premium - 1
              : overtime * premium;
        wages += (b - a) * w.wage * multiplier;
      }
      const share =
        hours > 0 ? partHours / hours : (stop - cursor) / (end - start);
      const tips = (s.tips ?? 0) * share,
        travel = (s.travel ?? 0) * share;
      const gross =
        s.legacyGross !== undefined
          ? s.legacyGross * share
          : wages + tips + travel;
      localSegments.push({
        shiftId: s.id,
        workplaceId: w.id,
        date,
        week,
        hours: partHours,
        gross,
        unroundedGross: gross,
        scheduled: Boolean(s.scheduled),
      });
      result.hours += partHours;
      result.wages += wages;
      result.tips += tips;
      result.travel += travel;
      result.gross += gross;
      weekly.set(wk, weeklyBefore + partHours);
      daily.set(dk, (daily.get(dk) ?? 0) + partHours);
      shiftHours += partHours;
      cursor = stop;
    }
    // Keep the full-shift amount identical to the previous calculation, then
    // distribute its cents instead of independently rounding month/day totals.
    result.gross = roundMoney(result.gross);
    const allocated = allocateMinorUnits(
      result.gross,
      localSegments.map((part) => part.gross),
    );
    localSegments.forEach((part, index) => {
      part.gross = allocated[index];
    });
    segments.push(...localSegments);
    result.wages = roundMoney(result.wages);
  }
  return { byShift, segments };
}
export function calculateShift(
  shift: Shift,
  workplace: Workplace,
  now = new Date(),
) {
  return (
    calculatePayroll([shift], [workplace], now).byShift[shift.id] ?? zero()
  );
}
export function monthlyPayroll(
  data: FinanceData,
  month: string,
  now = new Date(),
) {
  const actual = calculatePayroll(
    data.shifts.filter((s) => !s.scheduled),
    data.workplaces,
    now,
  );
  const remaining = data.shifts.filter(
    (s) => s.scheduled && s.end && Date.parse(s.end) > now.getTime(),
  );
  const expired = data.shifts.filter(
    (s) => s.scheduled && s.end && Date.parse(s.end) <= now.getTime(),
  );
  const projected = calculatePayroll(
    [...data.shifts.filter((s) => !s.scheduled), ...remaining],
    data.workplaces,
    now,
  );
  const archived = calculatePayroll(expired, data.workplaces, now);
  const ledger = {
    byShift: {
      ...actual.byShift,
      ...archived.byShift,
      ...Object.fromEntries(
        remaining.map((s) => [s.id, projected.byShift[s.id]]),
      ),
    },
    segments: [
      ...actual.segments,
      ...archived.segments,
      ...projected.segments.filter((s) => s.scheduled),
    ],
  };
  const rows = ledger.segments.filter((s) => s.date.startsWith(month));
  const earned = rows.filter((s) => !s.scheduled),
    planned = rows.filter(
      (s) => s.scheduled && remaining.some((shift) => shift.id === s.shiftId),
    );
  const sum = (items: PaySegment[], key: "gross" | "hours") =>
    key === "gross"
      ? sumMoney(items.map((s) => s.gross))
      : items.reduce((n, s) => n + s.hours, 0);
  const gross = roundMoney(sum(earned, "gross")),
    scheduled = roundMoney(sum(planned, "gross"));
  return {
    ...ledger,
    gross,
    hours: sum(earned, "hours"),
    scheduled,
    forecast: sumMoney([gross, scheduled]),
    roundingAdjustmentMinor:
      toMinorUnits(gross) -
      toMinorUnits(earned.reduce((n, s) => n + s.unroundedGross, 0)),
    monthlyPlanned: planned,
    scheduledHours: sum(planned, "hours"),
    hasSchedule: planned.length > 0,
  };
}
