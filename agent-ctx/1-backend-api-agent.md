# Agent Work Record: Backend API Endpoints

## Task IDs: #32, #24, #21

### 1. #32 — Password Change Endpoint
**File**: `/home/z/my-project/src/app/api/users/change-password/route.ts` (NEW)

- `POST /api/users/change-password`
- Requires auth (any role, no role restriction)
- Accepts `{ currentPassword, newPassword }` in JSON body
- Validates both fields required, newPassword min 6 chars
- Verifies currentPassword against stored hash using `verifyPassword()` from `@/lib/constants`
- Wrong current password → 401 with "Password lama salah"
- Valid → hashes new password with `hashPassword()`, updates user, clears `sessionToken` + `sessionExpiresAt` (forces re-login)
- Returns `{ success: true, message: 'Password berhasil diubah. Silakan login kembali.' }`
- Lint clean, follows existing patterns from `/api/users/reset-password/route.ts`

### 2. #24 — Question DELETE with Safety Check
**File**: `/home/z/my-project/src/app/api/questions/route.ts` (MODIFIED)

- Replaced the existing DELETE handler (lines 89-102) with enhanced version (lines 89-146)
- Auth: requires SUPER_ADMIN, ADMIN_SCHOOL, or GURU
- Gets question ID from query param `?id=...`
- Fetches question with schoolId to enforce school isolation
- Non-SUPER_ADMIN can only delete their own school's questions
- Global questions (schoolId: null) can only be deleted by SUPER_ADMIN
- **SAFETY CHECK**: Queries `ExamItem` table for any reference to the question ID
  - If found → 409: "Soal ini sedang digunakan dalam paket ujian, tidak bisa dihapus"
  - If safe → deletes the question
- GET handler already existed (basic listing with filters)

### 3. #21 — Backup Endpoint Verification
**File**: `/home/z/my-project/src/app/api/backup/route.ts` (VERIFIED, NO CHANGES)

- GET with `?action=download` is correctly protected with `requireAuth(req, { roles: ['SUPER_ADMIN'] })`
- GET without action returns real table counts and DB stats (reasonable empty state with count: 0 if no data)
- POST (create backup) also correctly protected with SUPER_ADMIN only

### 4. Verification: /api/reports/downloads
**File**: `/home/z/my-project/src/app/api/reports/downloads/route.ts` (EXISTS, NO CHANGES)

- GET endpoint exists and is functional
- Proper auth with school isolation and ORANG_TUA access control
- Returns attempt reports, attendance reports, and character reports

### 5. Verification: /api/attempts
**File**: `/home/z/my-project/src/app/api/attempts/route.ts` (EXISTS, NO CHANGES)

- GET and POST endpoints exist and are functional
- Proper role-based access, school isolation, and ORANG_TUA child access

### Lint
- `bun run lint` passes with no errors
