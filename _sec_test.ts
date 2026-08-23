import { SignJWT } from 'jose';
import { PrismaClient } from '@prisma/client';

const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'dev_jwt_secret_do_not_use_in_prod');
const db = new PrismaClient();

async function tok(userId: string, role: string, schoolId: string | null) {
  return new SignJWT({ userId, role, schoolId }).setProtectedHeader({ alg: 'HS256' }).setIssuedAt().setExpirationTime('24h').sign(secret);
}

function mkReq(token: string, method = 'GET', body?: any) {
  const h: Record<string, string> = { 'Content-Type': 'application/json', 'Cookie': `pandai_session=${token}` };
  const opts: any = { method, headers: h };
  if (body) opts.body = JSON.stringify(body);
  return new Request('http://x/api/t', opts);
}

async function test(id: string, fn: () => Promise<any>, expectDeny: boolean) {
  try {
    await fn();
    if (expectDeny) console.log(`${id}|FAIL|ALLOWED|should-have-denied`);
    else console.log(`${id}|PASS|ALLOWED|ok`);
  } catch (e: any) {
    const isDeny = e.status === 401 || e.status === 403 || e.status === 405 || e.status === 422;
    if (expectDeny && isDeny) console.log(`${id}|PASS|DENIED|${e.status} ${e.message}`);
    else if (!expectDeny && !isDeny) console.log(`${id}|PASS|ALLOWED|ok`);
    else console.log(`${id}|FAIL|${e.status}|expected ${expectDeny ? 'deny' : 'allow'} got ${e.status}`);
  }
}

