# Task 8a: Admin School New Views Design Upgrade

## Status: Completed

## File Modified
- `/home/z/my-project/src/components/views/admin-school-new-views.tsx`

## Exports (unchanged)
- `SubjectsView`
- `TeacherAssignmentsView`
- `BackupRestoreView`
- `ActivityLogView`

## Design Improvements Applied

### Shared Helpers Added
- `GradientIcon` — page header icon wrapper with `bg-gradient-to-br from-[#1F3864] to-[#2d5289]`
- `GradientStatCard` — stat cards with gradient backgrounds, large bold numbers, hover lift
- `EmptyState` — friendly icons in soft circles (`h-20 w-20 rounded-full bg-muted/50`)
- `getInitials(name)` — extracts 2-letter initials for avatar
- `getAvatarColor(name)` — deterministic color from name hash
- `getModuleDotColor(module)` — returns bg color class for timeline dots

### SubjectsView
- Stat cards with gradient backgrounds (brand, emerald, amber)
- Responsive grid of subject cards (sm:grid-cols-2 lg:grid-cols-3) replacing table
- Soft hover: `rounded-xl shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200`
- Color-coded type badges: `rounded-full` with pastel backgrounds
- Subject code displayed as gradient icon (emerald for wajib, amber for pilihan)
- Action buttons appear on hover with opacity transition
- Type filter as rounded-full pill buttons
- Search input with rounded-lg and focus ring
- Add/Edit dialog: rounded-xl content, rounded-lg inputs, GradientIcon header, Loader2 spinner
- Delete AlertDialog: rounded-xl, red danger icon in soft circle
- Empty state with friendly icon and CTA button

### TeacherAssignmentsView
- Stat cards with gradient backgrounds (brand, emerald, amber)
- Table with rounded-xl container, `even:bg-muted/30 hover:bg-muted/50`
- User avatar initials in table rows with deterministic color
- Subject and class filter as rounded-full Select triggers with dashed border
- Search input for guru/mapel/kelas
- Batch assignment dialog with searchable teacher dropdown and selectable class pills
- Class pills toggle with brand color active state
- Delete button appears on hover per row

### BackupRestoreView
- Database info card with gradient header bar and soft accent border
- Last backup info in emerald-tinted card with dot indicator
- Backup button with progress bar (gradient fill, animated width, status messages)
- Download button with Loader2 loading state
- Warning card: amber soft background with icon in rounded-xl
- Restore upload area: dashed border, rounded-xl, soft circle icon, Pilih File button
- Backup history as timeline: connecting line, colored dots (emerald for latest), hover reveal actions
- Danger zone card: red soft background

### ActivityLogView
- Timeline-style log entries with colored dots per module
- Connecting vertical line on left side
- User avatar initials in colored circles
- Filter pills as rounded-full buttons with module icons and counts
- Date range filter (from/to date inputs) with reset button
- Search with 300ms debounce via `useDebounce` hook
- Pagination with smooth transitions, page numbers, prev/next
- Pagination info: "Menampilkan X–Y dari Z"

## Design System Applied
- All cards: `rounded-xl shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200`
- Page headers: `GradientIcon` with `bg-gradient-to-br from-[#1F3864] to-[#2d5289]`
- Buttons: `transition-all duration-200 hover:shadow-sm active:scale-[0.98]` with `cursor-pointer`
- Dialog forms: rounded-xl content, rounded-lg inputs, `focus-visible:ring-[#1F3864]/30`
- Filter pills: `rounded-full` with brand color active state
- Badges: pastel, `rounded-full`
- Empty states: friendly icons in soft circles
- Color scheme: brand #1F3864, accent amber-400/500

## API Integration (Preserved)
- SubjectsView: GET/POST/PATCH/DELETE /api/subjects
- TeacherAssignmentsView: GET/POST/DELETE /api/teacher-assignments
- BackupRestoreView: GET/POST /api/backup
- ActivityLogView: GET /api/activity-logs
- All components have mock data fallbacks

## Lint: Zero errors in modified file