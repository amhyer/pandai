// node --import tsx --test tests/register-form-ui.test.tsx
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import React, { act } from 'react';

test('register form preselects the Admin Sekolah role and blocks submit until Dapodik is verified', async () => {
  const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', { url: 'http://localhost' });
  const globals = ['window', 'document', 'navigator', 'HTMLElement', 'Element', 'Node', 'NodeFilter', 'MutationObserver',
    'DocumentFragment', 'CustomEvent', 'Event', 'HTMLInputElement', 'getComputedStyle', 'IS_REACT_ACT_ENVIRONMENT'];
  const descriptors = new Map(globals.map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  for (const key of globals) {
    Object.defineProperty(globalThis, key, { configurable: true, writable: true,
      value: key === 'IS_REACT_ACT_ENVIRONMENT' ? true : (dom.window as any)[key] });
  }

  // Radix (react-use-size) memakai ResizeObserver, yang tidak ada di JSDOM.
  const originalResizeObserver = (globalThis as any).ResizeObserver;
  (globalThis as any).ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };

  const originalFetch = globalThis.fetch;
  const calls: string[] = [];
  globalThis.fetch = async (input) => {
    calls.push(String(input));
    return Response.json({});
  };

  const { createRoot } = await import('react-dom/client');
  const { RegisterForm } = await import('../src/components/auth/register-form');
  const root = createRoot(document.getElementById('root')!);

  const setNativeValue = (el: HTMLInputElement, value: string) => {
    const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), 'value')!.set!;
    setter.call(el, value);
    el.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
  };

  try {
    await act(async () => { root.render(<RegisterForm />); });

    // 1) Kartu role "Admin Sekolah" harus sudah terpilih sejak awal.
    const radio = document.querySelector<HTMLElement>('#role-ADMIN_SCHOOL');
    assert.ok(radio, 'Radio #role-ADMIN_SCHOOL tidak ditemukan');
    const checked = radio.getAttribute('aria-checked') === 'true' || radio.dataset.state === 'checked';
    assert.ok(checked, `Kartu Admin Sekolah tidak terpilih (aria-checked=${radio.getAttribute('aria-checked')}, data-state=${radio.dataset.state})`);
    assert.match(document.body.textContent!, /Admin Sekolah/);

    // 2) Submit dengan data lengkap tetapi tanpa verifikasi Dapodik tidak boleh
    //    mengirim request apa pun — validasi Dapodik harus menahannya.
    const byId = (id: string) => {
      const el = document.querySelector<HTMLInputElement>(`#${id}`);
      assert.ok(el, `input#${id} tidak ditemukan`);
      return el!;
    };
    await act(async () => {
      setNativeValue(byId('name'), 'Kepala Sekolah Uji');
      setNativeValue(byId('reg-email'), 'kepala@sekolah.sch.id');
      setNativeValue(byId('reg-password'), 'rahasia123');
      setNativeValue(byId('confirm-password'), 'rahasia123');
    });

    const submit = Array.from(document.querySelectorAll('button')).find((b) => b.type === 'submit');
    assert.ok(submit, 'Tombol submit tidak ditemukan');
    assert.match(submit!.textContent!, /Daftar & Buat Sekolah/);

    await act(async () => { submit!.click(); });

    assert.deepEqual(
      calls.filter((url) => url.includes('/api/auth/')),
      [],
      'Submit lolos tanpa verifikasi Dapodik'
    );
  } finally {
    await act(async () => { root.unmount(); });
    globalThis.fetch = originalFetch;
    if (originalResizeObserver) (globalThis as any).ResizeObserver = originalResizeObserver;
    else delete (globalThis as any).ResizeObserver;
    for (const key of globals) {
      const descriptor = descriptors.get(key);
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete (globalThis as any)[key];
    }
  }
});
