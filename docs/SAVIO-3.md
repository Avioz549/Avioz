# SAVIO 3.0 implementation

The existing app was improved in place. Financial schemas and calculations, transaction/shift/goal editors, budgets, reminders and historical record conversion are retained. Authentication and Supabase runtime integration were removed as explicitly requested. Old auth links redirect to local Settings; retired cloud mutation endpoints no longer exist. SQL references remain only to support the earlier source audit and data-export history.

## Audit and repairs

- Original screens used tiny typography and a hamburger drawer on mobile. V3 adds an 8px design rhythm, system/iOS typography, 16–18px form/body controls, 44px minimum interactive targets, charcoal/emerald panels, safe-area bottom tabs and an organized More section.
- Dashboard values were duplicated among compact cards. A single prominent balance panel now shows recorded income/expenses; salary and savings cards, quick actions, charts, recent records and insights follow.
- Navigation retained old scroll offsets. Changing tabs now returns to the top. Chart entry animation no longer delays the display of existing records. Motion remains restrained and reduced-motion preferences are honored.
- LocalStorage alone had no recovery path or restore feature. The unchanged data model now lives in transactional IndexedDB, with revision conflicts, ten prior snapshots, validated JSON restore previews, external export reminders and invalid-data recovery controls. The original V2 browser copy stays untouched.
- AI assumed an authenticated database user. It now uses server-only provider integration and optional per-request minimal context computed locally. It cannot fetch records from the browser by itself. Distributed production request controls are required before enabling public AI.
- PWA metadata lacked Apple/PNG icon variants and offline access returned only a disconnected placeholder. V3 caches a generic, non-personal app shell and build assets so local records can reopen offline after installation. API responses and financial records are not placed in Cache Storage.
- Work history is presented as readable cards on mobile while retaining a desktop table. Purchase-to-work-hours calculation is reusable in Savings and coaching. Challenges derive progress from real recorded behavior, without demo balances.

## Preserved data and scope

No financial fields are renamed or discarded by the V3 local migration. Existing raw V2 exports and snapshot exports still parse through the same validators. Restores explicitly replace the current workspace and retain a recovery copy. The application never deletes original Supabase data or silently imports remote records. New domains/devices/PWA contexts require an external backup and restore.

Existing limitations remain explicit: local storage is neither guaranteed nor encrypted; local history is not an external backup; payroll does not implement all statutory/weekly/net-pay rules; recorded savings are not verified bank balances; notification delivery is foreground only. Hosted AI, actual Vercel access and physical iPhone behavior require separate verification.
