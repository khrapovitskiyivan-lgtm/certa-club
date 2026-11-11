"use server";

import { redirect } from "next/navigation";
import { hashToken } from "@/core/entry";
import { logEvent } from "@/server/events";
import { hashPassword, verifyPassword } from "@/server/password";
import { currentMember, revokeSessions, startMemberSession } from "@/server/auth";
import { endSession } from "@/server/session";
import { store } from "@/server/store";

export type AuthState = { error?: string };

// Переход по ссылке из письма («Забыли пароль?»): гасим ссылку и входим.
export async function redeemLoginLink(token: string): Promise<AuthState> {
  const link = await store.consumeLoginLink(hashToken(token), new Date());
  if (!link) return { error: "Ссылка недействительна или устарела. Запросите новую на главной" };
  const m = await store.getMember(link.memberId);
  if (!m) return { error: "Участник не найден" };
  if (!(await startMemberSession(m.id))) return { error: "Доступ закрыт. Свяжитесь с куратором клуба" };
  await logEvent("login", `Вход по ссылке из письма: ${m.pseudonym}`, m.id);
  redirect(m.role === "council" ? "/council" : "/club");
}

export async function logout(): Promise<void> {
  await endSession();
  redirect("/");
}

export type SetPasswordState = { error?: string; done?: boolean };

// Задать или сменить пароль. Доступно только уже вошедшему участнику.
export async function setPasswordAction(_prev: SetPasswordState, formData: FormData): Promise<SetPasswordState> {
  const m = await currentMember();
  if (!m) return { error: "Войдите заново" };
  // Смена существующего пароля только с текущим: украденная сессия не должна давать захват входа.
  if (m.passwordHash && !(await verifyPassword(String(formData.get("currentPassword") ?? ""), m.passwordHash))) {
    return { error: "Неверный текущий пароль" };
  }
  const password = String(formData.get("password") ?? "");
  if (password.length < 8) return { error: "Не короче 8 символов" };
  if (password !== String(formData.get("passwordConfirm") ?? "")) return { error: "Пароли не совпадают" };
  await store.updateMember(m.id, { passwordHash: await hashPassword(password) });
  // Смена пароля гасит сессии на всех других устройствах; это устройство остаётся в клубе.
  await revokeSessions(m);
  await startMemberSession(m.id);
  await logEvent("password_set", `${m.passwordHash ? "Сменён" : "Задан"} пароль, другие сессии закрыты: ${m.pseudonym}`, m.id);
  return { done: true };
}

// «Выйти на всех устройствах»: гасит все сессии участника, включая эту.
export async function logoutEverywhere(): Promise<void> {
  const m = await currentMember();
  if (m) {
    await revokeSessions(m);
    await logEvent("logout_all", `Выход на всех устройствах: ${m.pseudonym}`, m.id);
  }
  await endSession();
  redirect("/");
}
