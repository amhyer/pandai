/**
 * Encryption utility — AES-256-GCM untuk menyimpan rahasia (mis. token OAuth2
 * Google Sheets) di database dalam bentuk ciphertext.
 *
 * Format payload: `v1:<iv-hex>:<authTag-hex>:<ciphertext-hex>`
 *
 * Kunci 32 byte diturunkan dari `AES_SECRET` (disarankan), fallback `JWT_SECRET`.
 * Gunakan `openssl rand -hex 32` dan simpan di env — lihat
 * scripts/generate-credentials.sh & docs/GOOGLE_SHEETS_SYNC_SETUP.md.
 */

import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

const FORMAT_VERSION = 'v1';

function getKey(): Buffer {
  const secret = process.env.AES_SECRET || process.env.JWT_SECRET;
  if (
    !secret ||
    secret.startsWith('replace_with_') ||
    secret.startsWith('dev_jwt_secret')
  ) {
    // Sama dengan kebijakan JWT_SECRET: dev boleh lanjut, production wajib.
    if (process.env.NODE_ENV === 'production') {
      throw new Error('[SECURITY] AES_SECRET (atau JWT_SECRET) wajib dikonfigurasi untuk enkripsi token Sheets');
    }
    return createHash('sha256').update('dev_aes_secret_do_not_use_in_prod').digest();
  }
  if (secret.length < 16) {
    throw new Error('[SECURITY] AES_SECRET terlalu pendek (minimal 16 karakter, disarankan 64 hex)');
  }
  return createHash('sha256').update(secret).digest();
}

/** Enkripsi teks plain menjadi payload v1. */
export function encryptText(plaintext: string): string {
  if (typeof plaintext !== 'string' || !plaintext) {
    throw new Error('encryptText: plaintext wajib string non-kosong');
  }
  const key = getKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${FORMAT_VERSION}:${iv.toString('hex')}:${tag.toString('hex')}:${ciphertext.toString('hex')}`;
}

/**
 * Dekripsi payload v1 yang dibuat `encryptText`.
 * Melempar error jika payload tidak valid / integrity check gagal.
 */
export function decryptText(payload: string): string {
  if (typeof payload !== 'string') throw new Error('decryptText: payload wajib string');
  const parts = payload.split(':');
  if (parts.length !== 4 || parts[0] !== FORMAT_VERSION) {
    throw new Error('decryptText: format payload tidak dikenal');
  }
  const [, ivHex, tagHex, dataHex] = parts;
  const key = getKey();
  const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
  const plaintext = Buffer.concat([decipher.update(Buffer.from(dataHex, 'hex')), decipher.final()]);
  return plaintext.toString('utf8');
}

/** Cek apakah string adalah payload terenkripsi v1 (tanpa memverifikasi isi). */
export function isEncryptedPayload(value: unknown): boolean {
  return typeof value === 'string' && value.startsWith(`${FORMAT_VERSION}:`) && value.split(':').length === 4;
}
