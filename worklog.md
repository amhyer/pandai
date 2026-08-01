---
Task ID: 1
Agent: Main Agent
Task: Fix website not appearing + complete pending RBAC/authentication changes

Work Log:
- Investigated dev server instability — Turbopack was crashing due to memory pressure with 18+ dynamic imports
- Found and fixed missing SISWA entry in NAV_CONFIG (app-layout.tsx) — this was causing runtime crash for siswa role
- Added ORANG_TUA breadcrumb entries in buildBreadcrumbs function
- Verified prisma schema already has ORANG_TUA role, username field, nip/nisn/nik fields, parentId relation
- Verified seed script already creates ORANG_TUA accounts automatically with password "123"
- Verified login API already supports username-based lookup (NIP/NIK for guru, NISN for siswa, email for admin)
- Verified login form already has proper demo accounts and dynamic hints per role
- Verified users API already auto-creates ORANG_TUA when student is created/imported
- Updated user-manager.tsx: added role-specific forms (GuruFormDialog with NIP/NIK fields, SiswaFormDialog with NISN, class selector, nama orang tua, auto-create ORANG_TUA hint)
- Pushed schema to DB and ran seed — 25 users created (1 SA + 2 Admin + 2 Guru + 10 Siswa + 10 Orang Tua)
- Tested all login methods via API: Super Admin (email), Guru (NIP), Siswa (NISN), Orang Tua (nama depan) — ALL WORKING
- Tested page rendering via agent-browser — landing page loads with 70,818 chars of content when cache is warm
- Turbopack server stability issue: crashes after ~3-4 concurrent compilations in this memory-constrained sandbox (4GB RAM)

Stage Summary:
- All code changes are complete and correct
- Schema: 5-level RBAC (SUPER_ADMIN, ADMIN_SCHOOL, GURU, SISWA, ORANG_TUA) with username/nip/nisn/parentId fields
- Login: works with email, NIP, NIK, NISN, and nama depan (Orang Tua)
- Auto-create ORANG_TUA: fully functional in both seed script and users API
- User Manager: role-specific forms with proper validation
- DUMMY_USERS.md: already up to date with all 25 accounts
- Server stability: needs warm cache (pre-warm via curl) before browser access
