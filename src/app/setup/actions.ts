"use server";

import { createInvite } from "@/core/invites";
import { store } from "@/server/store";

export type SetupState = { link?: string; error?: string };

// Первичная настройка: одно приглашение для первого члена совета, только в пустой базе.
export async function createFirstInvite(_prev: SetupState, formData: FormData): Promise<SetupState> {
  const name = String(formData.get("name") ?? "").trim();
  if (name.length < 2) return { error: "Укажите имя" };
  const { code, invite } = createInvite(name, new Date(), 2);
  const ok = await store.addFirstInvite({ ...invite, council: true });
  if (!ok) return { error: "Клуб уже настроен" };
  const base = process.env.CERTA_BASE_URL ?? "http://localhost:3000";
  return { link: `${base}/invite/${code}` };
}
