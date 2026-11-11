"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { rejectText, type Listing } from "@/core/listing";
import { createInvite } from "@/core/invites";
import { CHECK_METHODS, DEAL_STAGES, PARTY_STAGES, isCheckMethod, isDealStage } from "@/core/deal";
import { currentCouncil, revokeSessions } from "@/server/auth";
import { logEvent } from "@/server/events";
import { sendMail } from "@/server/mail";
import { store } from "@/server/store";
import { baseUrl } from "@/server/base-url";

export type InviteState = { error?: string; link?: string; code?: string; name?: string };

// Подтверждение участия только с указанием, как совет убедился в личности: решение без следа не принимается.
export async function approveMember(formData: FormData): Promise<void> {
  const me = await currentCouncil();
  if (!me) return;
  const id = String(formData.get("id") ?? "");
  const method = String(formData.get("checkMethod") ?? "");
  const note = String(formData.get("checkNote") ?? "").trim().slice(0, 300);
  if (!isCheckMethod(method)) return;
  const m = await store.getMember(id);
  if (!m || m.status !== "kyc_submitted") return;
  const now = new Date().toISOString();
  await store.updateMember(id, { status: "active", activatedAt: now, checkedBy: me.id, checkedAt: now, checkMethod: method, checkNote: note || undefined });
  await logEvent("approved", `Участие подтверждено: ${m.pseudonym}, ${CHECK_METHODS[method].toLowerCase()}${note ? ` (${note})` : ""}, решил ${me.pseudonym}`, id);
  const base = baseUrl();
  after(() =>
    sendMail(
      m.email,
      "Участие в Certa подтверждено",
      `Экспертный совет подтвердил ваше участие. Теперь вы можете размещать вещи, оставлять запросы и откликаться на лоты.

Витрина клуба: ${base}/club`,
    ),
  );
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
  const base = baseUrl();
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

// Блокировка участника: все его сессии гаснут сразу, вход закрыт. Себя заблокировать нельзя,
// поэтому в совете всегда остаётся хотя бы один незаблокированный член.
export async function setBlockedAction(formData: FormData): Promise<void> {
  const me = await currentCouncil();
  if (!me) return;
  const id = String(formData.get("id") ?? "");
  const block = formData.get("block") === "1";
  if (id === me.id) return;
  const m = await store.getMember(id);
  if (!m || Boolean(m.blockedAt) === block) return;
  if (block) {
    await store.updateMember(id, { blockedAt: new Date().toISOString() });
    await revokeSessions(m);
  } else {
    await store.updateMember(id, { blockedAt: null });
  }
  await logEvent(block ? "member_blocked" : "member_unblocked", `${block ? "Заблокирован" : "Разблокирован"}: ${m.pseudonym} (${me.pseudonym})`, id);
  revalidatePath("/council");
}

// Куратор ведёт сделку по отклику: этап и заметка. Каждая смена этапа попадает в журнал.
export async function updateDealAction(formData: FormData): Promise<void> {
  const me = await currentCouncil();
  if (!me) return;
  const id = String(formData.get("id") ?? "");
  const stage = String(formData.get("stage") ?? "");
  const note = String(formData.get("note") ?? "").trim().slice(0, 1000);
  if (!isDealStage(stage)) return;
  const i = await store.getInquiry(id);
  if (!i) return;
  const changed = i.stage !== stage;
  await store.updateInquiry(id, {
    stage,
    note,
    status: stage === "new" ? "new" : "handled",
    ...(changed ? { stageAt: new Date().toISOString() } : {}),
  });
  if (changed) {
    await logEvent("deal_stage", `Сделка «${i.listingTitle}» (${i.fromPseudonym} → ${i.authorPseudonym}): ${DEAL_STAGES[stage]}, ${me.pseudonym}`, me.id);
    // Обеим сторонам письмо о новом этапе; заметка куратора в письмо не попадает.
    if (stage !== "new") {
      const base = baseUrl();
      const p = PARTY_STAGES[stage];
      after(async () => {
        for (const pid of [i.fromId, i.authorId]) {
          const m = await store.getMember(pid);
          if (m) await sendMail(m.email, `Сделка «${i.listingTitle}»: ${p.title.toLowerCase()}`, `${p.title}.

${p.next}

Все ваши сделки: ${base}/club/deals`);
        }
      });
    }
  }
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

// Модерация лотов: решение принимается один раз и только по той версии лота, что совет видел.
// Если автор успел исправить лот, решение не пройдёт, лот останется на проверке в новой версии.
function formRev(formData: FormData): number {
  const n = Number(formData.get("rev"));
  return Number.isInteger(n) && n >= 0 ? n : -1;
}

async function mailAuthor(l: Listing, subject: string, text: string) {
  const author = await store.getMember(l.authorId);
  if (!author) return;
  const base = baseUrl();
  after(() => sendMail(author.email, subject, `${text}\n\nОткрыть лот: ${base}/club/item/${l.id}`));
}

export async function approveListingAction(formData: FormData): Promise<void> {
  const me = await currentCouncil();
  if (!me) return;
  const l = await store.getListing(String(formData.get("id") ?? ""));
  if (!l) return;
  const ok = await store.updateListingIf(l.id, ["pending"], { status: "active", reviewedAt: new Date().toISOString(), reviewedBy: me.id, rejectReason: null }, formRev(formData));
  if (!ok) return;
  await logEvent("listing_approved", `Лот опубликован: «${l.title}» (${l.authorPseudonym}), решил ${me.pseudonym}`, me.id);
  await mailAuthor(l, "Лот опубликован", `Экспертный совет проверил лот «${l.title}» и опубликовал его на витрине Certa.`);
  revalidatePath("/council");
  revalidatePath("/club");
}

export async function rejectListingAction(formData: FormData): Promise<void> {
  const me = await currentCouncil();
  if (!me) return;
  const l = await store.getListing(String(formData.get("id") ?? ""));
  const reason = rejectText(String(formData.get("reason") ?? ""), String(formData.get("note") ?? ""));
  if (!l || !reason) return;
  const ok = await store.updateListingIf(l.id, ["pending"], { status: "rejected", rejectReason: reason, reviewedAt: new Date().toISOString(), reviewedBy: me.id }, formRev(formData));
  if (!ok) return;
  await logEvent("listing_rejected", `Лот отклонён: «${l.title}» (${l.authorPseudonym}), решил ${me.pseudonym}: ${reason}`, me.id);
  await mailAuthor(l, "Лот нужно доработать", `Экспертный совет вернул лот «${l.title}» на доработку.\n\nПричина: ${reason}\n\nИсправьте лот и отправьте его снова: кнопка «Исправить» на странице лота.`);
  revalidatePath("/council");
}
