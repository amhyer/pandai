# Deteksi anomali IP (middleware)

## Mode

Set env `IP_ANOMALY_MODE`:

| Nilai | Perilaku |
|-------|----------|
| `observe` (default) | Log JSON + header `X-IP-Anomaly`; **tidak** memblokir |
| `stepup` | Blokir POST/PUT/PATCH/DELETE saat anomali **hard**; GET tetap jalan |
| `block` | 401 semua request terautentikasi saat anomali hard |

## Env lain

```bash
IP_ANOMALY_MODE=observe
IP_ANOMALY_ALLOWLIST=103.x.x.x,125.y.y.y   # IP publik sekolah (opsional)
IP_ANOMALY_MAX_CHANGES=8                    # max IP berbeda / 24 jam sebelum hard
JWT_SECRET=...                              # wajib sama dengan auth
```

## Kapan “hard” anomaly

1. **ip_jump** — IP saat ini beda dari IP login dan bukan satu prefix /16
2. **ip_churn** — lebih dari `IP_ANOMALY_MAX_CHANGES` IP berbeda dalam 24 jam

Soft (`ip_soft`): ganti IP dalam /16 yang sama (NAT/mobile) → tidak memblokir.

## Response saat diblokir

```json
{
  "error": "Sesi mencurigakan (perubahan jaringan). Silakan masuk kembali.",
  "code": "SESSION_IP_ANOMALY",
  "reason": "ip_jump"
}
```

Status: `401`. Client sebaiknya clear state + redirect login.

## Batasan

- State di **memory** per instance Node/Edge. Multi-replica butuh Redis/KV.
- Tidak mendeteksi pencurian token dari **IP yang sama**.
- Lab sekolah dengan satu IP publik: andalkan allowlist + RBAC, bukan IP saja.

## File

- `src/lib/client-ip.ts` — ekstraksi IP
- `src/lib/ip-anomaly.ts` — tracker + verdict
- `src/middleware.ts` — integrasi rate limit + anomaly
