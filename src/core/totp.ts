// TOTP по RFC 6238 (HMAC-SHA1, 6 цифр, шаг 30 с) на стандартной библиотеке.
// Совместим с Google Authenticator, Яндекс Ключом, 1Password и подобными.
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

const B32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const STEP = 30;
const DIGITS = 6;

export function base32Encode(buf: Buffer): string {
  let bits = 0;
  let value = 0;
  let out = "";
  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += B32[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += B32[(value << (5 - bits)) & 31];
  return out;
}

export function base32Decode(s: string): Buffer {
  const clean = s.toUpperCase().replace(/[^A-Z2-7]/g, "");
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (const ch of clean) {
    value = (value << 5) | B32.indexOf(ch);
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

export function generateSecret(): string {
  return base32Encode(randomBytes(20));
}

export function hotp(secret: string, counter: number): string {
  const msg = Buffer.alloc(8);
  msg.writeBigUInt64BE(BigInt(counter));
  const h = createHmac("sha1", base32Decode(secret)).update(msg).digest();
  const offset = h[h.length - 1] & 15;
  const code = (h.readUInt32BE(offset) & 0x7fffffff) % 10 ** DIGITS;
  return code.toString().padStart(DIGITS, "0");
}

export function totp(secret: string, nowMs: number): string {
  return hotp(secret, Math.floor(nowMs / 1000 / STEP));
}

// Допускаем соседний шаг в обе стороны: расхождение часов телефона и сервера.
export function verifyTotp(secret: string, input: string, nowMs: number): boolean {
  const code = input.replace(/\s/g, "");
  if (!/^\d{6}$/.test(code)) return false;
  const counter = Math.floor(nowMs / 1000 / STEP);
  for (const d of [-1, 0, 1]) {
    const expected = Buffer.from(hotp(secret, counter + d));
    if (timingSafeEqual(expected, Buffer.from(code))) return true;
  }
  return false;
}

export function otpauthUri(secret: string, account: string): string {
  const label = encodeURIComponent(`Certa:${account}`);
  return `otpauth://totp/${label}?secret=${secret}&issuer=Certa&algorithm=SHA1&digits=${DIGITS}&period=${STEP}`;
}
