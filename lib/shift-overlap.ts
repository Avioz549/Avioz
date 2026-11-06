import type { Shift } from "./finance";
// Half-open intervals: ending exactly when another shift starts is allowed.
// Scheduled and running records aren't completed shifts. Editing excludes self.
export function overlappingCompletedShifts(candidate: Shift, shifts: Shift[]) {
  if (!candidate.end || candidate.scheduled) return [];
  const start = Date.parse(candidate.start),
    end = Date.parse(candidate.end);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start)
    return [];
  return shifts
    .filter(
      (s) =>
        s.id !== candidate.id &&
        s.workplaceId === candidate.workplaceId &&
        s.end &&
        !s.scheduled &&
        start < Date.parse(s.end) &&
        Date.parse(s.start) < end,
    )
    .sort(
      (a, b) =>
        Date.parse(a.start) - Date.parse(b.start) || a.id.localeCompare(b.id),
    );
}