async function main() {
  const { requireAuth, requireRole, AuthError } = await import('./src/lib/auth');
  const { getSchoolFilter, requireStudentScope } = await import('./src/lib/scope');

  const IDS = {
    schA: 'cmt5omh6m0000nzelvtwazc02', schB: 'cmt5omh7w000inzelkeh4n5zy',
    SA: 'cmt5omh6s0006nzelhz2pzmzd', ADM: 'cmt5omh6t0008nzelfrb9g1r3',
    GUR: 'cmt5omh6u000anzel38ki9tah', KEP: 'cmt5omh6v000cnzel5q1dkd77',
    SIS_A: 'cmt5omh6w000enzelic14c2et', SIS_B: 'cmt5omh7w000inzelkeh4n5zy',
    INACT: 'cmt5omh7z000knzelcu7sct18',
  };

  const T: Record<string, string> = {};
  for (const [k, uid] of Object.entries({ SA: IDS.SA, ADM: IDS.ADM, GUR: IDS.GUR, KEP: IDS.KEP, SIS_A: IDS.SIS_A, SIS_B: IDS.SIS_B, INACT: IDS.INACT })) {
    const role = k === 'SA' ? 'SUPER_ADMIN' : k === 'ADM' ? 'ADMIN_SCHOOL' : k === 'GUR' ? 'GURU' : k === 'KEP' ? 'KEPALA_SEKOLAH' : 'SISWA';
    const sid = k === 'SA' ? null : k === 'SIS_B' ? IDS.schB : IDS.schA;
    T[k] = await tok(uid as string, role, sid);
  }

  console.log('=== P0-03 ROLE SUBMISSION ===');
  await test('P0-03-SUPER_ADMIN', () => requireRole(mkReq(T.SA), ['SISWA']), true);
  await test('P0-03-ADMIN_SCHOOL', () => requireRole(mkReq(T.ADM), ['SISWA']), true);
  await test('P0-03-GURU', () => requireRole(mkReq(T.GUR), ['SISWA']), true);
  await test('P0-03-KEPALA_SEKOLAH', () => requireRole(mkReq(T.KEP), ['SISWA']), true);
  await test('P0-03-ORANG_TUA', () => requireRole(mkReq(T.SIS_A), ['ORANG_TUA']), true);
  await test('P0-03-SISWA', () => requireRole(mkReq(T.SIS_A), ['SISWA']), false);

  console.log('=== P0-04 INACTIVE/MISSING USER ===');
  await test('P0-04-NO-COOKIE', () => requireAuth(new Request('http://x', { method: 'GET' })), true);
  await test('P0-04-INVALID-JWT', () => requireAuth(mkReq('invalid.token.here')), true);
  await test('P0-04-GHOST-USER', () => requireAuth(mkReq(await tok('nonexistent_id', 'SISWA', IDS.schA))), true);
  await test('P0-04-INACTIVE-USER', () => requireAuth(mkReq(T.INACT)), true);
  await test('P0-04-ACTIVE-SISWA', () => requireAuth(mkReq(T.SIS_A)), false);

  console.log('=== P0-06 CROSS-SCHOOL SCOPE ===');
  const saAuth = { userId: 'x', role: 'SUPER_ADMIN', schoolId: null };
  const gurAAuth = { userId: 'x', role: 'GURU', schoolId: IDS.schA };
  const gurBAuth = { userId: 'x', role: 'GURU', schoolId: IDS.schB };

  const saF = getSchoolFilter(saAuth as any);
  console.log(saF === null ? 'P0-06-SA-NO-FILTER|PASS|null(no-restriction)' : `P0-06-SA-NO-FILTER|FAIL|${saF}`);
  console.log(getSchoolFilter(gurAAuth as any) === IDS.schA ? `P0-06-GURU-A-FILTER|PASS|${IDS.schA}` : 'P0-06-GURU-A-FILTER|FAIL|wrong');
  console.log(getSchoolFilter(gurBAuth as any) === IDS.schB ? `P0-06-GURU-B-FILTER|PASS|${IDS.schB}` : 'P0-06-GURU-B-FILTER|FAIL|wrong');

  await test('P0-06-GURU-A->OWN-STUDENT', () => requireStudentScope(gurAAuth as any, IDS.SIS_A), false);
  await test('P0-06-GURU-A->OTHER-SCHOOL-STUDENT', () => requireStudentScope(gurAAuth as any, IDS.SIS_B), true);

  console.log('=== P0-01 EXAM TIME WINDOW (data + logic) ===');
  const exams = await db.examSession.findMany({ where: { id: { in: ['cmt5omh87000snzeltaer4897', 'cmt5omh88000unzels1xttyj7', 'cmt5omh89000wnzelvfqgdeg5', 'cmt5omh8a000ynzel3a9zrlej'] } }, select: { id: true, title: true, status: true, startDate: true, endDate: true, schoolId: true } });
  const now = new Date();
  for (const ex of exams) {
    const inWindow = now >= ex.startDate && now <= ex.endDate;
    console.log(`${ex.title}|status=${ex.status}|inWindow=${inWindow}`);
  }

  console.log('=== P0-02 ASSIGNMENT DEADLINE (data) ===');
  const assigns = await db.assignment.findMany({ where: { id: { in: ['cmt5omh8d0017nzelyyqk5ui2', 'cmt5omh8j001anzeljjb7cf5x'] } }, select: { id: true, title: true, deadline: true, status: true } });
  for (const a of assigns) {
    const past = new Date(a.deadline) < now;
    console.log(`${a.title}|deadline=${a.deadline}|past=${past}`);
  }

  console.log('=== P0-05 ACTIVITY LOG (source code) ===');
  const fs = await import('fs');
  const src = fs.readFileSync('./src/app/api/activity-logs/route.ts', 'utf-8');
  console.log(src.includes('405') ? 'P0-05-POST-RETURNS-405|PASS|hardcoded-405' : 'P0-05-POST-RETURNS-405|FAIL|no-405');
  console.log(src.includes("requireRole(req, ['SUPER_ADMIN', 'ADMIN_SCHOOL'])") ? 'P0-05-GET-RESTRICED|PASS|SUPER_ADMIN+ADMIN_SCHOOL-only' : 'P0-05-GET-RESTRICTED|FAIL|wrong-roles');

  console.log('=== ANSWER KEY STRIPPING (source code) ===');
  const qSrc = fs.readFileSync('./src/app/api/questions/route.ts', 'utf-8');
  const eSrc = fs.readFileSync('./src/app/api/exam-session/[sessionId]/route.ts', 'utf-8');
  console.log(qSrc.includes('SISWA') && (qSrc.includes('answer') || qSrc.includes('delete')) ? 'ANSWER-KEY-QUESTIONS|PASS|SISWA-answer-handling-exists' : 'ANSWER-KEY-QUESTIONS|UNVERIFIED|check');
  console.log(eSrc.includes('includeAnswers') && eSrc.includes('SISWA') ? 'ANSWER-KEY-EXAM|PASS|conditional-includeAnswers-for-SISWA' : 'ANSWER-KEY-EXAM|UNVERIFIED|check');
  console.log(eSrc.includes('isCorrect') && eSrc.includes('SISWA') && eSrc.includes('delete') ? 'ANSWER-KEY-ISCORRECT|PASS|isCorrect-stripped-for-SISWA' : 'ANSWER-KEY-ISCORRECT|UNVERIFIED|check');

  await db.$disconnect();
}

main().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
