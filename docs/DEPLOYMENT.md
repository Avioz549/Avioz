# Deploy and open SAVIO 3.0

## Vercel

1. Sign in to Vercel and import `Avioz549/Avioz`, selecting the **savio-3.0** branch. For an existing project, select this branch for a preview or change the production branch only when you intend to replace the old deployment.
2. Use the repository root, framework **Next.js**, Node **24**, install command `npm ci`, build command `npm run build`. These commands are also declared in `vercel.json`.
3. Leave environment variables empty to use all local finance features. No Supabase URL/key, authentication or SQL setup is required.
4. Deploy and open the HTTPS URL returned by Vercel. Use one stable URL daily. Preview URLs and different domains have separate browser storage.
5. On iPhone, open that address in Safari → Share → Add to Home Screen. If iOS gives the installed app a separate storage context, export JSON in the original browser context and restore it in the installed app. Do not assume either context is permanent.
6. If you own `savio.com`, you may add it through Vercel Domains and apply Vercel's DNS instructions. Export before switching domains, then restore on the new origin. No DNS changes are made by this task.

## Optional AI

Add server-only `SAVIO_AI_KEY` and optional `SAVIO_AI_MODEL`. Production AI also requires Upstash-compatible `SAVIO_RATE_LIMIT_URL` and `SAVIO_RATE_LIMIT_TOKEN` for distributed limits. Redeploy after configuration. Without the key or rate-limit service, the application shows AI unavailable and still provides a functional deterministic local chat and insights. Provider/network failures do not modify local records.

The application has no authentication. Each browser holds only its own records. To keep the hosted application itself private, use Vercel deployment protection. Rate limiting bounds requests but is not a guarantee against credit abuse; review provider spending limits and protection before enabling a public AI endpoint. Never expose AI/Redis keys through public variables or source files.

In this managed development environment, optional AI requires `api.openai.com` plus your exact Redis REST hostname in the outbound policy. Vercel's outbound access is independent. No network additions or secret bindings are required for ordinary local app features.

## Move existing records safely

- Same-origin V2 browser records migrate automatically. The `savio-local-v1` copy is preserved.
- For V2 cloud records, export JSON using the old application before replacing its deployment, then restore through V3 Settings. Old Supabase tables and remote accounts are not deleted. V3 does not try to connect to them.
- The current app exports schema-version-4 JSON and accepts both version-3 and version-4 backups, raw V2 data, old snapshot envelopes and a complete normalized legacy JSON object containing all nine tables. Imports are validated and reviewed; unsupported or malformed input never erases current data. Recurring templates lacking a start date generate an explicit import warning and start in the import month.
- Keep private copies of old and new exports until counts, currencies, goals, reminders and totals match. IDB recovery copies alone are not sufficient external backups.

## Before daily use

Run the commands in README. Check the actual HTTPS deployment on your iPhone and desktop: install, reload offline, migrate a disposable backup, add/edit/delete entries, use the shift timer, restore/export JSON and switch Hebrew/English. Verify that stale tabs show a conflict rather than overwriting new records. Test notifications on the device; only foreground reminders are implemented, not scheduled background push.

Payroll remains a configurable gross estimate, not legal/tax advice or a complete Israeli payslip. Currency selection does not convert amounts. Deleting current records preserves local recovery versions; clearing site data removes the entire local store, V2 source copy and caches. Export first.

## Deployment status

A build or CI pass is not a hosted deployment. This workspace had no Vercel CLI, Vercel credential binding or deployment connector available when inspected. A real Vercel deployment, production-domain verification and physical iPhone Safari testing remain external verification steps unless subsequently completed and recorded in `VERIFICATION.md`.

For this upgrade, export a private JSON backup on the existing `https://savio-offline.vercel.app` origin before refreshing. Keep the same origin so existing IndexedDB records remain accessible. Review `COMPLETE-UPGRADE.md` for new recurring-entry semantics and payroll conventions. Never restore a V4 backup into an old client or downgrade the app against new records.
