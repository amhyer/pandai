// node --import tsx --test tests/missing-role-features-ui.test.tsx
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import React, { act } from 'react';

test('teacher student form, note failure/retry, parent read-only notes and principal pagination', async () => {
  const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', { url: 'http://localhost' });
  const globals = ['window', 'document', 'navigator', 'HTMLElement', 'Element', 'Node', 'NodeFilter', 'MutationObserver',
    'DocumentFragment', 'CustomEvent', 'Event', 'HTMLInputElement', 'HTMLTextAreaElement', 'getComputedStyle', 'IS_REACT_ACT_ENVIRONMENT'];
  const descriptors = new Map(globals.map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  for (const key of globals) Object.defineProperty(globalThis, key, { configurable: true, writable: true, value: key === 'IS_REACT_ACT_ENVIRONMENT' ? true : (dom.window as any)[key] });
  const originalFetch = globalThis.fetch;
  let students: any[] = [];
  let notes: any[] = [];
  let failNote = true;
  const writes: { url: string; body: any }[] = [];
  const reads: string[] = [];
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    if (init?.method === 'POST') {
      const body = JSON.parse(init.body as string); writes.push({ url, body });
      if (url === '/api/teacher-students') {
        students = [{ ...body, id: 'student-a', class: { name: '1A' } }];
        return Response.json({ student: students[0], temporaryPassword: 'TempPassword234' }, { status: 201 });
      }
      if (failNote) return Response.json({ error: 'Penyimpanan gagal, coba lagi' }, { status: 500 });
      notes = [{ ...body, id: 'note-a', authorId: 'teacher', student: { name: 'Andi' }, author: { name: 'Bu Guru' }, class: { name: '1A' } }];
      return Response.json(notes[0], { status: 201 });
    }
    reads.push(url);
    if (url.startsWith('/api/classes')) return Response.json([{ id: 'class-a', name: '1A' }]);
    if (url.startsWith('/api/teacher-students')) return Response.json(students);
    if (url.includes('options=students')) return Response.json(students);
    if (url.startsWith('/api/student-notes')) return Response.json({ data: notes, total: notes.length });
    if (url.startsWith('/api/activity-logs')) return Response.json({ total: 30, data: [{ id: 'log', action: 'Menambah siswa', detail: 'Siswa ditambahkan', module: 'Pengguna', createdAt: '2026-09-09T01:00:00Z', user: { name: 'Bu Guru', role: 'GURU' } }] });
    throw new Error(`Unexpected request ${url}`);
  };
  const { createRoot } = await import('react-dom/client');
  const { GuruStudentsView } = await import('../src/components/views/guru-students-view');
  const { StudentNotesView } = await import('../src/components/views/student-notes-view');
  const { ActivityMonitorView } = await import('../src/components/views/kepsek/activity-monitor-view');
  const { useAppStore } = await import('../src/store/use-store');
  const root = createRoot(document.getElementById('root')!);
  const actor = { id: 'teacher', name: 'Bu Guru', role: 'GURU' as const, schoolId: 'school-a', isActive: true };
  const button = (text: string) => {
    const element = [...document.querySelectorAll('button')].find((item) => item.textContent?.trim() === text);
    assert.ok(element, `Missing button: ${text}`); return element;
  };
  const setValue = (selector: string, value: string) => {
    const element = document.querySelector(selector)!;
    const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(element), 'value')!.set!;
    setter.call(element, value);
    element.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
  };
  try {
    useAppStore.getState().setUser(actor);
    await act(async () => root.render(<GuruStudentsView />));
    assert.equal(button('Tambah Siswa').disabled, false);
    await act(async () => button('Tambah Siswa').click());
    await act(async () => { setValue('#student-name', 'Andi'); setValue('#student-nisn', '0012345678'); });
    await act(async () => { document.querySelector('form')!.dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true })); });
    assert.equal(writes[0].body.classId, 'class-a');
    assert.equal(writes[0].body.nisn, '0012345678');
    assert.match(document.body.textContent!, /TempPassword234/);
    await act(async () => button('Sudah Disimpan').click());
    assert.match(document.body.textContent!, /Andi/);
    assert.doesNotMatch(document.body.textContent!, /TempPassword234/);

    await act(async () => root.render(<StudentNotesView key="teacher" />));
    await act(async () => button('Tambah Catatan').click());
    await act(async () => setValue('#note-content', 'Menunjukkan kerja sama yang baik.'));
    await act(async () => document.querySelector('form')!.dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true })));
    // Failed writes preserve the form, rather than pretending they succeeded.
    assert.ok(document.querySelector('[role="dialog"]'));
    assert.equal((document.querySelector('#note-content') as HTMLTextAreaElement).value, 'Menunjukkan kerja sama yang baik.');
    failNote = false;
    await act(async () => document.querySelector('form')!.dispatchEvent(new dom.window.Event('submit', { bubbles: true, cancelable: true })));
    assert.equal(document.querySelector('[role="dialog"]'), null);
    assert.match(document.body.textContent!, /Menunjukkan kerja sama yang baik/);
    assert.equal(writes.at(-1)!.body.studentId, 'student-a');
    assert.equal(writes.at(-1)!.body.authorId, undefined);

    await act(async () => { useAppStore.getState().setUser({ ...actor, id: 'parent', role: 'ORANG_TUA' }); root.render(<StudentNotesView key="parent" />); });
    assert.match(document.body.textContent!, /Catatan Guru/);
    assert.match(document.body.textContent!, /Menunjukkan kerja sama/);
    assert.equal([...document.querySelectorAll('button')].some((item) => /Tambah Catatan|Edit|Hapus/.test(item.textContent || '')), false);

    await act(async () => { useAppStore.getState().setUser({ ...actor, id: 'kepsek', role: 'KEPALA_SEKOLAH' }); root.render(<ActivityMonitorView />); });
    assert.match(document.body.textContent!, /Mode baca saja/);
    assert.match(document.body.textContent!, /Menambah siswa/);
    await act(async () => button('Berikutnya').click());
    assert.ok(reads.some((url) => url.includes('/api/activity-logs?') && url.includes('offset=25')));
  } finally {
    await act(async () => root.unmount());
    useAppStore.getState().setUser(null);
    globalThis.fetch = originalFetch;
    for (const key of globals) { const descriptor = descriptors.get(key); if (descriptor) Object.defineProperty(globalThis, key, descriptor); else delete (globalThis as any)[key]; }
    dom.window.close();
  }
});
