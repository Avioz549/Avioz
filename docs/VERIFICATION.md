# SAVIO 3.0 verification

Current checks run in the managed workspace on 4 November 2026, Node 24 / npm 11:

- Locked dependency installation: `npm ci` completed successfully.
- TypeScript route generation and checks: passed.
- Strict Next.js ESLint: passed with zero warnings.
- Unit suite: 25 executed tests passed, including persisted unpaid pause/resume salary invariance. Includes existing finance/legacy regression tests plus IndexedDB migration preserving V2 copies, concurrent CAS rejection, ten-version retention/recovery, malformed-data preservation, backup roundtrips, failed-write non-mutation and AI no-consent data minimization.
- Production Next.js build: passed, with no Supabase/auth runtime dependency.
- Production dependency audit: zero known vulnerabilities reported.
- Chromium tests exercise real records, editing/export, overnight shifts, breaks, timers across reload, goal contributions, undated goals, purchase calculations, budgets, reminders/challenges, five mobile tabs, Hebrew RTL, light mode, V2 migration, JSON restore and local recovery, stale tabs, invalid legacy recovery, AI unavailable state, retired auth redirects and offline reopening. Reference-driven control changes required locator updates. A renewed execution environment also left a stale production server; tests now start a fresh dedicated server on port 3100 with server reuse disabled. Interrupted/stale-server runs are not counted as passing. The reference-implementation run passed all 15 browser workflows, including the eight-screen capture and new-install Hebrew welcome, alongside 320/360/390/430px layouts and permissioned service-worker notification dispatch. The notification API was intercepted in that browser test; physical OS delivery was not claimed.
- Offline test verified that a locally recorded entry survives reload with networking disabled, and that the cached generic HTML contains no private transaction description or API response.

## Not yet verified

No live AI request was made without provider/rate-limit credentials. No Vercel CLI/credential binding/deployment connector was present when checked. No Vercel deployment, DNS change, production HTTP verification or physical iPhone Safari test is claimed. Chromium emulation verifies layout/interaction/offline behavior, not every iOS storage/installation/notification behavior.

Historical V2 PostgreSQL tests are documented in the earlier audit and kept as an optional legacy test. They are no longer a dependency of the local-only app or its CI. Future security review should include public AI abuse limits, deployment protection if needed, provider spending caps and device-specific storage recovery behavior.

## Approved visual reference

See `APPROVED-DESIGN.md` and `screenshots/approved/eight-screens.png`. Actual 390×844 browser captures were manually reviewed against the supplied low-resolution eight-screen composite and revised. The labeled captures use isolated, saved QA records, not user balances or normal-install defaults. Goal photographs are locally generated decorative assets, not the original source photos. No pixel-perfect claim is made.
