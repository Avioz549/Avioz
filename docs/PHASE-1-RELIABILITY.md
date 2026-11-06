# SAVIO LIFE OS — Phase 1: foundation reliability

Scope: approved Phase 1 only, implemented locally on `savio-3.0`. No push, merge or Vercel deployment. No Planner, Smart Day, authentication, Supabase or paid-service work. Existing theme CSS, navigation layout and financial data models remain in place.

## Fixes

1. **Guide deep link:** add `guide` to the existing initial-tab whitelist. Both `/?tab=guide` and `/dashboard?tab=guide` survive reload; settings navigation and all existing tabs remain supported.
2. **Salary reconciliation:** preserve each full-shift gross estimate's existing half-up cent rounding. Allocate those canonical cents to chronological day/rate segments by largest remainder, with earlier segments winning ties. Sum integer minor units for day, week, workplace, month, forecast and report aggregates instead of independently rounding fractional-cent sums. Monthly salary CSV uses the same remaining-planned subset as the forecast; full-shift history keeps its explicitly labeled full-shift values.
3. **Overlapping completed shifts:** detect half-open interval overlaps at the same workplace, excluding the edited row, running shifts and scheduled shifts. Touching endpoints are allowed. Manual saves, edits and stopping a timer require an explicit native confirmation when completed rows overlap. Cancellation writes nothing. Existing overlapping rows aren't changed or deleted.
4. **Daily clock:** a shared hook updates at the next local midnight and checks timezone/offset changes at most once per minute while idle. Unchanged checks do not update React state. Visible running timers still tick each second. Hidden pages suspend the polling timer and refresh on visibility, focus or pageshow. Month selection follows the new current month only if the previous current month was selected; deliberately selected historical months stay selected.
5. **Opaque-field preservation:** serialized Zod objects keep unknown properties while retaining every existing known-field validator/refinement. Ordinary editors retain the original record and nested profile/policy/reminder metadata. IndexedDB saves retain opaque snapshot envelope fields. JSON restore/export and recovery retain unknown JSON-compatible fields. Backup merge carries incoming opaque workspace/profile fields and blocks conflicting opaque values. Removing a payroll policy containing unknown fields is rejected with an explanation, rather than silently discarding them. Computed recurring `projected` flags are explicitly omitted from newly confirmed occurrences.

## Rounding compatibility strategy — no data migration

No existing shift, transaction, `legacyGross`, wage setting or monetary input is automatically rewritten. The IndexedDB database remains `savio-local-v3`, version 1, with the same two stores and revision protocol; JSON exports remain envelope version 4 and imports still accept V3/V4 and supported legacy inputs.

The canonical full-shift gross keeps the previous rounding boundary. For the audit example, three one-minute shifts at 50/hour still each show **0.83**. Their monthly total is now **2.49**, matching the displayed/exported shift amounts, rather than independently rounding raw fractions to 2.50. A 0.83 shift split evenly at a month boundary allocates 0.42 to the earlier segment and 0.41 to the later segment: cents are never lost or duplicated.

Old _derived summaries_ can differ by cents after this correction. That is an intentional, documented calculation correction, not a rewrite of stored history. Work salary summaries and reports show a contextual rounding-policy explanation when the actual monthly aggregate differs from the previous method. Restoring an old backup needs no migration; it uses the same reconciliation policy. A downgrade would recalculate the old summaries again.

Imported frozen gross values remain frozen; no missing historical breakdown is invented. The pre-existing, explicit imported-shift editor warning still applies when a user chooses to edit that record and recalculate it. Historical workplace pay-policy versioning is not implemented in this phase.

## Files changed

- Payroll/rounding: `lib/money.ts` (new), `lib/payroll.ts`, `lib/insights.ts`, `components/production-suite.tsx`, `components/payroll-rounding-notice.tsx` (new).
- Navigation, clock and overlap: `components/savio.tsx`, `lib/time.ts`, `lib/use-app-clock.ts` (new), `lib/shift-overlap.ts` (new).
- Unknown-field preservation: `lib/finance.ts`, `lib/storage.ts`, `lib/merge.ts`, `components/settings-screen.tsx`, `components/financial-calendar.tsx`, plus original-record spreads in the main editors.
- Tests: `tests/foundation.test.ts` (new), `tests/storage.test.ts`, `tests/time.test.ts`, `tests/browser/foundation.spec.ts` (new).
- Documentation: this file.

## Verification

- TypeScript and strict ESLint passed; changed source/test formatting checked.
- Unit tests: **49 passed**, including 10 new cases. Also passed with `TZ=Asia/Jerusalem`.
- Production webpack build passed.
- Browser verification uses the production build on a fresh port-3100 server. Coverage includes both guide routes and reload/RTL, three-minute totals and two actual CSV downloads, overlap cancellation/confirmation including timer stop, month rollover, preserved historical selection, background/pageshow restoration, a real Chromium timezone override change, opaque metadata through normal editors, and the existing financial/storage/offline/theme workflows.
- Final complete browser run: **30 passed in 56.5 seconds** (22 existing workflows and 8 new Phase 1 workflows). Existing eight-screen captures were regenerated byte-for-byte unchanged; no CSS/theme files changed. Only final successful runs count; earlier harness failures (clock racing past midnight before navigation, inherited timezone override ownership and a reminder button locator) were corrected and rerun.

## Limits and release considerations

- Physical iPhone Safari/OS background behavior was not tested; Chromium emulation and lifecycle events do not establish physical-device results.
- The current app preserves unknown fields. Older deployed clients may still strip fields they do not understand. No incompatible schema change or old-client migration protocol was introduced here; all old tabs should be updated before any separately authorized release involving future model changes.
- Calendar/payroll civil dates still follow the device timezone. This phase refreshes date-dependent calculations when it changes; it does not introduce a fixed workplace timezone or rewrite timestamp history.
- Existing wage-policy edits can still affect calculated historical estimates; effective-dated pay agreements remain later work. No net-pay/tax engine was added.
- No live user browser records were accessed; all write tests use isolated fixtures. No public deployment or production behavior change is claimed.
