// API contract tests with mocked database operations; no live database is modified.
// node --import tsx --test tests/class-student-import.test.ts
import { beforeEach, afterEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { Prisma } from '@prisma/client';
import * as XLSX from 'xlsx';
import { db } from '../src/lib/db';
import { createSession, verifyPassword } from '../src/lib/auth';
import { POST } from '../src/app/api/import/csv/route';

// Prisma delegates are proxies, so replace their methods directly rather than
// relying on property descriptors in node:test's mock.method.
const restorers: (() => void)[] = [];
function stub(target: any, key: string, implementation: (...args: any[]) => any) {
  const original = target[key];
  target[key] = implementation;
  restorers.push(() => { target[key] = original; });
}

const created: any[] = [];
let duplicateNisn: string | null;
let conflictNisn: string | null;
let classQueries: any[] = [];

async function request(options: {
  role?: string; schoolId?: string; sessionSchoolId?: string | null;
  classId?: string | null; mapping?: unknown; csv?: string; file?: File;
} = {}) {
  const form = new FormData();
  form.set('type', 'siswa');
  form.set('schoolId', options.schoolId ?? 'school-a');
  if (options.classId !== null) form.set('classId', options.classId ?? 'class-a');
  form.set('fieldMapping', JSON.stringify(options.mapping === undefined ? { nisn: 'NISN', name: 'Nama', kelas: 'Kelas' } : options.mapping));
  form.set('file', options.file ?? new File([options.csv ?? 'NISN,Nama,Kelas\n0012345678,Siti,Kelas berbeda'], 'siswa.csv'));
  const token = await createSession({
    id: 'admin', role: options.role ?? 'ADMIN_SCHOOL',
    schoolId: options.sessionSchoolId === undefined ? 'school-a' : options.sessionSchoolId,
  });
  return new Request('http://localhost/api/import/csv', {
    method: 'POST', headers: { cookie: `pandai_session=${token}` }, body: form,
  });
}

describe('import siswa directly into a class', () => {
  beforeEach(() => {
    process.env.JWT_SECRET = 'test-only-class-import-secret-at-least-32-chars';
    created.length = 0;
    classQueries = [];
    duplicateNisn = null;
    conflictNisn = null;
    stub(db.user, 'findUnique', async ({ where }: any) => {
      if (where.id === 'admin') return { isActive: true, role: 'ADMIN_SCHOOL' };
      if (where.nisn === duplicateNisn) return { name: 'Private name from another school', schoolId: 'school-b' };
      return created.find((user) => user.nisn === where.nisn) ?? null;
    });
    stub(db.class, 'findFirst', async ({ where }: any) => {
      classQueries.push(where);
      if ((where.id === 'class-a' || where.name === 'Kelas berbeda') && where.schoolId === 'school-a') {
        return { id: 'class-a', createdAt: new Date(0) };
      }
      return null;
    });
    stub(db.class, 'create', async () => { throw new Error('Must not auto-create a class for a targeted import'); });
    stub(db.user, 'create', async ({ data }: any) => {
      if (data.nisn === conflictNisn) {
        throw new Prisma.PrismaClientKnownRequestError('Unique constraint', { code: 'P2002', clientVersion: 'test' });
      }
      created.push(data);
      return { id: `student-${created.length}`, ...data };
    });
    stub(db.activityLog, 'create', async () => ({ id: 'log' }));
    stub(db.teacherAssignment, 'findMany', async () => []);
    stub(db.class, 'findMany', async () => []);
    stub(db.user, 'update', async () => { throw new Error('Existing student must never be moved'); });
  });
  afterEach(() => { restorers.splice(0).reverse().forEach((restore) => restore()); });

  test('imports into the selected class, ignores class column, and hashes the initial password', async () => {
    const res = await POST(await request());
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.imported, 1);
    assert.equal(body.classesCreated, 0);
    assert.equal(created[0].classId, 'class-a');
    assert.equal(created[0].schoolId, 'school-a');
    assert.equal(created[0].role, 'SISWA');
    assert.equal(created[0].nisn, '0012345678');
    assert.equal(created[0].mustChangePassword, true);
    assert.equal(await verifyPassword('0012345678', created[0].password), true);
    assert.deepEqual(classQueries, [{ id: 'class-a', schoolId: 'school-a' }]);
  });

  test('does not require a class column in a class-specific template', async () => {
    const res = await POST(await request({ csv: 'NISN,Nama\n0012345678,Siti', mapping: { nisn: 'NISN', name: 'Nama' } }));
    assert.equal((await res.json()).imported, 1);
    assert.equal(created[0].classId, 'class-a');
  });

  test('reads a real Excel upload on the server', async () => {
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([['NISN', 'Nama'], ['0012345678', 'Siti']]), 'Data');
    const file = new File([XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })], 'siswa.xlsx');
    const res = await POST(await request({ file, mapping: { nisn: 'NISN', name: 'Nama' } }));
    assert.equal((await res.json()).imported, 1);
    assert.equal(created[0].nisn, '0012345678');
  });

  test('rejects foreign/deleted classes even when the submitted schoolId is forged', async () => {
    for (const schoolId of ['school-a', 'school-b']) {
      const res = await POST(await request({ classId: 'class-b', schoolId }));
      assert.equal(res.status, 404);
    }
    assert.equal(created.length, 0);
    assert.ok(classQueries.every((query) => query.schoolId === 'school-a'));
  });

  test('super admin still cannot target a class outside the selected school', async () => {
    const res = await POST(await request({ role: 'SUPER_ADMIN', sessionSchoolId: null, schoolId: 'school-b' }));
    assert.equal(res.status, 404);
    assert.equal(created.length, 0);
  });

  test('rejects unauthenticated and non-admin users', async () => {
    assert.equal((await POST(new Request('http://localhost/api/import/csv', { method: 'POST' }))).status, 401);
    for (const role of ['GURU', 'SISWA', 'ORANG_TUA']) {
      assert.equal((await POST(await request({ role }))).status, 403);
    }
    assert.equal(created.length, 0);
  });

  test('rejects empty class IDs and invalid/missing/ambiguous mapping before writing', async () => {
    assert.equal((await POST(await request({ classId: '' }))).status, 400);
    for (const mapping of [null, [], { name: 12 }, {}, { name: 'Nama' }, { name: 'NISN', nisn: 'NISN' }]) {
      assert.equal((await POST(await request({ mapping }))).status, 400);
    }
    assert.equal(created.length, 0);
  });

  test('skips duplicate NISN without leaking names or modifying existing students', async () => {
    duplicateNisn = '0012345678';
    const res = await POST(await request({ csv: 'NISN,Nama,Kelas\n0012345678,Siti,A\n0012345679,Budi,A\n0012345679,Budi,A' }));
    const body = await res.json();
    assert.equal(body.imported, 1);
    assert.equal(body.failed, 2);
    assert.equal(created.length, 1);
    assert.equal(JSON.stringify(body).includes('Private name'), false);
  });

  test('reports unique conflicts and missing fields per row while continuing valid rows', async () => {
    conflictNisn = '0012345678';
    const res = await POST(await request({ csv: 'NISN,Nama,Kelas\n0012345678,Siti,A\n,Budi,A\n0012345679,Andi,A' }));
    const body = await res.json();
    assert.equal(res.status, 200);
    assert.equal(body.imported, 1);
    assert.equal(body.failed, 2);
    assert.equal(body.errors.length, 2);
  });

  test('legacy school-wide import still resolves a class by name when no classId is supplied', async () => {
    const res = await POST(await request({ classId: null }));
    assert.equal((await res.json()).imported, 1);
    assert.equal(created[0].classId, 'class-a');
    assert.ok(classQueries.some((query) => query.name === 'Kelas berbeda'));
  });
});
