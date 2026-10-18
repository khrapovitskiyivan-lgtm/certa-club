"use server";

import { redirect } from "next/navigation";
import { matchTotp } from "@/core/totp";
import { clientIp, codeLimiter, loginIpLimiter, loginLimiter } from "@/server/auth";
import { verifyPassword } from "@/server/password";
import { clearPending, endSession, linkedMemberId, pendingMemberId, startLinked, startPending, startSession } from "@/server/session";
import { hashToken } from "@/core/entry";
import { store, type Member } from "@/server/store";
import { checkSetupSecret } from "@/server/totp-setup";

export type AuthState = { error?: string; email?: string };

const GENERIC = "Неверная почта или пароль";
const TOO_MANY = "Слишком много попыток. Попробуйте через 15 минут";

function home(m: Member): string {
  return m.role === "council" ? "/council" : m.status === "awaiting_kyc" ? "/verify" : "/club";
}

export async function login(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { error: "Введите почту и пароль", email };
  const now = Date.now();
  const ip = await clientIp();
  if (!loginLimiter.hit(email, now) || (ip && !loginIpLimiter.hit(ip, now))) {
    return { error: TOO_MANY, email };
  }

  const m = await store.findByEmail(email);
  // Хеш проверяем всегда, чтобы время ответа не выдавало, существует ли почта.
  const ok = await verifyPassword(password, m?.passwordHash ?? "scrypt$00$00");
  if (!m || !ok) return { error: GENERIC, email };

  loginLimiter.reset(email);
  await startPending(m.id);
  redirect(m.totpSecret ? "/login/code" : "/login/setup");
}

// Переход по ссылке из письма: гасим ссылку, дальше спрашиваем пароль.
export async function redeemLoginLink(token: string): Promise<AuthState> {
  const link = await store.consumeLoginLink(hashToken(token), new Date());
  if (!link) return { error: "Ссылка недействительна или устарела. Введите почту на главной ещё раз" };
  await startLinked(link.memberId);
  redirect("/login/password");
}

export async function loginWithLink(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const id = await linkedMemberId();
  if (!id) redirect("/");
  const now = Date.now();
  if (!loginLimiter.hit(id, now)) return { error: TOO_MANY };
  const m = await store.getMember(id);
  if (!m) redirect("/");
  if (!(await verifyPassword(String(formData.get("password") ?? ""), m.passwordHash))) {
    return { error: "Неверный пароль" };
  }
  loginLimiter.reset(id);
  await clearPending();
  await startPending(m.id);
  redirect(m.totpSecret ? "/login/code" : "/login/setup");
}

export async function verifyCode(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const id = await pendingMemberId();
  if (!id) redirect("/login");
  if (!codeLimiter.hit(id, Date.now())) return { error: TOO_MANY };
  const m = await store.getMember(id);
  if (!m?.totpSecret) redirect("/login");
  const step = matchTotp(m.totpSecret, String(formData.get("code") ?? ""), Date.now(), m.totpLastStep ?? -1);
  if (step === null) {
    return { error: "Код не подошёл. Дождитесь нового кода в приложении и введите его" };
  }
  await store.updateMember(m.id, { totpLastStep: step });
  codeLimiter.reset(id);
  await clearPending();
  await startSession(m.id);
  redirect(home(m));
}

export async function confirmSetup(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const id = await pendingMemberId();
  if (!id) redirect("/login");
  if (!codeLimiter.hit(id, Date.now())) return { error: TOO_MANY };
  const secret = String(formData.get("secret") ?? "");
  const sig = String(formData.get("sig") ?? "");
  if (!checkSetupSecret(id, secret, sig)) return { error: "Обновите страницу и отсканируйте код заново" };
  const step = matchTotp(secret, String(formData.get("code") ?? ""), Date.now());
  if (step === null) {
    return { error: "Код не подошёл. Проверьте время на телефоне и введите новый код" };
  }
  const m = await store.getMember(id);
  if (!m || m.totpSecret) redirect("/login");
  await store.updateMember(id, { totpSecret: secret, totpLastStep: step });
  codeLimiter.reset(id);
  await clearPending();
  await startSession(id);
  redirect(home(m));
}

export async function logout(): Promise<void> {
  await endSession();
  redirect("/");
}
