# SAVIO 4.0

This release extends the existing application; it is not a replacement project. It descends from local reliability commit `84849e5`, which includes work not previously pushed to the remote production branch (`3bc758d`). No authentication, cloud storage, telemetry or paid dependencies were added.

## Using the application

The five mobile tabs are Home, Money, Work, Planner and Goals. The header menu (desktop sidebar) exposes Smart Day, Subscriptions, Budgets, the original Financial Calendar, Insights, Monthly Recap, SAVIO AI, Challenges, Settings and the user guide. Old `?tab=` links, including `?tab=guide`, remain supported.

- **Home:** local name/date, existing financial dashboard and charts, Smart Day, expected work earnings, next scheduled shift, savings, active personal goals, payments, insights and recent transactions. Customize the dashboard to reorder/hide/restore widgets, select quick actions and choose the opening screen. Hiding a widget never deletes its records.
- **Work Pro:** existing timer, pauses, manual/overnight shifts, workplaces, configurable payroll agreements, completed/planned shift calendars and reports remain available. Weekly planning, monthly paid-hour/gross targets, required-shift estimates, overtime/premium components, previous-month comparisons and manually entered payslip comparisons extend them. Gross estimates never become received income automatically. Payslip “checked” means checked by the user, not verified by SAVIO or an employer.
- **Money Pro:** existing transactions, categories, budgets, recurring entries and exports remain. Cash-flow forecasts label confirmed versus projected amounts; subscriptions support weekly/monthly/yearly renewals, pausing and explicit occurrence confirmation. Confirmation records a stable occurrence reference, including when its payment date is later edited. Deleting a subscription retains confirmed transactions.
- **Planner:** daily, weekly and monthly views; tasks/events; date/category/type/search filters; priorities, notes, deadlines and recurring series. Shifts are the original work records, not copies. Each recurring task occurrence has its own completion timestamp. Editing/deleting a repeating item applies to its series. Events currently run within one calendar day.
- **Smart Day:** actual shifts, tasks, appointments, upcoming deadlines, reminders and progress; explicit overdue/priority recommendations and task completion percentage. No external AI is involved.
- **Goals:** original savings goals/contributions/withdrawals/calculators plus personal, habit and custom goals, categories, progress entries, deadlines, milestones, linked tasks and recorded completion history. Habit check-ins are limited to one per device-local date. New savings completions are explicitly recorded; no historical completion date is invented for old goals.
- **Insights:** six-month gross earnings, paid hours, actual income/expenses, savings movements, task/goal completions; budget/spending analytics and current goal progress. Empty data remains empty.
- **Recap:** selected-month hours, gross estimate, actual income/expenses, savings movements, recorded task/goal completions and prior-month differences. Text/CSV export and native sharing require an explicit click. Nothing is published automatically.
- **Personalization:** five existing themes, Hebrew RTL and English LTR, local display name and profile preferences; dashboard preferences are persisted in IndexedDB and included in backups.

## Storage and compatibility

IndexedDB keeps its existing database name `savio-local-v3`. Database version 2 adds `workspace-v4`, `history-v4` and `migrations`. Original `workspace` and `history` stores are neither deleted nor subsequently rewritten. The first successful load validates and atomically copies the original snapshot into the new workspace, preserving IDs, financial amounts, unknown record/envelope fields and revision. The immutable `v4-source` migration record retains the original snapshot (or original V2 localStorage JSON). The V2 localStorage source is retained too.

Existing workspaces need not acquire new default fields during migration: `life` is optional and its empty defaults are read virtually. New records use the validated `life.version: 1` extension. Unknown fields are accepted and retained. An invalid/colliding extension aborts migration instead of removing it. The recovery export can still read the original workspace when no new workspace exists.

Saves continue to use revision compare-and-swap and an atomic ten-save recovery history. Different records sharing IDs block the entire backup merge. Unknown-field conflicts block rather than silently overwrite. Current preferences win a merge; compatible unknown preference fields are retained. Explicit reviewed restore can replace the workspace, retaining the previous save in recovery history.

JSON backup schema is now 5; versions 3 and 4 and supported legacy/raw exports remain importable. All new data, preferences and unknown fields are included. Settings can export the preserved pre-4.0 source separately. Returning to an old version-1 client after migration is deliberately blocked by IndexedDB; do not simply roll back the production bundle. Keep the current compatible reader or provide an explicit reviewed export/conversion first.

Browser data is device/origin specific, neither permanent nor encrypted. Production deploys cannot access an individual's browser records. Preservation has been tested on seeded legacy databases; it is not a claim that a particular user's device has already migrated. Keep the same production origin and encourage private JSON backups.

## Payroll

The existing central payroll engine and Phase 1 cent rounding remain authoritative. Shift/month/report totals still reconcile, including three one-minute shifts at 50/hour = 0.83 each, 2.49 total. The engine now also exposes cent-allocated base/overtime/premium components; Work Pro does not implement a second payroll formula. Frozen imported historical gross values remain unchanged and their historical component breakdown is not invented. Salary settings remain user-configurable; no universal Israeli overtime assumption was added.

## Offline and updates

The production build generates a per-build service worker and public code-asset manifest. All UI chunks, including initially unvisited lazy modules, are precached for offline navigation. API endpoints and financial data are not cached. IndexedDB remains the only financial-record store. Updates wait for explicit safe refresh; refresh is blocked while an editor is open/saving. Closing all old tabs may be required to finish a blocked database upgrade.

Shift/planner notifications are opt-in and generic: no private record titles or amounts. Delivery is checked while the app is open and on foregrounding, within 30 minutes; a once-per-occurrence marker prevents duplicates. Background delivery is not guaranteed. Physical iPhone installation, Safari and operating-system delivery need device verification; Chromium emulation is not a substitute.

## Deployment

Use existing GitHub repository `Avioz549/Avioz` and existing Vercel project `savio-offline`. The established production branch in the supplied Vercel configuration is `savio-3.0`, not the unrelated `main` landing-page branch. Before pushing, recheck the remote tip and retain the local reliability ancestor. `vercel.json` keeps Next.js, `npm ci`, `npm run build`. No new secrets are required for local modules. Existing optional AI remains server-side and consent-controlled; absent a configured provider, deterministic insights remain available.

After all gates pass, push the tested source through the established production branch. Verify `https://savio-offline.vercel.app/api/health` returns version `4.0.0` and the exact deployed Git SHA, then check the live root/mobile navigation. A successful push is not deployment verification. This environment currently needs its prepared network-domain draft published before production/GitHub API HTTP verification can run.

## Verification

See `SAVIO-4.0-QA.md` for final commands/results and the deployment gate. Screenshots in `screenshots/v4/` use isolated QA records, never bundled sample balances or production user records.
