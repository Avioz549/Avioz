# SAVIO 3.0

הכסף שלך. העתיד שלך.

See [the approved eight-screen design implementation](docs/APPROVED-DESIGN.md) and [the actual screen captures](docs/screenshots/approved/README.md).

A single-person, local-first Next.js finance application. No registration, login, Supabase project or database configuration is required. Home, Transactions, Work, Savings and More form the five safe-area-aware mobile tabs; desktop uses a sidebar. New installations start in Hebrew RTL with a welcome flow; English LTR, existing language preferences, light/dark modes and iPhone installation are supported.

## Open the application

Use Node 24 and npm 11. From this directory:

```sh
npm ci
npm run dev
```

Open the address printed by Next.js. For an HTTPS website usable on an iPhone, import this branch into Vercel with the repository root as the project root. No environment variables are required for the app. See [deployment instructions](docs/DEPLOYMENT.md).

```sh
npm run lint
npm run typecheck
npm test
npm run build
npm run test:e2e
npm run start
```

Browser tests use system Chromium when present or Playwright's installed browser. Install it on a new machine using `npx playwright install --with-deps chromium`. Use the existing checkout; cloud tasks are already isolated and do not need another worktree.

## Your records and backups

SAVIO 3 stores the existing financial data format in IndexedDB with atomic revision checks. An existing `savio-local-v1` localStorage record is migrated on the same origin without changing the original copy. V2 JSON exports, snapshot envelopes, V3 backups and full normalized legacy-table JSON exports can be restored after validation and explicit review. No Supabase data is deleted or fetched automatically. Export cloud records from the old app before switching to V3, then restore that JSON here.

Settings → Backup & restore exports JSON, previews a restore and offers the ten previous on-device saves. These copies are not external backups and vanish with site storage. SAVIO asks the browser for persistent storage where supported, but persistence is never guaranteed. Storage is not encrypted. Save JSON privately and export before clearing data, switching a domain, device, browser, preview URL or PWA storage context. Import the backup in the new context. A seven-day export reminder appears when financial records exist. “Last export” means an export was requested; the browser cannot verify you retained the file.

Stale tabs cannot overwrite a newer save. Reload before retrying a conflict. Invalid records fail safely and show recovery/export controls. A restore replaces the current workspace after explicit confirmation, with the old snapshot retained in local recovery history. Deleting current financial records also retains recovery and the V2 source copy; clear the site's storage to erase all on-device copies after exporting anything you want to keep.

## Working features

- Personalized dashboard, exact recorded cash flow, selected-month charts, recent transactions, expected gross pay, savings progress and local insights.
- Transactions with category/type filters, search, editing/deletion, monthly recurring schedules, CSV export, category analytics and six-month comparisons.
- Workplaces, persistent timers, manual/overnight shifts, paid/unpaid breaks, persisted unpaid pause/resume, configurable overtime tiers and manually selected weekend/holiday premiums. Gross estimates exclude taxes and deductions. Rules apply per shift; no universal Israeli statutory payroll, weekly overtime or net-pay calculation is implied. Imported historical gross estimates are retained until explicitly edited.
- Multiple goals, dated or undated targets, contributions and conservative/balanced/accelerated plans. Goals share the selected month's positive surplus proportionally. Recorded contributions do not verify a bank balance or transfer money. Display currency changes formatting only; no exchange conversion occurs.
- Month/category budgets, calendar and reminder CRUD, foreground notifications with permission, challenges calculated from real records, purchase-price-to-work-hours calculator and profile preferences.
- Installable shell with proper PNG and Apple touch icons, standalone display and iPhone safe areas. The service worker caches only generic shell/build assets, never API responses or financial records. After a successful online installation, the local workspace can reopen offline. Real Safari installation, storage behavior and notification support vary by iOS version and require device testing.

## Optional AI

The app and deterministic insights work without AI configuration. AI requests are server-side only. Before each request, you can explicitly allow a minimal, locally calculated summary; without permission no financial context is sent. Names, transaction descriptions and complete records are excluded from the summary. Consent resets after each request; chat is not persisted.

Optional server variables: `SAVIO_AI_KEY`, `SAVIO_AI_MODEL` (existing `OPENAI_API_KEY`/`OPENAI_MODEL` are accepted). On production/public deployments, AI also requires `SAVIO_RATE_LIMIT_URL` and `SAVIO_RATE_LIMIT_TOKEN`, using an Upstash-compatible Redis REST API. This supplies distributed limits of 10 requests/IP/minute and 200 total/day. Missing or failed protection disables AI safely. These are request controls, not a complete abuse-prevention or authentication system. Use Vercel deployment protection if this website should be accessible only to you. Your financial data remains local, but a public AI endpoint consumes the deployment owner's provider credits.

Never prefix server keys or Redis tokens with `NEXT_PUBLIC_`. See `.env.example`. No live AI calls or Vercel deployment have been verified without configured service access.

## History and validation

Historical SQL and the original ZIP audit are retained as references. They are not needed for SAVIO 3 runtime or deployment; the optional `npm run test:legacy-db` verifies that archived schema only. See [SAVIO 3 changes](docs/SAVIO-3.md), [verification](docs/VERIFICATION.md) and [deployment](docs/DEPLOYMENT.md).
