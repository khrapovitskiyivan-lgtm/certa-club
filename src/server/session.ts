// Подписанные cookie-токены: id участника + срок, подпись HMAC. Без хранения сессий на сервере.
// Два вида: полная сессия и короткий «полувход» между паролем и вторым фактором.
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

const SESSION = { name: "certa_session", ttl: 60 * 60 * 24 * 30 };
const PENDING = { name: "certa_pending", ttl: 60 * 10 };
// После перехода по ссылке из письма: почта подтверждена, ждём пароль.
const LINKED = { name: "certa_linked", ttl: 60 * 10 };

function secret(): string {
  const s = process.env.CERTA_SESSION_SECRET;
  if (s) return s;
  if (process.env.NODE_ENV === "production") throw new Error("CERTA_SESSION_SECRET не задан");
  return "dev-only-secret-change-me";
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

async function setToken(kind: typeof SESSION, purpose: string, memberId: string): Promise<void> {
  const exp = Math.floor(Date.now() / 1000) + kind.ttl;
  const payload = `${purpose}.${memberId}.${exp}`;
  (await cookies()).set(kind.name, `${payload}.${sign(payload)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: kind.ttl,
  });
}

async function readToken(kind: typeof SESSION, purpose: string): Promise<string | null> {
  const raw = (await cookies()).get(kind.name)?.value;
  if (!raw) return null;
  const i = raw.lastIndexOf(".");
  const payload = raw.slice(0, i);
  const sig = Buffer.from(raw.slice(i + 1));
  const expected = Buffer.from(sign(payload));
  if (sig.length !== expected.length || !timingSafeEqual(sig, expected)) return null;
  const [p, id, exp] = payload.split(".");
  if (p !== purpose || !id || Number(exp) < Date.now() / 1000) return null;
  return id;
}

export const startSession = (memberId: string) => setToken(SESSION, "s", memberId);
export const sessionMemberId = () => readToken(SESSION, "s");

export const startPending = (memberId: string) => setToken(PENDING, "p", memberId);
export const pendingMemberId = () => readToken(PENDING, "p");

export const startLinked = (memberId: string) => setToken(LINKED, "l", memberId);
export const linkedMemberId = () => readToken(LINKED, "l");

export async function endSession(): Promise<void> {
  const c = await cookies();
  c.delete(SESSION.name);
  c.delete(PENDING.name);
  c.delete(LINKED.name);
}

export async function clearPending(): Promise<void> {
  const c = await cookies();
  c.delete(PENDING.name);
  c.delete(LINKED.name);
}
