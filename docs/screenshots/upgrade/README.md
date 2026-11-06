# Complete-upgrade mobile captures

Actual Chromium browser screenshots at a 390×844 mobile viewport, captured on 6 November 2026 against the production build. Full-page images show content below the fold; the fixed navigation remains at its viewport position in the capture.

These use isolated saved QA records, never the user's actual finances or application defaults. A new workspace has no sample balances or records. The original eight-screen gallery remains in `../approved/`.

- [Premium Dark](dark.png)
- [Clean Light](light.png)
- [Midnight Pro](midnight.png)
- [Neon Purple](purple.png)
- [System preference](system.png)
- [Reports with saved QA shifts](reports.png)

Visual review caught unreadable inherited dark-widget foregrounds in light mode and mismatched purple/navy accents; those were corrected. Browser assertions now check the primary light-mode work figures at WCAG 4.5:1 contrast, RTL/overflow across themes and 44px calendar targets at 320px. These targeted checks do not constitute an exhaustive accessibility audit or physical iPhone Safari validation.
