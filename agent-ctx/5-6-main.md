# Task 5-6: Build Frontend Account Management Components

## Files Modified/Created

### 1. Modified: `src/components/dashboard/super-admin/school-manager.tsx`
- Added `KeyRound` icon button ("Kelola Akun") next to Edit/Delete for each school row
- Created `AdminAccountDialog` component with full admin account management:
  - Fetches admin info from GET `/api/schools/[schoolId]/admin-account`
  - Displays current account card with copy-to-clipboard buttons for username/email
  - Edit form for name and email
  - Password reset with visibility toggle
  - Two save modes: "Simpan Perubahan" (POST) and "Reset Password Saja" (PATCH)
  - Handles non-existent admin account (creation flow)
- Enhanced school creation to show admin credentials in toast

### 2. Created: `src/components/dashboard/admin-sekolah/account-manager.tsx`
- Comprehensive account management for Admin Sekolah role
- Tab-based UI: Guru, Siswa, Orang Tua
- Summary cards per role with proper color coding (sky/amber/rose)
- Per-row actions: Edit, Reset Password, Toggle Active/Inactive
- Role-specific add dialogs with appropriate fields
- Search/filter per tab
- Loading skeletons, responsive design

## API Integration
- GET `/api/schools/[id]/admin-account` - fetch admin account
- POST `/api/schools/[id]/admin-account` - create/update admin account
- PATCH `/api/schools/[id]/admin-account` - reset admin password
- GET `/api/users?schoolId=xxx&role=GURU|SISWA|ORANG_TUA` - list users per role
- POST `/api/users` - create user (guru/siswa/orang tua)
- PATCH `/api/users` - update user info
- DELETE `/api/users?id=xxx` - deactivate user
- POST `/api/users/[id]/reset-password` - reset user password

## Lint Result
Only 2 pre-existing errors in keep-alive.js (unrelated). All new code is lint-clean.
