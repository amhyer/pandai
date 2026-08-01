---
Task ID: 1
Agent: Main Agent
Task: Fix website display and implement NIP/NISN login + ORANG_TUA auto-creation

Work Log:
- Diagnosed dev server instability caused by Turbopack memory usage in 4GB cgroup environment
- Agent-browser Chrome consumes ~1GB, leaving insufficient memory for Turbopack compilation
- Reduced page.tsx from 21+ dynamic imports to single-file component for faster compilation
- Created server-manager.js for auto-restart when server crashes
- Created simple landing page (landing-page-simple.tsx) as backup
- Verified all core features from previous session are intact:
  - Prisma schema: username, nip, nisn, ORANG_TUA role, parent-child relationship
  - Login API: username OR email lookup (NIP/NIK for guru, NISN for siswa, nama depan for ortu)
  - Login form: dynamic labels, demo accounts with correct credentials
  - Store: ORANG_TUA in UserRole and ViewType
  - Layout: ORANG_TUA sidebar navigation
  - Page: ORANG_TUA dashboard case
  - User Manager: ORANG_TUA auto-creation when admin creates student
  - DUMMY_USERS.md: complete and up-to-date

Stage Summary:
- Page renders correctly (24KB HTML with PANDAI, Masuk, Daftar, Skor TKA)
- Dev server uses keep-alive (server-manager.js) for auto-restart
- All NIP/NISN/ORANG_TUA features already implemented from previous session
- Server stability is limited by 4GB memory cgroup constraint
