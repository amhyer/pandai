# Task 3: NPSN Dapodik School Lookup and Admin Sekolah Registration

## Summary
Added NPSN-based school verification from a local Dapodik database, enabling school admins to register with verified school data.

## Files Created
1. `/src/lib/npsn-database.ts` — 27 real Indonesian schools, `lookupSchool()` and `getSchoolByNpsn()` functions
2. `/src/app/api/schools/lookup/route.ts` — GET `/api/schools/lookup?q=` with NPSN/name search
3. `/src/app/api/auth/register-school/route.ts` — POST creates School + Subscription + User(ADMIN_SCHOOL)

## Files Modified
1. `/prisma/schema.prisma` — Added 9 Dapodik fields to School model
2. `/src/components/auth/register-form.tsx` — Added ADMIN_SCHOOL role + Dapodik verification UI

## Key Decisions
- School code auto-generated as `NPSN-{last4digits}` from the NPSN number
- Emerald/green theme for Dapodik verification to convey trust/verification
- NPSN uniqueness check prevents duplicate school registrations
- Search supports exact NPSN match or partial name/city/province match
- Max 10 results from lookup API

## Verification
- `bun run db:push` succeeded
- `bun run lint` zero errors
- Dev server compiles successfully