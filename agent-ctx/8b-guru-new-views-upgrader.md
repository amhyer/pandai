# Task ID: 8b — Guru New Views Design Upgrade Agent

## Status: Completed

## Work Done
- Completely rewrote all 6 components in `guru-new-views.tsx` with design system upgrades
- All API calls preserved identically (materials, attendance, character-reports, teaching-journals)
- Zero lint errors
- File compiles cleanly

## Key Design Changes
1. **GuruTugasView**: Card grid layout with colored left borders (blue/amber/purple), countdown due dates, pill filters
2. **GuruKehadiranView**: Avatar initials, quick round status buttons (H/I/S/A), pill class selector, progress counters
3. **GuruRekapKehadiranView**: Color-coded percentage bars (≥90=green, 75-89=amber, <75=red), export loading state, pill filters
4. **GuruKarakterView**: 7 unique pastel habit cards, hover star ratings, progress indicator, avatar student selector
5. **GuruRekapKarakterView**: Per-cell mini bars, sort by score/name, student detail dialog with all 7 habit breakdowns
6. **GuruJurnalView**: Timeline cards with gradient date accent sidebar, class filter pills, note preview

## Shared Components Added
- GradientIcon, PageHeader, FilterPill, EmptyState, SoftStatCard
- Helper functions: getCountdown, formatDateShort, getInitials
- Enhanced StarRating with hover preview, Enhanced HABITS with unique colors per habit
