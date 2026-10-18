// Чистое ядро приглашений: без IO, только логика и криптографические примитивы.
import { createHash, randomInt, timingSafeEqual } from "node:crypto";

// Алфавит без похожих символов (нет 0/O, 1/I/L), чтобы код можно было продиктовать.
const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
const GROUPS = 3;
const GROUP_LEN = 4;

export type Invite = {
  // Храним только хеш кода: утечка файла не даёт рабочих приглашений.
  codeHash: string;
  // Имя приглашённого, чтобы поприветствовать его на странице регистрации.
  inviteeName: string;
  createdAt: string;
  expiresAt: string;
  usedAt?: string;
};

export type InviteCheck =
  | { ok: true; invite: Invite }
  | { ok: false; reason: "not_found" | "used" | "expired" };

export function generateCode(): string {
  const groups: string[] = [];
  for (let g = 0; g < GROUPS; g++) {
    let s = "";
    for (let i = 0; i < GROUP_LEN; i++) s += ALPHABET[randomInt(ALPHABET.length)];
    groups.push(s);
  }
  return groups.join("-");
}

// Приводит ввод человека к каноническому виду: регистр, пробелы, дефисы.
export function normalizeCode(input: string): string | null {
  const raw = input.toUpperCase().replace(/[\s-]/g, "");
  if (raw.length !== GROUPS * GROUP_LEN) return null;
  for (const ch of raw) if (!ALPHABET.includes(ch)) return null;
  const parts: string[] = [];
  for (let g = 0; g < GROUPS; g++) parts.push(raw.slice(g * GROUP_LEN, (g + 1) * GROUP_LEN));
  return parts.join("-");
}

export function hashCode(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}

function sameHash(a: string, b: string): boolean {
  const ba = Buffer.from(a, "hex");
  const bb = Buffer.from(b, "hex");
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

export function createInvite(inviteeName: string, now: Date, ttlDays: number): { code: string; invite: Invite } {
  const code = generateCode();
  const expires = new Date(now.getTime() + ttlDays * 24 * 60 * 60 * 1000);
  return {
    code,
    invite: {
      codeHash: hashCode(code),
      inviteeName: inviteeName.trim(),
      createdAt: now.toISOString(),
      expiresAt: expires.toISOString(),
    },
  };
}

export function checkInvite(invites: readonly Invite[], input: string, now: Date): InviteCheck {
  const code = normalizeCode(input);
  if (!code) return { ok: false, reason: "not_found" };
  const h = hashCode(code);
  const invite = invites.find((i) => sameHash(i.codeHash, h));
  if (!invite) return { ok: false, reason: "not_found" };
  if (invite.usedAt) return { ok: false, reason: "used" };
  if (new Date(invite.expiresAt).getTime() <= now.getTime()) return { ok: false, reason: "expired" };
  return { ok: true, invite };
}
