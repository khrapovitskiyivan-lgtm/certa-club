"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import type { Listing } from "@/core/listing";
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
    await logEvent("member_deleted", `Удалена незавершённая регистрация: ${m.pseudonym} (${me.pseudonym})`);
  }
  revalidatePath("/council");
}

const ROLE_NAMES = { member: "участник", expert: "эксперт", council: "экспертный совет" } as const;
type Role = keyof typeof ROLE_NAMES;

// Смена роли подтверждённого участника. Последнего члена совета снять нельзя.
export async function setRoleAction(formData: FormData): Promise<void> {
  const me = await currentCouncil();
  if (!me) return;
  const id = String(formData.get("id") ?? "");
  const role = String(formData.get("role") ?? "") as Role;
  if (!(role in ROLE_NAMES)) return;
  const m = await store.getMember(id);
  if (!m || m.status !== "active") return;
  const current = (m.role ?? "member") as Role;
  if (current === role) return;
  if (current === "council") {
    const councils = (await store.listMembers()).filter((x) => x.role === "council" && x.status === "active");
    if (councils.length <= 1) return;
  }
  await store.updateMember(id, { role });
  await logEvent("role_changed", `Роль ${m.pseudonym}: ${ROLE_NAMES[current]} → ${ROLE_NAMES[role]} (${me.pseudonym})`, id);
  revalidatePath("/council");
}

// Куратор отметил отклик обработанным (связал стороны).
export async function markInquiryAction(formData: FormData): Promise<void> {
  const me = await currentCouncil();
  if (!me) return;
  await store.markInquiryHandled(String(formData.get("id") ?? ""));
  revalidatePath("/council");
}

// Тестовые лоты для демонстрации витрины. Автор условный, псевдоним «Демо».
const DEMO: Omit<Listing, "id" | "createdAt" | "status" | "authorId" | "authorPseudonym" | "demo">[] = [
  {
    kind: "offer",
    category: "watches",
    title: "Patek Philippe Nautilus 5711/1A",
    description: "Синий циферблат, сталь. Полный комплект: коробка, документы, сервис 2024 года. Тестовый лот.",
    amount: 12500000,
    currency: "RUB",
    country: "Россия",
    city: "Москва",
    photos: ["/demo/watch.svg"],
  },
  {
    kind: "offer",
    category: "jewelry",
    title: "Кольцо с бриллиантом 2,1 карата",
    description: "Платина, сертификат GIA, огранка «принцесса». Тестовый лот.",
    onRequest: true,
    currency: "USD",
    country: "ОАЭ",
    city: "Дубай",
    photos: ["/demo/ring.svg"],
  },
  {
    kind: "offer",
    category: "art",
    title: "Морской пейзаж на закате, холст, масло",
    description: "Конец XIX века, провенанс прослеживается до 1920-х. Экспертиза по запросу. Тестовый лот.",
    amount: 180000,
    currency: "EUR",
    country: "Великобритания",
    city: "Лондон",
    photos: ["/demo/painting.svg"],
  },
  {
    kind: "offer",
    category: "collectibles",
    title: "Золотая монета 1913 года",
    description: "Сохранность AU, в слабе. Тестовый лот.",
    amount: 950000,
    currency: "RUB",
    country: "Россия",
    city: "Санкт-Петербург",
    photos: ["/demo/coin.svg"],
  },
  {
    kind: "request",
    category: "watches",
    title: "Audemars Piguet Royal Oak 15500",
    description: "Синий или серый циферблат, полный комплект. Тестовый запрос.",
    amount: 4000000,
    currency: "RUB",
    country: "Россия",
    city: "Москва",
  },
  {
    kind: "request",
    category: "art",
    title: "Графика русского авангарда",
    description: "Работы на бумаге 1910–1920-х, с провенансом. Тестовый запрос.",
    currency: "EUR",
    country: "Швейцария",
    city: "Женева",
  },
];

export async function createDemoListingsAction(): Promise<void> {
  const me = await currentCouncil();
  if (!me) return;
  const now = new Date().toISOString();
  for (const d of DEMO) {
    await store.addListing({ ...d, id: randomUUID(), authorId: "demo", authorPseudonym: "Демо", demo: true, status: "active", createdAt: now });
  }
  await logEvent("demo_created", `Созданы тестовые лоты (${me.pseudonym})`);
  revalidatePath("/club");
  revalidatePath("/council");
}

export async function withdrawDemoListingsAction(): Promise<void> {
  const me = await currentCouncil();
  if (!me) return;
  const now = new Date();
  for (const l of await store.listListings()) {
    if (l.demo && l.status === "active") await store.withdrawListing(l.id, now);
  }
  await logEvent("demo_withdrawn", `Тестовые лоты сняты (${me.pseudonym})`);
  revalidatePath("/club");
  revalidatePath("/council");
}
