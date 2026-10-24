// Подписанные cookie-токены: id участника + срок, подпись HMAC. Без хранения сессий на сервере.
// Два вида: полная сессия и короткий «полувход» между паролем и вторым фактором.
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { store } from "./store";

const SESSION = { name: "certa_session", ttl: 60 * 60 * 24 * 30 };
const PENDING = { name: "certa_pending", ttl: 60 * 10 };
// После перехода по ссылке из письма: почта подтверждена, ждём создания ключа на устройстве.
const LINKED = { name: "certa_linked", ttl: 60 * 10 };
// После регистрации: доступ только к шагу верификации, не к клубу.
const REGISTRATION = { name: "certa_reg", ttl: 60 * 60 * 24 };

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
  return (await readTokenFull(kind, purpose))?.id ?? null;
}

async function readTokenFull(kind: typeof SESSION, purpose: string): Promise<{ id: string; iat: number } | null> {
  const raw = (await cookies()).get(kind.name)?.value;
  if (!raw) return null;
  const i = raw.lastIndexOf(".");
  const payload = raw.slice(0, i);
  const sig = Buffer.from(raw.slice(i + 1));
  const expected = Buffer.from(sign(payload));
  if (sig.length !== expected.length || !timingSafeEqual(sig, expected)) return null;
  const [p, id, exp] = payload.split(".");
  if (p !== purpose || !id || Number(exp) < Date.now() / 1000) return null;
  return { id, iat: Number(exp) - kind.ttl };
}

export const startSession = (memberId: string) => setToken(SESSION, "s", memberId);
// Сессия действительна, только если выдана после последнего «выхода везде» (смены пароля).
export async function sessionMemberId(): Promise<string | null> {
  const t = await readTokenFull(SESSION, "s");
  if (!t) return null;
  const m = await store.getMember(t.id);
  if (!m || t.iat < (m.sessionsValidFrom ?? 0)) return null;
  return t.id;
}

export const startPending = (memberId: string) => setToken(PENDING, "p", memberId);
export const pendingMemberId = () => readToken(PENDING, "p");

export const startRegistration = (memberId: string) => setToken(REGISTRATION, "r", memberId);
export const registrationMemberId = () => readToken(REGISTRATION, "r");

export const startLinked = (memberId: string) => setToken(LINKED, "l", memberId);
export const linkedMemberId = () => readToken(LINKED, "l");

export async function endSession(): Promise<void> {
  const c = await cookies();
  c.delete(SESSION.name);
  c.delete(PENDING.name);
  c.delete(LINKED.name);
  c.delete(REGISTRATION.name);
}

export async function clearPending(): Promise<void> {
  const c = await cookies();
  c.delete(PENDING.name);
  c.delete(LINKED.name);
}

// Челлендж WebAuthn между запросом параметров и ответом устройства: подписанная короткая cookie.
const CHALLENGE = { name: "certa_wa", ttl: 60 * 5 };
type ChallengeData = { purpose: "reg" | "auth"; memberId?: string; challenge: string };

export async function setChallenge(data: ChallengeData): Promise<void> {
  const payload = Buffer.from(JSON.stringify({ ...data, exp: Math.floor(Date.now() / 1000) + CHALLENGE.ttl })).toString("base64url");
  (await cookies()).set(CHALLENGE.name, `${payload}.${sign(payload)}`, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: CHALLENGE.ttl,
  });
}

// Читает и сразу удаляет: челлендж одноразовый.
export async function takeChallenge(purpose: ChallengeData["purpose"]): Promise<ChallengeData | null> {
  const c = await cookies();
  const raw = c.get(CHALLENGE.name)?.value;
  c.delete(CHALLENGE.name);
  if (!raw) return null;
  const i = raw.lastIndexOf(".");
  const payload = raw.slice(0, i);
  const sig = Buffer.from(raw.slice(i + 1));
  const expected = Buffer.from(sign(payload));
  if (sig.length !== expected.length || !timingSafeEqual(sig, expected)) return null;
  const d = JSON.parse(Buffer.from(payload, "base64url").toString()) as ChallengeData & { exp: number };
  if (d.purpose !== purpose || d.exp < Date.now() / 1000) return null;
  return d;
}
