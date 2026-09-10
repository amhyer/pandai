// node --import tsx --test tests/class-student-import-ui.test.tsx
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import React, { act } from 'react';

test('class card opens import, submits the selected class, refreshes counts, and resets for another file', async () => {
  const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', { url: 'http://localhost' });
  const globals = ['window', 'document', 'navigator', 'HTMLElement', 'Element', 'Node', 'NodeFilter', 'MutationObserver',
    'DocumentFragment', 'CustomEvent', 'Event', 'HTMLInputElement', 'getComputedStyle', 'IS_REACT_ACT_ENVIRONMENT'];
  const descriptors = new Map(globals.map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  for (const key of globals) {
    Object.defineProperty(globalThis, key, { configurable: true, writable: true,
      value: key === 'IS_REACT_ACT_ENVIRONMENT' ? true : (dom.window as any)[key] });
  }
  const originalFetch = globalThis.fetch;
  let imported = false;
  let submitted: FormData | undefined;
  let resolveImport!: (value: Response) => void;
  let classFetches = 0;
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    if (url === '/api/import/csv') {
      submitted = init?.body as FormData;
      return new Promise<Response>((resolve) => { resolveImport = resolve; });
    }
    if (url.startsWith('/api/classes')) {
      classFetches++;
      return Response.json([{ id: 'class-a', name: '1A', grade: 1, academicYear: '2026/2027', _count: { users: imported ? 1 : 0 } }]);
    }
    return Response.json(url.includes('SISWA') && imported ? [{ id: 'student-1', name: 'Siti', role: 'SISWA' }] : []);
  };

  const { createRoot } = await import('react-dom/client');
  const { ClassManager } = await import('../src/components/dashboard/admin-sekolah/class-manager');
  const { useAppStore } = await import('../src/store/use-store');
  useAppStore.getState().setUser({ id: 'admin', name: 'Admin', role: 'ADMIN_SCHOOL', schoolId: 'school-a', schoolType: 'SD', isActive: true });
  const root = createRoot(document.getElementById('root')!);
  const button = (text: string) => {
    const result = Array.from(document.querySelectorAll('button')).find((item) => item.textContent?.trim() === text);
    assert.ok(result, `Button not found: ${text}`);
    return result;
  };
  try {
    await act(async () => { root.render(<ClassManager />); });
    assert.match(document.body.textContent!, /0 siswa/);
    await act(async () => { button('Import Siswa').click(); });
    assert.match(document.querySelector('[role="dialog"]')!.textContent!, /Import Siswa ke Kelas 1A/);
    assert.ok(button('Template CSV'));
    assert.ok(button('Template Excel'));

    const input = document.querySelector<HTMLInputElement>('input[type="file"]')!;
    Object.defineProperty(input, 'files', { value: [new File(['NISN,Nama Lengkap\n0012345678,Siti'], 'siswa.csv')] });
    await act(async () => { input.dispatchEvent(new dom.window.Event('change', { bubbles: true })); });
    assert.match(document.body.textContent!, /Pratinjau Data/);
    assert.match(document.body.textContent!, /0012345678/);
    await act(async () => { button('Mulai Import').click(); });
    assert.equal(button('Konfirmasi & Import').disabled, false);
    await act(async () => { button('Konfirmasi & Import').click(); });
    assert.equal(submitted?.get('classId'), 'class-a');
    assert.equal(submitted?.get('schoolId'), 'school-a');
    assert.equal(submitted?.get('type'), 'siswa');
    assert.deepEqual(JSON.parse(submitted?.get('fieldMapping') as string), { nisn: 'NISN', name: 'Nama Lengkap' });
    assert.equal(button('Memproses...').disabled, true);
    assert.equal(button('Mengimpor...').disabled, true);

    imported = true;
    await act(async () => {
      resolveImport(Response.json({ success: true, imported: 1, failed: 0, message: '1 siswa berhasil diimpor.' }));
    });
    assert.match(document.body.textContent!, /Import Berhasil/);
    assert.match(document.body.textContent!, /1 siswa/);
    assert.equal(classFetches, 2);
    await act(async () => { button('Import File Lain').click(); });
    assert.ok(document.querySelector('input[type="file"]'));
    assert.doesNotMatch(document.body.textContent!, /Pratinjau Data/);
    await act(async () => { button('Tutup').click(); });
    assert.equal(document.querySelector('[role="dialog"]'), null);
  } finally {
    await act(async () => { root.unmount(); });
    useAppStore.getState().setUser(null);
    globalThis.fetch = originalFetch;
    for (const key of globals) {
      const descriptor = descriptors.get(key);
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete (globalThis as any)[key];
    }
    dom.window.close();
  }
});
