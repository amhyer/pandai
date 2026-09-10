// API contract tests with an in-memory database double. No live data is changed.
// node --import tsx --test tests/missing-role-features.test.ts
import { beforeEach, afterEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { db } from '../src/lib/db';
import { createSession } from '../src/lib/auth';
import { getTeacherClassIds, requireTeacherClass } from '../src/lib/teacher-scope';
import { requireStudentScope } from '../src/lib/scope';
import * as studentsApi from '../src/app/api/teacher-students/route';
import * as notesApi from '../src/app/api/student-notes/route';
import * as activityApi from '../src/app/api/activity-logs/route';
import { GET as usersGet } from '../src/app/api/users/route';
import { POST as importPost } from '../src/app/api/import/csv/route';
import { getGuruView, getKepalaSekolahView, getOrtuView, getRoleRoute } from '../src/lib/route-map';

let users: any[];
let notes: any[];
let logs: any[];
let assignments: any[];
const classes = [
  { id: 'class-a', schoolId: 'school-a', name: '1A', waliKelasId: 'other-teacher' },
  { id: 'class-b', schoolId: 'school-a', name: '1B', waliKelasId: 'other-teacher' },
  { id: 'class-wali', schoolId: 'school-a', name: '1C', waliKelasId: 'teacher' },
  { id: 'foreign', schoolId: 'school-b', name: '2A', waliKelasId: 'teacher' },
];
const restorers: (() => void)[] = [];
function stub(object: any, key: string, fn: any) {
  const original = object[key]; object[key] = fn; restorers.push(() => { object[key] = original; });
}
function matches(row: any, where: any = {}): boolean {
  return Object.entries(where).every(([key, value]: any) => {
    if (value === undefined) return true;
    if (key === 'OR') return value.some((condition: any) => matches(row, condition));
    if (value && typeof value === 'object' && !(value instanceof Date)) {
      if ('in' in value) return value.in.includes(row[key]);
      if ('not' in value) return row[key] !== value.not;
      if ('contains' in value) return String(row[key] ?? '').toLowerCase().includes(String(value.contains).toLowerCase());
      if ('gte' in value || 'lte' in value) return (!value.gte || row[key] >= value.gte) && (!value.lte || row[key] <= value.lte);
    }
    return row[key] === value;
  });
}
function project(row: any, select?: any): any {
  if (!row) return null;
  if (!select) return { ...row };
  return Object.fromEntries(Object.entries(select).map(([key, value]: any) => [key, value === true ? row[key] : project(row[key], value.select)]));
}
function hydrate(row: any) {
  return { ...row, class: classes.find((cls) => cls.id === row.classId) ?? null,
    student: users.find((u) => u.id === row.studentId), author: users.find((u) => u.id === row.authorId) };
}
async function request(url: string, method = 'GET', data?: any, actor = 'teacher', schoolOverride?: string | null): Promise<any> {
  const user = users.find((u) => u.id === actor)!;
  const token = await createSession({ id: user.id, role: user.role, schoolId: schoolOverride === undefined ? user.schoolId : schoolOverride });
  return new Request(`http://localhost${url}`, { method,
    headers: { cookie: `pandai_session=${token}`, ...(data ? { 'Content-Type': 'application/json' } : {}) },
    ...(data ? { body: JSON.stringify(data) } : {}),
  });
}
const auth = { userId: 'teacher', role: 'GURU', schoolId: 'school-a' };
const noteInput = { studentId: 'student-a', category: 'apresiasi', content: 'Membantu teman belajar dengan sabar.', date: '2026-09-09' };

describe('missing role features and access boundaries', () => {
  beforeEach(() => {
    process.env.JWT_SECRET = 'test-only-missing-features-secret-at-least-32-chars';
    assignments = [{ teacherId: 'teacher', schoolId: 'school-a', classId: 'class-a' }];
    users = [
      ...['teacher', 'other-teacher'].map((id) => ({ id, name: id, role: 'GURU', schoolId: 'school-a', isActive: true })),
      { id: 'parent', role: 'ORANG_TUA', schoolId: 'school-a', isActive: true },
      { id: 'kepsek', role: 'KEPALA_SEKOLAH', schoolId: 'school-a', isActive: true },
      { id: 'admin', role: 'ADMIN_SCHOOL', schoolId: 'school-a', isActive: true },
      { id: 'student-a', role: 'SISWA', schoolId: 'school-a', classId: 'class-a', name: 'Andi', nisn: '0012345678', parentId: 'parent', isActive: true, password: 'PRIVATE', sessionToken: 'PRIVATE' },
      { id: 'student-b', role: 'SISWA', schoolId: 'school-a', classId: 'class-b', name: 'Budi', nisn: '0012345679', isActive: true },
      { id: 'unassigned', role: 'SISWA', schoolId: 'school-a', classId: null, name: 'Citra', nisn: '0012345680', phone: 'PRIVATE', parentId: 'PRIVATE', isActive: true },
      { id: 'foreign-student', role: 'SISWA', schoolId: 'school-b', classId: 'foreign', name: 'Dewi', isActive: true },
    ];
    notes = [{ ...noteInput, id: 'note-a', schoolId: 'school-a', classId: 'class-a', authorId: 'teacher' },
      { ...noteInput, id: 'note-b', studentId: 'student-b', schoolId: 'school-a', classId: 'class-b', authorId: 'other-teacher' }];
    logs = [{ id: 'log-a', schoolId: 'school-a', userId: 'teacher', module: 'Pengguna', action: 'Menambah siswa', detail: 'Siswa ditambahkan', createdAt: new Date('2026-09-09T01:00:00Z') },
      { id: 'log-b', schoolId: 'school-b', userId: 'teacher', action: 'Rahasia', createdAt: new Date() }];
    stub(db.teacherAssignment, 'findMany', async ({ where }: any) => assignments.filter((row) => matches(row, where)));
    stub(db.class, 'findMany', async ({ where, select }: any) => classes.filter((row) => matches(row, where)).map((row) => project(row, select)));
    stub(db.class, 'findFirst', async ({ where, select }: any) => project(classes.find((row) => matches(row, where)), select));
    stub(db.user, 'findUnique', async ({ where, select }: any) => project(hydrate(users.find((row) => matches(row, where)) || {}), select));
    stub(db.user, 'findFirst', async ({ where, select }: any) => { const row = users.find((u) => matches(u, where)); return row ? project(hydrate(row), select) : null; });
    stub(db.user, 'findMany', async ({ where, select, take }: any) => users.filter((row) => matches(row, where)).slice(0, take).map((row) => project(hydrate(row), select)));
    stub(db.user, 'create', async ({ data, select }: any) => { const row = { ...data, id: 'new-student' }; users.push(row); return project(hydrate(row), select); });
    stub(db.user, 'updateMany', async ({ where, data }: any) => { const rows = users.filter((row) => matches(row, where)); rows.forEach((row) => Object.assign(row, data)); return { count: rows.length }; });
    stub(db.studentNote, 'findMany', async ({ where, select, skip = 0, take }: any) => notes.filter((row) => matches(row, where)).slice(skip, skip + take).map((row) => project(hydrate(row), select)));
    stub(db.studentNote, 'count', async ({ where }: any) => notes.filter((row) => matches(row, where)).length);
    stub(db.studentNote, 'findFirst', async ({ where }: any) => notes.find((row) => matches(row, where)) || null);
    stub(db.studentNote, 'create', async ({ data, select }: any) => { const row = { ...data, id: 'new-note' }; notes.push(row); return project(hydrate(row), select); });
    stub(db.studentNote, 'update', async ({ where, data }: any) => Object.assign(notes.find((row) => matches(row, where)), data));
    stub(db.studentNote, 'delete', async ({ where }: any) => { notes = notes.filter((row) => !matches(row, where)); });
    stub(db.activityLog, 'create', async ({ data }: any) => { logs.push(data); return data; });
    stub(db.activityLog, 'findMany', async ({ where, skip = 0, take }: any) => logs.filter((row) => matches(row, where)).slice(skip, skip + take));
    stub(db.activityLog, 'count', async ({ where }: any) => logs.filter((row) => matches(row, where)).length);
    stub(db.auditLog, 'create', async () => ({}));
    stub(db, '$transaction', async (fn: any) => fn(db));
  });
  afterEach(() => restorers.splice(0).reverse().forEach((restore) => restore()));

  test('teacher scope includes explicit assignments and wali kelas, never foreign schools', async () => {
    assert.deepEqual(await getTeacherClassIds(auth), ['class-a', 'class-wali']);
    await assert.rejects(requireTeacherClass(auth, 'class-b'));
    await assert.rejects(requireTeacherClass(auth, 'foreign'));
    await assert.rejects(requireStudentScope(auth, 'student-b'));
    await assert.rejects(requireStudentScope(auth, 'foreign-student'));
    await requireStudentScope(auth, 'student-a');
    assert.deepEqual(await getTeacherClassIds({ ...auth, schoolId: null }), []);
  });

  test('teachers can load existing student selectors without credentials or other classes', async () => {
    const response = await usersGet(await request('/api/users?role=SISWA'));
    assert.equal(response.status, 200);
    const data = await response.json();
    assert.deepEqual(data.map((u: any) => u.id), ['student-a']);
    assert.equal(JSON.stringify(data).includes('PRIVATE'), false);
    assert.equal((await usersGet(await request('/api/users?role=GURU'))).status, 403);
    assert.equal((await usersGet(await request('/api/users?classId=class-b'))).status, 403);
  });

  test('student listing rejects other classes, foreign schools and missing assignment', async () => {
    assert.equal((await studentsApi.GET(await request('/api/teacher-students?classId=class-a'))).status, 200);
    assert.equal((await studentsApi.GET(await request('/api/teacher-students?classId=class-b'))).status, 403);
    assert.equal((await studentsApi.GET(await request('/api/teacher-students?classId=foreign'))).status, 403);
    assert.equal((await studentsApi.GET(await request('/api/teacher-students?classId=class-a', 'GET', undefined, 'teacher', null))).status, 403);
  });

  test('school pool returns only minimal unassigned search results', async () => {
    const short = await studentsApi.GET(await request('/api/teacher-students?classId=class-a&pool=unassigned&q=C'));
    assert.deepEqual(await short.json(), []);
    const res = await studentsApi.GET(await request('/api/teacher-students?classId=class-a&pool=unassigned&q=Ci'));
    assert.deepEqual(await res.json(), [{ id: 'unassigned', name: 'Citra', nisn: '0012345680' }]);
  });

  test('teacher creates a student with temporary credentials and cannot inject another role', async () => {
    const input = { name: 'Eka', nisn: '0012345681', classId: 'class-a' };
    const res = await studentsApi.POST(await request('/api/teacher-students', 'POST', input));
    assert.equal(res.status, 201);
    const data = await res.json();
    assert.ok(data.temporaryPassword.length >= 12);
    const created = users.find((u) => u.id === 'new-student');
    assert.equal(created.mustChangePassword, true);
    assert.equal(created.role, 'SISWA');
    assert.notEqual(created.password, data.temporaryPassword);
    assert.equal(data.student.password, undefined);
    assert.equal(JSON.stringify(logs).includes(data.temporaryPassword), false);
    assert.equal((await studentsApi.POST(await request('/api/teacher-students', 'POST', { ...input, role: 'ADMIN_SCHOOL' }))).status, 400);
    assert.equal((await studentsApi.POST(await request('/api/teacher-students', 'POST', { ...input, nisn: '123' }))).status, 400);
  });

  test('claim is conditional and cannot move a student from another class or school', async () => {
    for (const id of ['student-b', 'foreign-student']) {
      assert.equal((await studentsApi.PATCH(await request('/api/teacher-students', 'PATCH', { action: 'claim', id, classId: 'class-a' }))).status, 409);
    }
    const data = { action: 'claim', id: 'unassigned', classId: 'class-a' };
    assert.equal((await studentsApi.PATCH(await request('/api/teacher-students', 'PATCH', data))).status, 200);
    assert.equal((await studentsApi.PATCH(await request('/api/teacher-students', 'PATCH', data))).status, 409);
  });

  test('edit is restricted and removal retains the student account', async () => {
    assert.equal((await studentsApi.PATCH(await request('/api/teacher-students', 'PATCH', { id: 'student-a', name: 'Andi Baru' }))).status, 200);
    assert.equal((await studentsApi.PATCH(await request('/api/teacher-students', 'PATCH', { id: 'student-b', name: 'Budi Baru' }))).status, 409);
    assert.equal((await studentsApi.DELETE(await request('/api/teacher-students?id=student-a', 'DELETE'))).status, 200);
    const student = users.find((u) => u.id === 'student-a');
    assert.equal(student.classId, null);
    assert.equal(student.isActive, true);
    assert.equal(student.parentId, 'parent');
  });

  test('teacher import accepts only own class and student type', async () => {
    for (const [type, classId, status] of [['siswa', 'class-a', 200], ['siswa', 'class-b', 403], ['guru', 'class-a', 403], ['siswa', '', 403]] as const) {
      const form = new FormData(); form.set('type', type); form.set('schoolId', 'school-a');
      if (classId) form.set('classId', classId);
      form.set('fieldMapping', JSON.stringify({ nisn: 'NISN', name: 'Nama' }));
      form.set('file', new File(['NISN,Nama\n0012345682,Fitri'], 'siswa.csv'));
      // Import lookup by NISN returns null when no existing student is found.
      stub(db.user, 'findUnique', async ({ where, select }: any) => { const row = users.find((u) => matches(u, where)); return row ? project(row, select) : null; });
      const signed = await request('/api/import/csv');
      const res = await importPost(new Request(signed.url, { method: 'POST', headers: { cookie: signed.headers.get('cookie')! }, body: form }));
      assert.equal(res.status, status);
    }
  });

  test('note reads are restricted to assigned students or linked children', async () => {
    for (const actor of ['teacher', 'parent']) {
      const res = await notesApi.GET(await request('/api/student-notes', 'GET', undefined, actor));
      assert.equal(res.status, 200);
      assert.deepEqual((await res.json()).data.map((note: any) => note.id), ['note-a']);
      assert.equal((await notesApi.GET(await request('/api/student-notes?studentId=student-b', 'GET', undefined, actor))).status, 403);
    }
    const school = await notesApi.GET(await request('/api/student-notes', 'GET', undefined, 'kepsek'));
    assert.equal((await school.json()).total, 2);
  });

  test('note creation validates inputs and derives author/class/school server-side', async () => {
    const res = await notesApi.POST(await request('/api/student-notes', 'POST', noteInput));
    assert.equal(res.status, 201);
    assert.equal((await res.json()).authorId, 'teacher');
    assert.equal(notes.at(-1).schoolId, 'school-a');
    assert.equal(JSON.stringify(logs).includes(noteInput.content), false);
    for (const changes of [{ content: ' ' }, { category: 'secret' }, { date: '2026-02-31' }, { authorId: 'other-teacher' }]) {
      assert.equal((await notesApi.POST(await request('/api/student-notes', 'POST', { ...noteInput, ...changes }))).status, 400);
    }
    assert.equal((await notesApi.POST(await request('/api/student-notes', 'POST', { ...noteInput, studentId: 'student-b' }))).status, 403);
  });

  test('parents, admins and principals cannot write notes or manage students', async () => {
    for (const actor of ['parent', 'admin', 'kepsek', 'student-a']) {
      assert.equal((await notesApi.POST(await request('/api/student-notes', 'POST', noteInput, actor))).status, 403);
      assert.equal((await notesApi.PATCH(await request('/api/student-notes', 'PATCH', { id: 'note-a', content: 'X' }, actor))).status, 403);
      assert.equal((await notesApi.DELETE(await request('/api/student-notes?id=note-a', 'DELETE', undefined, actor))).status, 403);
      assert.equal((await studentsApi.POST(await request('/api/teacher-students', 'POST', {}, actor))).status, 403);
    }
  });

  test('only the author can edit/delete a note while it remains in an accessible class', async () => {
    const data = { id: 'note-a', content: 'Catatan diperbarui', date: '2026-09-09', category: 'umum' };
    assert.equal((await notesApi.PATCH(await request('/api/student-notes', 'PATCH', data))).status, 200);
    assert.equal((await notesApi.PATCH(await request('/api/student-notes', 'PATCH', { ...data, id: 'note-b' }))).status, 404);
    assert.equal((await notesApi.DELETE(await request('/api/student-notes?id=note-a', 'DELETE'))).status, 200);
    assert.equal(notes.some((n) => n.id === 'note-a'), false);
  });

  test('principal log access is read-only, school scoped, searchable and paginated', async () => {
    const res = await activityApi.GET(await request('/api/activity-logs?limit=1&offset=0&q=Menambah&from=2026-09-09&to=2026-09-09', 'GET', undefined, 'kepsek'));
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.total, 1); assert.equal(body.data[0].id, 'log-a');
    assert.equal((await activityApi.GET(await request('/api/activity-logs?schoolId=school-b', 'GET', undefined, 'kepsek'))).status, 403);
    assert.equal((await activityApi.GET(await request('/api/activity-logs?from=2026-02-31', 'GET', undefined, 'kepsek'))).status, 400);
    assert.equal((await activityApi.GET(await request('/api/activity-logs', 'GET', undefined, 'parent'))).status, 403);
    assert.equal((await activityApi.POST()).status, 405);
  });

  test('anonymous requests are denied and new role menus have real routes', async () => {
    for (const handler of [studentsApi.GET, notesApi.GET, activityApi.GET]) {
      assert.equal((await handler(new Request('http://localhost/api/test') as any)).status, 401);
    }
    assert.equal(getGuruView('siswa'), 'guru-siswa');
    assert.equal(getGuruView('catatan'), 'guru-catatan');
    assert.equal(getOrtuView('catatan'), 'ortu-catatan');
    assert.equal(getKepalaSekolahView('aktivitas'), 'kepsek-aktivitas');
    assert.equal(getRoleRoute('GURU', 'guru-siswa'), '/guru/siswa');
    assert.equal(getRoleRoute('KEPALA_SEKOLAH', 'kepsek-aktivitas'), '/kepala-sekolah/aktivitas');
  });
});
