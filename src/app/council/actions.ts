"use server";

import { revalidatePath } from "next/cache";
import { createInvite } from "@/core/invites";
import { currentCouncil } from "@/server/auth";
import { logEvent } from "@/server/events";
import { store } from "@/server/store";

export type InviteState = { error?: string; link?: string; code?: string; name?: string };

export async function approveMember(formData: FormData): Promise<void> {
  if (!(await currentCouncil())) return;
  const id = String(formData.get("id") ?? "");
  const m = await store.getMember(id);
  if (!m || m.status !== "kyc_submitted") return;
  await store.updateMember(id, { status: "active", activatedAt: new Date().toISOString() });
  await logEvent("approved", `Участие подтверждено: ${m.pseudonym}`, id);
  revalidatePath("/council");
}

export async function issueInvite(_prev: InviteState, formData: FormData): Promise<InviteState> {
  if (!(await currentCouncil())) return { error: "Нет прав" };
  const name = String(formData.get("name") ?? "").trim();
  const days = Number(formData.get("days") ?? 14);
  if (name.length < 2) return { error: "Укажите имя приглашённого" };
  if (!Number.isInteger(days) || days < 1 || days > 60) return { error: "Срок от 1 до 60 дней" };
  const { code, invite } = createInvite(name, new Date(), days);
  await store.addInvite(invite);
  await logEvent("invite_created", `Создано приглашение «${invite.inviteeName}» на ${days} дн.`);
  const base = process.env.CERTA_BASE_URL ?? "http://localhost:3000";
  revalidatePath("/council");
  // Код показывается один раз: в хранилище остаётся только хеш.
  return { code, name: invite.inviteeName, link: `${base}/invite/${code}` };
}

// Отзыв неиспользованного приглашения: ссылка перестаёт работать.
export async function revokeInviteAction(formData: FormData): Promise<void> {
  const me = await currentCouncil();
  if (!me) return;
  const codeHash = String(formData.get("codeHash") ?? "");
  const inv = (await store.listInvites()).find((i) => i.codeHash === codeHash);
  if (inv && (await store.revokeInvite(codeHash, new Date()))) {
    await logEvent("invite_revoked", `Отозвано приглашение «${inv.inviteeName}» (${me.pseudonym})`);
  }
  revalidatePath("/council");
}

// Удаление незавершённой регистрации (участник не подтверждён и не член совета).
export async function deleteUnfinishedAction(formData: FormData): Promise<void> {
  const me = await currentCouncil();
  if (!me) return;
  const id = String(formData.get("id") ?? "");
  const m = await store.getMember(id);
  if (m && (await store.deleteUnfinishedMember(id))) {
    await logEvent("member_deleted", `Удалена незавершённая регистрация: ${m.pseudonym} (${m.fullName}) (${me.pseudonym})`);
  }
  revalidatePath("/council");
}
