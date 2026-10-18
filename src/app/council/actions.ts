"use server";

import { revalidatePath } from "next/cache";
import { createInvite } from "@/core/invites";
import { currentCouncil } from "@/server/auth";
import { store } from "@/server/store";

export type InviteState = { error?: string; link?: string; code?: string; name?: string };

export async function approveMember(formData: FormData): Promise<void> {
  if (!(await currentCouncil())) return;
  const id = String(formData.get("id") ?? "");
  const m = await store.getMember(id);
  if (!m || m.status !== "kyc_submitted") return;
  await store.updateMember(id, { status: "active", activatedAt: new Date().toISOString() });
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
  const base = process.env.CERTA_BASE_URL ?? "http://localhost:3000";
  revalidatePath("/council");
  // Код показывается один раз: в хранилище остаётся только хеш.
  return { code, name: invite.inviteeName, link: `${base}/invite/${code}` };
}
