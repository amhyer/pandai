# Deteksi anomali IP (middleware + Redis)

## Storage state

| Backend | Kapan |
|---------|--------|
| **Redis (Upstash REST)** | `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` di-set |
| **Memory** | Redis tidak dikonfigurasi, atau request Redis gagal |

Key Redis:

```text
{REDIS_KEY_PREFIX:pandai}:ip-sess:{userId}:{iat}
TTL: 24 jam
```

Nilai: JSON `{ userId, loginIp, lastIp, ips[], windowStartedAt, updatedAt }`.

> Middleware Next.js berjalan di **Edge Runtime**. Karena itu dipakai **Upstash REST** (`@upstash/redis`), bukan koneksi TCP `redis://` (ioredis).

## Mode

`IP_ANOMALY_MODE`:

| Nilai | Perilaku |
|-------|----------|
| `observe` (default) | Log JSON + header `X-IP-Anomaly`; tidak memblokir |
| `stepup` | Blokir POST/PUT/PATCH/DELETE saat hard anomaly |
| `block` | 401 semua request auth saat hard anomaly |

## Env lengkap

```bash
# Wajib untuk shared state multi-instance
UPSTASH_REDIS_REST_URL=https://xxxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=AXxx...

# Alias opsional (sama artinya, URL harus https)
# REDIS_URL=https://xxxx.upstash.io
# REDIS_TOKEN=AXxx...

REDIS_KEY_PREFIX=pandai

IP_ANOMALY_MODE=observe
IP_ANOMALY_ALLOWLIST=103.x.x.x,125.y.y.y
IP_ANOMALY_MAX_CHANGES=8

JWT_SECRET=...
```

## Setup Upstash (ringkas)

1. Buat database di [Upstash Console](https://console.upstash.com/)
2. Copy **REST URL** + **REST TOKEN**
3. Tempel ke `.env` / secrets CI / host
4. `bun add @upstash/redis` (sudah di package.json branch ini)
5. Restart app — log anomaly akan berisi `"backend":"redis"`

Tanpa env Redis, sistem tetap jalan dengan `"backend":"memory"` (cocok dev lokal).

## Hard vs soft

- **ip_jump** — IP beda dari login dan bukan satu prefix /16
- **ip_churn** — lebih dari `IP_ANOMALY_MAX_CHANGES` IP berbeda / 24 jam
- **ip_soft** — ganti IP dalam /16 (tidak memblokir)

## Response blokir

```json
{
  "error": "Sesi mencurigakan (perubahan jaringan). Silakan masuk kembali.",
  "code": "SESSION_IP_ANOMALY",
  "reason": "ip_jump"
}
```

Headers: `X-IP-Anomaly`, `X-IP-Anomaly-Reason`, `X-IP-Anomaly-Backend`.

## Logout (opsional)

Jika route logout mengetahui `userId` + `iat` JWT, panggil:

```ts
import { clearSessionIp } from '@/lib/ip-anomaly';
await clearSessionIp(`${userId}:${iat}`);
```

## Batasan

- Tanpa Redis, state tidak konsisten antar replica.
- Tidak mendeteksi pencurian token dari IP yang sama.
- Allowlist IP sekolah tetap disarankan untuk lab NAT.

## File

- `src/lib/redis.ts`
- `src/lib/client-ip.ts`
- `src/lib/ip-anomaly.ts`
- `src/middleware.ts`
