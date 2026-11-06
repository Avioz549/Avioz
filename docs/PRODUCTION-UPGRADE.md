# Production upgrade — first-phase history

This document records the earlier theme-only delivery. The subsequent complete package is implemented and documented in [COMPLETE-UPGRADE.md](COMPLETE-UPGRADE.md); use that document and current VERIFICATION.md for release status.

## Phase 0: repository audit

The existing application is Next.js 16 / React 19 / TypeScript, Tailwind 4 and Recharts. App Router entry points are `/` and `/dashboard`; old authentication routes redirect to settings. `components/savio.tsx` coordinates the workspace, with dedicated dashboard, work, budgets, calendar, settings, backup and savings components. Three existing CSS layers implement the approved eight-screen identity.

`lib/finance.ts` validates all records with Zod. `lib/storage.ts` persists a validated workspace in IndexedDB using optimistic revisions, retains ten recovery versions and imports the original `savio-local-v1` copy without deleting it. JSON backups are versioned. Changing domains, deleting browser storage, or restoring a replacement backup can lose access to current local records; no production browser data can be inspected from this repository.

Working features include transaction CRUD/search/recurrences/CSV, configurable workplace daily overtime and premiums, timestamp-based shift timers with persisted pause/resume, goals/contributions/projections, budgets, reminder calendar, offline shell, JSON restore/recovery and optional consent-based server AI. No login or cloud storage is required.

Gaps relative to the new brief: weekly overtime and premium stacking need a new explicitly configured payroll engine; tips/travel/notes, scheduled shifts, salary forecasts, shift calendar, withdrawals, per-month budget history, comprehensive reports, supported-question local chat and five-step onboarding are not complete. Current gross estimates must not be presented as net pay or legal payroll certification.

## Phase 1: completed theme system

- Existing `dark` and `light` values remain valid; Premium Dark remains the fresh-install default. Existing explicit light preferences are preserved.
- Added Midnight Pro, Neon Purple and System preferences, saved through the existing validated IndexedDB commit path.
- Settings → עיצוב האפליקציה provides five immediate preview buttons with accessible selected state and saving protection. The profile select uses the same theme catalogue.
- System mode observes device appearance changes without reload; resolved theme updates browser theme color. Added navy/purple tokens, matching cards/navigation/controls and reduced-motion rules.
- No financial-record migration, new dependency, cloud service or production deployment.

Changed files: `lib/themes.ts`, `lib/finance.ts`, `components/savio.tsx`, `components/settings-screen.tsx`, `app/layout.tsx`, `app/approved.css`, `app/themes.css`; unit and browser coverage in `tests/themes.test.ts` and `tests/browser/themes.spec.ts`.

## Ordered continuation

1. Extend optional shift/workplace fields with defaults; preserve original backups and frozen legacy gross values. Add exhaustive payroll tests before integrating weekly thresholds, night/holiday policies and stacking. Define week start, local timezone and allocation across month boundaries explicitly.
2. Add tips/travel/notes and scheduled shifts, then integrate the central engine into live home earnings, monthly reports, forecasts and a shift calendar. Keep actual received transactions separate from estimates.
3. Add savings withdrawals with nonnegative-ledger validation, user-selected saving share and actual-history shift projections; monthly budget history and custom category management.
4. Add deterministic supported-question chat, five-step guide, report exports and safe optional backup merging with collision review.
5. Run all financial, storage and browser checks after each phase; inspect all themes at mobile widths and on physical iPhone Safari/PWA before release. Production deployment requires a separate authorized action; this brief prohibits automatic deployment.

Physical iPhone behavior and full contrast across every chart/decorative gradient still require manual review. No claim of a complete production upgrade is made for this first incremental phase.

## Phase 1 verification

- `npm run typecheck`: passed.
- `npm run lint`: passed with zero warnings.
- `npm test`: passed all six test files (27 test definitions); includes theme schema compatibility and system resolution alongside financial/storage tests.
- `npm run build`: passed, production webpack build.
- `npm run test:e2e`: all 16 Chromium browser tests passed. New coverage verifies all five preview controls, persisted selection after reload, live system preference changes and mobile overflow. Existing migration, backup/restore, timer, financial, offline and RTL checks also passed.
- Eight-screen screenshot suite reran; updated settings and contact sheet reflect the new design settings label. Theme contrast on a physical device is not claimed as verified.

Changes are committed locally only. No automatic deployment or remote push was performed for this phase.
