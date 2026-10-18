// Одно поле на главной принимает и код приглашения, и почту участника.
import { createHash, randomBytes } from "node:crypto";
import { normalizeCode } from "./invites";

export type Entry = { kind: "code"; code: string } | { kind: "email"; email: string } | { kind: "invalid" };

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function classifyEntry(input: string): Entry {
  const t = input.trim();
  if (t.includes("@")) {
    const email = t.toLowerCase();
    return EMAIL.test(email) ? { kind: "email", email } : { kind: "invalid" };
  }
  const code = normalizeCode(t);
  return code ? { kind: "code", code } : { kind: "invalid" };
}

// Одноразовая ссылка входа: в хранилище только хеш токена.
export type LoginLink = { tokenHash: string; memberId: string; expiresAt: string; usedAt?: string };

export const LINK_TTL_MIN = 15;

export function createLoginLink(memberId: string, now: Date): { token: string; link: LoginLink } {
  const token = randomBytes(32).toString("base64url");
  return {
    token,
    link: {
      tokenHash: hashToken(token),
      memberId,
      expiresAt: new Date(now.getTime() + LINK_TTL_MIN * 60 * 1000).toISOString(),
    },
  };
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function checkLoginLink(link: LoginLink | undefined, now: Date): link is LoginLink {
  return !!link && !link.usedAt && new Date(link.expiresAt).getTime() > now.getTime();
}
