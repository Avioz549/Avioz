# SAVIO 3.0 — complete upgrade package

This release extends the existing Next.js application; it does not replace the workspace or introduce accounts/cloud storage. No new runtime libraries or paid services were added.

## Implemented functionality

- Five persisted themes with previews, device appearance observation and reduced-motion support.
- Workplace payroll agreements: existing daily tiers plus optional weekly threshold/rate/week start, accumulation across same-day shifts, Saturday automation, manually flagged holidays, night clock window/rate and selectable premium/overtime combination (multiply, maximum or additive). Higher daily/weekly overtime wins; higher Saturday/holiday premium wins. Existing workplaces retain their original per-shift calculation until advanced rules are enabled.
- Timestamp-based live work, pause/resume, paid/unpaid breaks and focus/background recovery. Multiple workplaces, manual/edit/delete flows, tips, travel reimbursement and notes. Active shifts can be edited without forcing them to end. Future manual entries require the scheduled flag.
- Scheduled shifts with forecasts, live home earnings, monthly worked/scheduled hours, gross estimates, recorded received income and previous-month comparisons. A month-end forecast requires remaining scheduled shifts whose end time has not passed; expired unconfirmed plans do not consume weekly thresholds or inflate forecasts. no invented historical extrapolation.
- Monthly work calendar: month navigation, date selection, add-on-date, click to edit, per-day earnings, weekly/monthly summaries and indicators for worked, active, planned, Saturday and manually flagged holiday shifts. Monthly pay allocation includes shifts starting in a previous month and preceding-week context.
- Transaction CRUD, custom categories, search, analytics and CSV retained. Optional income-to-shift linking does not post an estimate or duplicate income. A projected recurring occurrence is explicitly labeled expected, excluded from balance/analytics and confirmed received/paid only on user action. Confirmation creates one nonrecurring occurrence and preserves the original series. Existing raw records are not deleted or rewritten.
- Savings withdrawals, chronological overdraft protection, existing contributions, plans, dates and user-chosen income saving share. Shift projections use actual completed-shift gross and that share, with an honest unavailable state otherwise. Withdrawals do not count as contribution achievements.
- Monthly/category budgets, remaining/overspend indicators and budget history. The existing financial reminder calendar, challenges and purchase-hours calculator remain available.
- Local insights for actual income/spending trends, hours, workplace earnings, savings and budget usage. A functional local chat supports earnings, spending/categories, saving capacity and shifts needed for an amount; it labels deterministic calculations and sends no data externally. Optional server AI preserves per-request consent and falls back locally on failure. No live provider credentials are included.
- Five-step Hebrew/English guide with back/next/skip, saved completion and a permanent settings entry.
- Four report families: monthly salary, shift history, income/expenses and savings progress. CSV exports neutralize formula prefixes and use UTF-8 BOM; browser print/PDF uses native Hebrew/RTL rendering. PDF is the browser's Save as PDF flow, not a server upload.
- Versioned JSON backup/restore, validation, explicit review, ten-version local recovery and non-destructive merge. Merge preserves current preferences, deduplicates identical IDs and blocks the entire operation on conflicting records, budgets, duplicate active shifts or invalid ledgers.
- Updated generic offline shell and an update-available notice. API responses and financial records are not placed in a public service-worker cache. Records remain in the existing IndexedDB database.

## Data safety and compatibility

New fields are optional. Old local V2 records, V3 snapshots and V3 JSON backups remain readable. New exports use envelope schema version 4 so older apps reject an unsupported file instead of silently dropping tips, policies, withdrawals or category settings. No database deletion or destructive migration is required. Original V2 localStorage is retained and compare-and-swap revisions still prevent stale-tab writes.

Keep a private JSON export before deployment and before changing origins/devices. Refresh old tabs after the upgrade; do not downgrade the application with newer records. Storage is neither permanent nor encrypted. On-device recovery versions are not a separate backup. Browser/site-data deletion removes them too.

Recurring cash flow semantics intentionally changed: a later virtual occurrence is expected rather than received. This may lower a previously projected dashboard balance until confirmed. It does not remove saved records or change original amounts.

## Payroll conventions and limits

All amounts are estimates before deductions. The total includes recorded tips and travel reimbursements and is not a certified taxable-pay base, guaranteed net salary or complete Israeli payslip. Verify your employment agreement when setting policies. Existing imported `legacyGross` values remain frozen until that shift is edited, at which point the editor warns about recalculation.

Calendar and payroll civil boundaries follow the device timezone used by the existing application. UTC timestamps preserve instants; changing the device timezone can change day/week/month attribution. Elapsed time uses timestamps across DST. Total unpaid breaks are allocated proportionally across civil/rate boundaries because old records do not contain exact break intervals; no fabricated break timestamps are inferred. Weekly totals in the monthly calendar include only days visible in that month; salary threshold calculations still consider preceding-week records.

Saturday is a local calendar Saturday when enabled; holidays must be explicitly flagged. No automatic religious-holiday calendar, Friday-sunset rule, tax/net engine, automatic bank reconciliation, exchange-rate conversion, push scheduler or cloud synchronization is claimed. Night-rate windows are clock based and do not infer statutory entitlements. Forecasts are conditional on schedules; saving-share projections use gross before deductions and should be configured conservatively.

## Verification and screenshots

See `VERIFICATION.md` for executed checks. `screenshots/upgrade/` contains actual mobile Chromium screenshots for the themes and reports, generated using isolated saved QA records. Normal installations contain no seeded balances. The original eight-screen capture suite is retained and rerun.

Physical iPhone Safari/PWA installation and OS notification delivery, live AI/Redis integration and the final hosted Vercel deployment require external verification. Browser emulation does not establish those results.
