# Approved eight-screen implementation

The user-supplied eight-screen composite is the primary visual specification for this revision. This updates the actual SAVIO 3.0 app, not a separate static prototype. It retains the local financial schema and existing migration/backup path.

## Implemented screen correspondence

1. **Welcome:** black canvas, diagonal emerald illumination, glowing S mark, SAVIO wordmark/tagline, rising light trace, feature rows and a working start action. Fresh installations default to Hebrew; existing language/data preferences stay unchanged. A local first-run marker controls the welcome flow.
2. **Dashboard:** SAVIO header, personal greeting, month navigation, emerald balance panel, paired income/expense cards, real-data bar chart, salary/savings summaries, recent records and calculated insights. Privacy toggle masks the displayed balance without changing records.
3. **Transactions:** green type segments, search, category filtering, date-grouped records, category icons, signed income/expense amounts, contextual edit/delete controls and the central add action. Analytics and CSV export remain functional.
4. **Work:** green illuminated live timer, stop/pause/resume actions, selected workplace, paid-hours/gross monthly pair, manual entry and retained payroll management/history. Unpaid pause timestamps persist and are accounted for by salary calculations; old shifts without a pause field remain valid.
5. **Savings:** compact thumbnail goal cards, actual progress amounts/bars, dates and monthly plans; expandable details preserve contributions/edit/delete without making every card tall. Decorative car/travel/home photographs were generated locally to match the reference subjects; they are not the original source photo files or pictures of the user's actual belongings. The work-hours calculator remains available.
6. **Budgets:** luminous progress ring calculated from the selected month's actual expenses and category limits, totals, category progress cards and validated editing. No reference percentage is hardcoded into user data.
7. **SAVIO AI:** illuminated orb, centered coaching introduction, four working prompt suggestions, message input and explicit per-request sharing control. Server-only optional integration and deterministic local insights remain intact.
8. **Settings:** grouped compact rows for profile, language/currency, backups, CSV export, notifications, appearance, AI and app information. Rows open working settings/restore flows rather than placeholder navigation.

## Visual QA

Actual Chromium screenshots at 390×844 are in `screenshots/approved/`; `eight-screens.png` is a labeled contact sheet. The first pass was manually reviewed against the supplied reference and corrected for savings-card height, settings density, header/selector proportions, transaction grouping and mobile add-action accessibility. The photographic strip is served through Next image optimization. The contact-sheet records are isolated, saved QA fixtures, explicitly labeled as such; normal installations never receive fixture data.

The reference is a low-resolution composite (approximately 519×534 overall), so very small type and original image details cannot be verified pixel for pixel. Device mockup frames and OS clock/notch are not rendered as fake application UI. No pixel-perfect claim is made. Physical iPhone Safari/PWA, live provider calls and an actual Vercel deployment require separate verification.

## Data safety

The IndexedDB database name, existing financial fields, compare-and-swap revisions, ten-version local recovery, versioned JSON backups and the untouched V2 source copy are preserved. The only added financial-model field is an optional pause timestamp. No existing records, remote Supabase data or backups are silently deleted. No authentication or Supabase runtime was added.
