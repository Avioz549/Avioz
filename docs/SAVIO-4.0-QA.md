# SAVIO 4.0 verification and release record

## Source

Repository: `Avioz549/Avioz`. Development branch: `savio-4.0`.

Started from local `84849e523f9c2ee58ddcd7626f7de9fee2a704c0`, including the Phase 1 reliability work. Remote production source `savio-3.0` was `3bc758d9fc4de04ab9851ab28a4e93c47782e998`, an ancestor of that local commit. `main` is an unrelated earlier landing-page branch and is not the established Vercel production branch. No local work was discarded.

## Executed checks

- `npm run typecheck`: passed.
- `npm run lint`: passed, zero warnings.
- `npm test`: 65 passed, zero failed.
- `TZ=Asia/Jerusalem npm test`: 65 passed, zero failed.
- `npm run build`: passed; Next.js production build and public-only offline asset generation succeeded (29 JS/CSS assets).
- `npm run test:e2e`: 43 passed, zero failed (final full run, 1.5 minutes).
- `git diff --check`: passed.

All browser tests use isolated Chromium contexts and synthetic QA records. No production user data was read or written. Tests exercise actual UI forms, IndexedDB and downloads, not a fake persistence implementation. Notification permission/delivery and the waiting-update registration are deliberately stubbed in their respective policy/interaction tests; real operating-system delivery and real Vercel rollover need live/device verification.

Coverage includes original financial CRUD/CSV/budgets/savings/recurrences; payroll cents, overnight/premium/break/weekly thresholds and cross-month allocations; overlap cancellation/confirmation; guide deep links; idle midnight, wake and timezone changes; unknown-field preservation; stale-tab CAS; complete Life-data backup/restore; invalid restore nonmutation; immutable pre-upgrade snapshots/history; downgrade rejection; planner recurrence/shared shifts; goals/milestones/habits; subscriptions and forecast confirmation; work targets/payslips; personalized dashboard controls; recap explicit export/share; all new modules offline including unvisited lazy chunks; five themes; Hebrew RTL; widths 320/360/390/430; runtime-error capture. The final additions passed and test safe waiting updates during unsaved editing and planned-shift expiry without financial writes.

## Data migration gates

Four dedicated migration cases plus legacy storage/browser tests pass. The same IndexedDB database adds separate v4 stores atomically, retaining original stores and migration source. Backup format 5 round-trips all types and opaque fields; 3/4/legacy inputs remain supported. Different same-ID records and unknown-field conflicts block merges. Financial amounts and historical records are not silently rewritten. See [migration details](SAVIO-4.0.md#storage-and-compatibility).

## Visual inspection

Screenshots are generated only after lazy screen content becomes visible. Hebrew mobile screenshots were reviewed for Home, Planner, Goals, Insights and Recap. The browser layout matrix checks every new route across all five themes and narrow iPhone-size viewports. Other screenshots are available in [screenshots/v4](screenshots/v4). Full-page captures include the fixed bottom navigation at the viewport position; this is expected for a fixed mobile control.

## Production verification limitation

The environment's enforced outbound policy currently excludes `savio-offline.vercel.app` and `api.github.com`. A supported network configuration draft has been saved with those exact domains added; it requires environment Review/Save and Publish. A direct production health probe failed at the CONNECT proxy with HTTP 403 (`curl` status 000), before contacting Vercel. This is not evidence that the app itself is failing.

Production completion must not be asserted without a successful HTTP health response showing version `4.0.0` and the deployed Git SHA, followed by live application checks. Git pushes alone do not verify Vercel. No new Vercel project should be created. The existing configured `savio-3.0` Git integration is the established release path.

## Known limits

- No physical iPhone/Safari/device installation test was available; Chromium mobile emulation passed. Background reminder delivery is not guaranteed and is labeled accordingly.
- Local browser storage is not encrypted/permanent/synchronized. Keep JSON backups; keep the same origin.
- Historical goal completion timestamps are not invented. Old goals only enter completion recaps when completion is explicitly recorded.
- Calendar event times currently stay within a single day. Repeating item edits/deletion apply to the series.
- AI remains the existing optional server-side feature; no provider connection or paid service was added. Deterministic local coaching/Smart Day work without it.
- A pre-4.0 JavaScript/database client cannot write to the upgraded database. Rollbacks must retain the compatible reader; an ordinary old-bundle rollback is not a supported data downgrade.

## Files in this upgrade

- `app/api/health/route.ts`
- `app/layout.tsx`
- `app/life.css`
- `components/app-update.tsx`
- `components/backup-manager.tsx`
- `components/life/analytics.tsx`
- `components/life/editor.tsx`
- `components/life/goals.tsx`
- `components/life/home.tsx`
- `components/life/money.tsx`
- `components/life/planner.tsx`
- `components/life/types.ts`
- `components/life/work.tsx`
- `components/savio.tsx`
- `components/settings-screen.tsx`
- `components/user-guide.tsx`
- `docs/SAVIO-4.0-QA.md`
- `docs/SAVIO-4.0.md`
- `docs/screenshots/v4/README.md`
- `docs/screenshots/v4/goals.png`
- `docs/screenshots/v4/home-dark.png`
- `docs/screenshots/v4/home-light.png`
- `docs/screenshots/v4/home-midnight.png`
- `docs/screenshots/v4/home-purple.png`
- `docs/screenshots/v4/home-system.png`
- `docs/screenshots/v4/insights.png`
- `docs/screenshots/v4/planner.png`
- `docs/screenshots/v4/recap.png`
- `docs/screenshots/v4/shifts.png`
- `docs/screenshots/v4/smart.png`
- `docs/screenshots/v4/subscriptions.png`
- `lib/finance.ts`
- `lib/life-model.ts`
- `lib/life.ts`
- `lib/merge.ts`
- `lib/payroll.ts`
- `lib/storage.ts`
- `lib/use-app-clock.ts`
- `lib/use-life-reminders.ts`
- `next.config.ts`
- `package-lock.json`
- `package.json`
- `public/offline-assets.json`
- `public/sw.js`
- `scripts/build-pwa.mjs`
- `scripts/service-worker.template.js`
- `tests/browser/app.spec.ts`
- `tests/browser/foundation.spec.ts`
- `tests/browser/life-v4.spec.ts`
- `tests/life.test.ts`
- `tests/migration-v4.test.ts`
- `tests/storage.test.ts`
