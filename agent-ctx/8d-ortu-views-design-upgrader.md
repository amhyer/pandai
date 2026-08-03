# Task ID: 8d - Ortu Views Design Upgrader

## Task
Upgrade ortu-new-views.tsx with soft, interactive, precise design

## Work Completed
- Completely rewrote OrtuKarakterView with all design requirements:
  - Child selector with avatar initials as rounded-full pills
  - Date selector with CalendarDays icon
  - 7 habit cards with unique pastel colors, emoji in rounded-lg bg, separator, star rating with hover preview, rounded textarea
  - StarRating component: hover preview (scale-125), active (scale-95), drop-shadow glow on filled stars
  - Overall progress indicator (dashed border, gradient bar, avg rating)
  - Empty state with FileText icon in soft circle
  - Save button with Loader2 spinner, gradient bg
  - Tips card with gradient bg and structured items
  - GradientIcon page header
- Completely rewrote OrtuRekapKarakterView with all design requirements:
  - Child selector with avatar initials
  - Weekly/Monthly toggle as rounded-full pills
  - Comparison period selector (Bulan Ini vs Bulan Lalu)
  - 4 summary stat cards with colored icon backgrounds
  - Overall score card with accent bar, large 6xl number, gradient progress, label badge
  - Per-habit analysis with trend indicators, CSS horizontal bars, breakdown badges
  - Detailed table with even:bg-muted/30, hover:bg-muted/50, trend badges
  - Recommendations card based on weakest habits
  - Print/Export button
- All API calls preserved
- Zero lint errors in modified file

## Design System
- Cards: rounded-xl shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200
- Headers: gradient icon bg (from-[#1F3864] to-[#2d5289])
- Tables: rounded-xl, even:bg-muted/30, hover:bg-muted/50
- Buttons: transition-all duration-200 hover:shadow-sm active:scale-[0.98]
- Filter pills: rounded-full
- Stars: amber-400 filled with glow, gray-300 empty
