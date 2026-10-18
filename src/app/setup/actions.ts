"use server";

import { timingSafeEqual } from "node:crypto";
import { createInvite } from "@/core/invites";
import { store } from "@/server/store";

export type SetupState = { link?: string; error?: string };

// Первичная настройка включается только секретом оператора CERTA_SETUP_TOKEN (без него маршрут выключен).
export async function setupTokenValid(input: string): Promise<boolean> {
  const t = process.env.CERTA_SETUP_TOKEN;
  if (!t) return false;
  const a = Buffer.from(input);
  const b = Buffer.from(t);
  return a.length === b.length && timingSafeEqual(a, b);
}

// Одно приглашение для первого члена совета, только в пустой базе и только с секретом оператора.
export async function createFirstInvite(_prev: SetupState, formData: FormData): Promise<SetupState> {
  if (!(await setupTokenValid(String(formData.get("token") ?? "")))) return { error: "Неверный ключ настройки" };
  const name = String(formData.get("name") ?? "").trim();
  if (name.length < 2) return { error: "Укажите имя" };
  const { code, invite } = createInvite(name, new Date(), 2);
  const ok = await store.addFirstInvite({ ...invite, council: true });
  if (!ok) return { error: "Клуб уже настроен" };
  const base = process.env.CERTA_BASE_URL ?? "http://localhost:3000";
  return { link: `${base}/invite/${code}` };
}
