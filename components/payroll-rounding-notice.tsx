export function PayrollRoundingNotice({
  he,
  adjustmentMinor,
}: {
  he: boolean;
  adjustmentMinor: number;
}) {
  if (!adjustmentMinor) return null;
  return (
    <p className="small muted" role="note">
      {he
        ? "מדיניות עיגול: הסיכום מחבר את האגורות המעוגלות של המשמרות. סיכום מחושב ישן עשוי להיות שונה באגורות; הרשומות ואומדני המשמרות לא שוכתבו."
        : "Rounding policy: totals add rounded shift cents. An older calculated summary may differ by cents; saved records and full-shift estimates were not rewritten."}
    </p>
  );
}
