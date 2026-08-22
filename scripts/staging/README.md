# Staging Load Test

## Prasyarat

```bash
npm install -g artillery
```

## Menjalankan Load Test

```bash
# Terhadap staging server
artillery run scripts/staging/load-test.yml --target https://staging.pandai.id

# Terhadap lokal (setelah next start)
artillery run scripts/staging/load-test.yml --target http://localhost:3000

# Dengan output JSON untuk CI/CD
artillery run scripts/staging/load-test.yml --target http://localhost:3000 --output report.json

# Dengan custom jumlah user
artillery run scripts/staging/load-test.yml --target http://localhost:3000 --count 100
```

## Skenario

| Skenario | Bobot | Deskripsi |
|----------|-------|-----------|
| Siswa Login & Browse Exams | 40% | Login, GET /api/exams, GET /api/scores, GET /api/attendance |
| Guru Login & Input Attendance | 25% | Login, GET /api/classes, GET /api/attendance, GET /api/users |
| Orang Tua Login & Monitor | 20% | Login, GET /api/scores, GET /api/attendance, GET /api/character-reports |
| Admin Login & Dashboard | 15% | Login, GET /api/dashboard, GET /api/users, GET /api/activity-logs |

## Phase

| Phase | Durasi | Arrival Rate | Deskripsi |
|-------|--------|-------------|-----------|
| Warmup | 30s | 0.33/s (~10 users) | Pemanasan |
| Peak — Jam Tryout | 120s | 40/s | Simulasi jam tryout |
| Cooldown | 30s | 5/s | Pendinginan |

## Threshold Go/No-Go

| Metrik | Threshold | Status |
|--------|-----------|--------|
| p95 response time | < 2000ms | WAJIB |
| Error rate | < 1% | WAJIB |

## Membaca Hasil

```bash
# Jalankan dan simpan hasil
artillery run scripts/staging/load-test.yml --target http://localhost:3000 --output report.json

# Generate laporan HTML
artillery report report.json
# Buka report.html di browser
```

### Contoh output sukses:
```
All thresholds passed!
  p95 < 2000ms: PASS (actual: 342ms)
  maxErrorRate < 1%: PASS (actual: 0.00%)
```

### Contoh output gagal:
```
Thresholds FAILED:
  p95 < 2000ms: FAIL (actual: 3451ms)
  maxErrorRate < 1%: FAIL (actual: 2.3%)
```
