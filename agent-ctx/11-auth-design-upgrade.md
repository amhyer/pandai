# Task 11: Auth & Landing Page Design Upgrade

## Agent: Main

## Summary
Upgraded login form, register form, and landing page with a soft, interactive, modern design system.

## Changes Made

### 1. Login Form (`src/components/auth/login-form.tsx`)
- **Split layout on desktop**: Left panel with branding, stats, and decorative elements; right panel with form card
- **Mobile responsive**: Centered card on gradient background, mobile back button and logo
- **Demo account buttons**: Styled as color-coded pills with role icons, gradient backgrounds, hover effects, and chevron indicators
- **Form inputs**: `rounded-xl` with soft focus ring (`focus:ring-2 focus:ring-[#1F3864]/20`), smooth transitions, slate-50 background
- **Submit button**: `rounded-xl` gradient bg (`from-[#1F3864] to-[#2a4a7a]`), `hover:shadow-md active:scale-[0.98] transition-all duration-200`
- **"Lupa password?" link**: Styled as subtle text link in password row
- **"Belum punya akun?" link**: Navigates to register with underline hover
- **Back to landing**: Arrow left button in header area
- **Fade-in animation**: CSS `@keyframes fadeIn` on mount

### 2. Register Form (`src/components/auth/register-form.tsx`)
- **Visual role selection cards**: Each role (Siswa, Guru, Admin) shown as cards with gradient icon, checkmark badge, ring highlight on selection
- **School code input**: For Siswa/Guru roles with consistent styling
- **Dapodik verification section**: Preserved all functionality (NPSN search, file upload, connector download, school card)
- **Terms checkbox**: Custom styled with brand color checkmark
- **Confirm password error**: Soft red background/border with icon
- **Input styling**: Same `rounded-xl` design system as login
- **Back to login link**: Arrow left button in header
- **Fade-in animation**: CSS `@keyframes fadeIn` on mount

### 3. Landing Page (`src/app/page.tsx`)
- **Full-page gradient**: `from-[#1F3864] via-[#2a4a7a] to-[#1a2744]` with decorative blur circles
- **FadeIn component**: IntersectionObserver-based scroll animation for sections
- **AnimatedCounter component**: Count-up animation for stats (10K+ Soal, 500+ Sekolah, 50K+ Siswa, 24/7 Akses)
- **Feature cards**: 6 cards with gradient icons, hover lift effect (`hover:-translate-y-1`), backdrop blur
- **CTA section**: Amber-tinted card with two action buttons
- **Footer**: Logo, navigation links (Tentang, Fitur, Bantuan, Kebijakan, Syarat & Ketentuan), copyright
- **Responsive**: Mobile-first design with proper breakpoints

### 4. Global CSS (`src/app/globals.css`)
- Added `@keyframes fadeIn` animation for auth/landing pages

## Design System Applied
- Brand color: `#1F3864` (navy) with `#2a4a7a` (lighter navy)
- Accent: Amber-400 for highlights, CTAs, and logo
- Cards: `rounded-2xl shadow-xl` white background
- Inputs: `rounded-xl` with `focus:ring-2 focus:ring-[#1F3864]/20` and smooth transitions
- Buttons: `rounded-xl` gradient, `hover:shadow-md active:scale-[0.98] transition-all duration-200`
- Background: Subtle gradient with decorative blur circles
- Animations: CSS fade-in on mount, IntersectionObserver scroll animations

## Preserved Functionality
- All API calls (`/api/auth/login`, `/api/auth/register`, `/api/auth/register-school`, `/api/schools/lookup`, `/api/dapodik/upload`, `/api/dapodik/connector/download`)
- Demo login with all 5 accounts
- Dapodik NPSN search and file upload modes
- Auto-fill from Dapodik data
- Form validation with toast messages
- Navigation via `useAppStore`
- All existing state management

## Lint Status
- Zero new lint errors introduced
- Pre-existing errors in `server-manager.js` and `admin-school-views.tsx` remain unchanged
