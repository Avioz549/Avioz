export function elapsedLabel(start: string, now: Date) {
  const seconds = Math.max(
    0,
    Math.floor((now.getTime() - Date.parse(start)) / 1000),
  );
  return [
    Math.floor(seconds / 3600),
    Math.floor(seconds / 60) % 60,
    seconds % 60,
  ]
    .map((n) => String(n).padStart(2, "0"))
    .join(":");
}

// Payroll month follows the same browser-local timezone used to display shifts.
export function localMonth(iso: string) {
  const date = new Date(iso);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

// Capture strings/offset now: Date getters on an old Date also use a newly
// selected device timezone, so comparing two Date getters misses zone changes.
export function clockSnapshot(date: Date) {
  return {
    day: date.toLocaleDateString("en-CA"),
    zone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    offset: date.getTimezoneOffset(),
  };
}
export function nextClockDelay(now: Date, ticking: boolean) {
  if (ticking) return 1000;
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  return Math.max(1, Math.min(60000, midnight.getTime() - now.getTime() + 1));
}
