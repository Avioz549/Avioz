# SAVIO UI/UX refinement

## Source and scope

Started from clean production source `bebd1ded0688cf03020adacfd9e18a6cc07a8377`. The remote `savio-3.0` and `ocean-blue` tips matched. The UI work is on `ui-refinement`, preserving the existing application and all SAVIO 4.0 and reliability work.

No financial/payroll calculation engine, IndexedDB schema, storage routine, backup format or user record model is changed. UI-only selection state is held in React; navigating between sections does not save or alter financial records. Existing deep links remain valid.

## Information architecture

The only mobile primary navigation is **בית / עבודה / כסף / יומן / עוד** (Home / Work / Money / Planner / More). The header is branding and local-storage context, without duplicate route buttons or theme controls. Desktop navigation uses the same labels in logical groups.

More has four compact, labeled groups with one entry per secondary destination:

- My day and goals: Smart Day, Goals, Challenges.
- Money management: Budgets, Subscriptions, Payments & reminders.
- Insights and reports: Insights, Reports, Monthly Recap, SAVIO AI.
- Preferences and data: Settings (including Guide, theme selection and backup/recovery).

The old financial-calendar deep link is retained as `?tab=calendar`; its visible label is now Payments & reminders, distinguishing it from the primary personal Planner.

### Home

One daily structure across all themes: greeting/date, next planned shift, monthly income and recorded savings, primary savings goal, today's tasks and quick actions. Ocean sunset imagery is confined to the greeting header. Month selection is placed with financial information. Extra widgets remain available in a clearly labeled expandable area. Primary and supplementary widgets can be hidden/restored and ordered within their groups without rewriting stored preferences on load.

### Work

Four sections replace one continuous wall of modules:

- **Today:** existing live/pause/stop timer, completed/monthly totals, manual shift entry and timesheet editing/deletion.
- **Planning:** one work calendar view at a time, monthly or weekly. Both use the same saved shift records.
- **Salary:** salary forecast, targets, required-shift calculations, overtime breakdown, comparisons and payslips.
- **Workplaces:** wage/rule configuration, workplace CRUD and reminder preferences. An empty workplace list also offers a direct setup action from Today.

The timer and persisted shift state continue while another section is shown. Financial values still come from the same central payroll engine. The guide explains the updated workplace entry point.

### Money

Transactions open first. Forecast and Analysis have their own sections. Search, monthly CSV export and record editing remain available. There is one transaction creation button, with no floating add button over the content/navigation. Type and category filters now have independent UI state and combine correctly; selecting a category no longer resets the selected income/expense type.

Subscriptions retain their forecast in a disclosure instead of repeating a large forecast dashboard above the subscription list.

### Planner, goals and analytics

Planner opens on the current day; week/month views remain available. Search/filters and foreground-reminder preferences are disclosures. Goals separate Savings, Personal goals and Tools. Detailed contribution/history/projection controls open from each savings goal's management disclosure. The purchase calculator and savings challenge remain in Tools.

Insights separates Money, Work and Goals/tasks, with the original five charts distributed across those sections instead of stacked together. Spending distribution/comparisons remain available in a disclosure. Smart Day and Monthly Recap retain all data and explicit export/share actions with the shared spacing, typography and card system.

SAVIO AI retains server-side consent and deterministic local coaching. Local insights and the calculator are grouped in an expandable tools area. They were not removed.

### Settings and recovery

Settings has personal preferences, data/backup, appearance/tools and about/help groups. The single theme selection button is **עיצוב האפליקציה**. All six themes and one-tap persistence are retained. The redundant theme dropdown inside profile editing and global header toggle were removed; profile edits preserve the current theme.

Recovery is a dedicated Settings sub-screen with a Back to settings action. Reviewing a backup opens one native dialog, rather than nesting a review dialog inside a backup dialog. Validation, confirmation, recovery history and exports remain unchanged.

## Shared design and accessibility

`components/section-tabs.tsx` provides reusable section tabs/panels with selected state, associated IDs, roving focus, Home/End and RTL-aware arrow-key navigation. Inactive panels do not mount their forms/charts, reducing visual and rendering load.

`app/refined.css` supplies shared spacing/radii/control sizes, clear main headings, consistent cards, restrained shadows, responsive controls, focus outlines, dialog layout and safe-area-aware navigation. Themes continue to supply colors; they do not switch to different application layouts. The photo is only the Ocean home header background. Shift start/end timestamps use explicit locale/date/time options and bidirectional isolation; previous/next arrows follow reading direction.

Screenshots in `screenshots/refined/` are actual **viewport** captures, avoiding misleading full-page images with a fixed nav bar halfway through the capture. They use isolated QA data, not production records or product defaults.

## Verification and remaining limits

Local release checks: TypeScript and ESLint passed; 65 unit tests passed (also verified with Asia/Jerusalem timezone); production build passed; all 58 Playwright scenarios passed on the refined interface. The final full rerun, including the Hebrew savings-challenge label correction, passed all 58 browser tests in 2.4 minutes. No skipped tests or failed checks. Screenshots were reviewed from the rendered interface; physical iPhone Safari remains unverified. Existing financial, migration, backup, offline, rounding, overlaps, date/timezone and privacy assertions remain enabled. Browser flows were updated to navigate the reorganized UI. The safe-update interaction test stubs registration consistently, avoiding interference between a real first-install worker and its fake waiting-worker fixture; real offline/service-worker tests remain enabled.

Six additional browser scenarios cover unique primary/secondary navigation, focused work sections and live timer survival, independent transaction filters, goal/theme/recovery access, all major routes and internal sections at 320/375/390/430 pixels, RTL keyboard navigation and offline section navigation without financial writes.

Physical iPhone Safari, operating-system notification delivery and actual device safe-area behavior are not claimed as tested. Existing local browser storage remains unencrypted and potentially evictable; external JSON backups are still necessary.

The established Vercel target is `savio-offline`, production branch `savio-3.0`, URL https://savio-offline.vercel.app. The current cloud instance's outbound proxy has previously denied this hostname with CONNECT 403; publication and live health verification must be reported separately. No replacement project, account system, cloud synchronization, paid service or analytics is introduced.
