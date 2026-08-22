# Nav Peta Kelas (wajib setelah merge UI + API)

Tambahkan di `src/components/layout/app-layout.tsx`:

## 1. Menu KEPALA_SEKOLAH (section Rekap Sekolah)

```ts
{ label: 'Peta Kelas', view: 'kepsek-peta-kelas', icon: LayoutDashboard },
{ label: 'Rekap Per Kelas', view: 'kepsek-rekap-kelas', icon: GraduationCap },
```

## 2. VIEW_LABELS

```ts
'kepsek-peta-kelas': 'Peta Kelas',
```

## 3. buildBreadcrumbs

```ts
'kepsek-peta-kelas': [{ label: VIEW_LABELS['kepsek-peta-kelas'] }],
```

## Verifikasi API

```bash
# login sebagai kepsek, lalu:
curl -s -b 'pandai_session=...' http://localhost:3000/api/kepsek/class-map | head
```

Harus 200 + `summary.rombel` / `rows[]`. Tanpa cookie → 401.
