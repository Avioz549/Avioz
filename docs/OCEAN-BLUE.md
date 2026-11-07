# SAVIO Ocean Blue release

## Implemented

SAVIO's existing Next.js application and the complete 4.0 module set are retained. The redesign starts at production source `29e1d82a5562eb29557948a9240008a97c64db59` on a clean working tree. GitHub `savio-3.0` and `savio-4.0` matched that commit before development. Work was isolated on `ocean-blue`.

Ocean Blue is a sixth theme with navy surfaces, cyan accents, consistent component tokens, soft borders/shadows, restrained transitions and home-only glass surfaces. The generated decorative sunset asset is bundled as `public/ocean-sunset.webp` (approximately 123 KB). It is not a photograph of the user or a personal location. No external image host is required at runtime.

The home dashboard has one shared structure across all themes:

1. SAVIO branding, local display name, current date and customization control.
2. Next planned shift: workplace, date, start/end times and the existing payroll engine's gross estimate.
3. Two primary financial cards: actual monthly income received and aggregate recorded savings. A secondary line retains recorded cash flow, monthly expenses and the hide/show amounts control. Recorded cash flow is not an actual bank balance. The original interactive cash-flow chart and monthly comparison remain available in an expandable section.
4. Primary savings goal: name, recorded amount/target and accessible progress bar. Users can choose a primary goal in dashboard customization; otherwise the first incomplete goal is used, falling back to the first saved goal.
5. Today's tasks: up to three previews, occurrence completion controls and access to the full planner.
6. Customizable quick actions. Additional insights/payments/recent records/personal goals remain accessible in a grouped disclosure.

The untouched old default widget sequence is interpreted in the new default presentation order without rewriting stored preferences. Explicit custom ordering displays all selected widgets in their saved order, retaining full personalization. Hiding/restoring widgets and the preferred opening screen remain available.

The five mobile tabs remain Home, Money, Work, Planner and Goals, with a desktop sidebar and header menu for additional modules. The redundant Planner entry was removed from the supplementary menu, while all other modules remain accessible. Menu descriptions now explain each module accurately.

## Themes and data compatibility

Ocean Blue is the default only for an empty/new installation. Existing explicit dark/light/midnight/purple/system preferences are read unchanged. Settings → עיצוב האפליקציה offers visual previews and one-tap selection of all six themes, saved through the same atomic IndexedDB pipeline. The profile editor remains backward-compatible.

No IndexedDB schema migration or financial-record transformation is introduced by this design release. The same database (`savio-local-v3`), version 2, workspace/history stores, immutable migration source and backup schema 5 remain. The theme enum is extended; the optional UUID `life.preferences.primarySavingsGoalId` records an explicit user choice. Other fields remain accepted/preserved. An invalid saved record fails closed rather than being silently dropped. Selecting a deleted/missing primary goal safely falls back to an existing goal.

The existing versioned migration, stale-tab compare-and-swap, original source preservation, historical payroll cents, overlap confirmation, idle midnight/timezone updates and planned-shift boundary updates are retained. Older app bundles that do not recognize the new Ocean theme cannot validate that new preference; an arbitrary rollback to an old reader is unsupported. Retain a compatible reader and export a reviewed backup instead of clearing browser storage.

No authentication, Supabase, synchronization, analytics, paid dependency or new API integration is added. Actual user device data was not accessible to the development environment; preservation was tested with isolated fixture records and migration databases.

## Offline and accessibility

The ocean photograph is referenced only by the Ocean home pseudo-element (`.screen-overview .main-content::before`). Other screens use navy cards with no ocean-image background. The app shell/service worker precaches the local photo and serves it offline; public build chunks stay cached and API responses remain excluded. Safe update behavior during open editors is retained.

Layouts are tested in Hebrew RTL at 320, 390, 430 and 1280 pixels; existing suites also cover 360 pixels, all original themes, English LTR and mobile navigation. Reduced-motion preferences are honored. Input text is at least 16px under Ocean, primary controls use comfortable touch sizes, and task/progress controls have accessible names/state. Physical iPhone/Safari and actual OS notification delivery still require device verification.

## Verification and production

Final test results and commit information are reported with the release. The existing Vercel project remains `savio-offline`, established production branch `savio-3.0`; no new project is created. Before release, fetch the remote again and require a fast-forward from the verified production tip. Build with existing `npm ci` / `npm run build` configuration.

Production target: https://savio-offline.vercel.app

The current environment's proxy still blocks that hostname (CONNECT 403), despite a previously saved network draft. Git access works. A Git push can submit this release through the existing integration, but cannot by itself establish Vercel Ready or prove the new bundle is live. Final production health verification must show the release's exact SHA at `/api/health` and a successful live UI check.

Screenshots: [Ocean mobile captures](screenshots/ocean/README.md). They contain isolated test records, not bundled fake balances or production data.

## Validation commands

- `npm run typecheck` — passed.
- `npm run lint` — passed with zero warnings.
- `npm test` — 65 passed, zero failed.
- `TZ=Asia/Jerusalem npm test` — 65 passed, zero failed.
- `npm run build` — passed, including service-worker generation.
- `npm run test:e2e` — 52 passed, zero failed (final complete run, 1.9 minutes).
- `git diff --check` — passed.

The nine Ocean-specific browser cases add fresh-install truthfulness, preservation of each of the five existing themes and opaque records, actual shift/income/savings amounts, task completion, primary-goal choice and backup export, every-module layout/background checks at mobile/desktop widths, and offline image decoding with the browser HTTP cache disabled. The other 43 browser cases retain coverage for the complete SAVIO 4.0/reliability application.
