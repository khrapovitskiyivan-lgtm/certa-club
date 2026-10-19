"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { validateOffer, validateRequest, visibleTo, type FieldErrors, type Listing } from "@/core/listing";
import { currentMember } from "@/server/auth";
import { logEvent } from "@/server/events";
import { sendMail } from "@/server/mail";
import { store, type Member } from "@/server/store";
import { cleanName, fileUrl, ownKeys } from "@/core/upload";

// Витрина доступна только подтверждённым участникам.
async function activeMember(): Promise<Member | null> {
  const m = await currentMember();
  return m?.status === "active" ? m : null;
}

export type ListingFormState = { errors?: FieldErrors; values?: Record<string, string>; formError?: string };

type ListingFields = Omit<Listing, "id" | "kind" | "authorId" | "authorPseudonym" | "status" | "createdAt">;

// Разбор формы лота: проверка полей и только свои файлы.
function parseForm(kind: Listing["kind"], formData: FormData, m: Member): { fields: ListingFields } | { errors: FieldErrors; values: Record<string, string> } {
  const values = Object.fromEntries([...formData.entries()].filter(([, v]) => typeof v === "string")) as Record<string, string>;
  if (kind === "offer") {
    const v = validateOffer(values);
    if (!v.ok) return { errors: v.errors, values };
    const d = v.data;
    // Имя документа приходит рядом с ключом через «|».
    const docPairs = formData.getAll("doc").map((r) => String(r).split("|"));
    const docKeys = ownKeys(docPairs.map((x) => x[0]), m.id, "doc");
    return {
      fields: {
        category: d.category,
        title: d.title,
        description: d.description,
        amount: d.priceOnRequest ? undefined : d.price,
        onRequest: Boolean(d.priceOnRequest),
        currency: d.currency,
        quiet: Boolean(d.quiet),
        country: d.country,
        city: d.city,
        photos: ownKeys(formData.getAll("photo"), m.id, "photo").map(fileUrl),
        docs: docKeys.map((k) => ({ key: k, name: cleanName(docPairs.find((x) => x[0] === k)?.slice(1).join("|")) })),
      },
    };
  }
  const v = validateRequest(values);
  if (!v.ok) return { errors: v.errors, values };
  const d = v.data;
  return { fields: { category: d.category, title: d.title, description: d.description, amount: d.budget, currency: d.currency, country: d.country, city: d.city } };
}

// Письмо совету о лоте на проверке. Почта не должна задерживать ответ участнику.
function notifyCouncil(l: Listing, again: boolean) {
  after(async () => {
    const base = process.env.CERTA_BASE_URL ?? "http://localhost:3000";
    const council = (await store.listMembers()).filter((x) => x.role === "council" && x.status === "active");
    for (const c of council) {
      await sendMail(
        c.email,
        again ? "Лот исправлен и снова на проверке" : "Новый лот на проверке",
        `${again ? "Автор исправил лот" : "Новый лот ждёт решения совета"}: «${l.title}» (${l.authorPseudonym}).

Открыть кабинет совета: ${base}/council`,
      );
    }
  });
}

export async function createListing(kind: Listing["kind"], _prev: ListingFormState, formData: FormData): Promise<ListingFormState> {
  const m = await activeMember();
  if (!m) return { formError: "Войдите в клуб" };
  const r = parseForm(kind, formData, m);
  if ("errors" in r) return r;
  const isCouncil = m.role === "council";
  const listing: Listing = {
    ...r.fields,
    id: randomUUID(),
    kind,
    authorId: m.id,
    authorPseudonym: m.pseudonym,
    // Лоты совета публикуются сразу, остальные идут на проверку.
    status: isCouncil ? "active" : "pending",
    createdAt: new Date().toISOString(),
  };
  await store.addListing(listing);
  await logEvent(
    kind === "offer" ? "offer_created" : "request_created",
    `${kind === "offer" ? "Новое предложение" : "Новый запрос"}: «${listing.title}» (${m.pseudonym})${listing.quiet ? ", тихий лот" : ""}${isCouncil ? "" : ", на проверке"}`,
    m.id,
  );
  if (!isCouncil) notifyCouncil(listing, false);
  revalidatePath("/club");
  revalidatePath("/council");
  redirect(`/club/item/${listing.id}`);
}

// Правка своего лота. После правки лот участника снова уходит на проверку.
export async function editListing(id: string, _prev: ListingFormState, formData: FormData): Promise<ListingFormState> {
  const m = await activeMember();
  if (!m) return { formError: "Войдите в клуб" };
  const l = await store.getListing(id);
  if (!l || l.authorId !== m.id || l.status === "withdrawn") return { formError: "Лот недоступен для правки" };
  const r = parseForm(l.kind, formData, m);
  if ("errors" in r) return r;
  const isCouncil = m.role === "council";
  // Правка поднимает версию: решение совета по старой версии не пройдёт.
  const ok = await store.updateListingIf(
    id,
    ["pending", "rejected", "active"],
    { ...r.fields, rev: (l.rev ?? 0) + 1, status: isCouncil ? "active" : "pending", rejectReason: null, reviewedAt: null, reviewedBy: null },
    l.rev ?? 0,
  );
  if (!ok) return { formError: "Лот изменился, обновите страницу" };
  await logEvent("listing_edited", `Лот исправлен: «${r.fields.title}» (${m.pseudonym})${isCouncil ? "" : ", снова на проверке"}`, m.id);
  if (!isCouncil) notifyCouncil({ ...l, ...r.fields }, true);
  revalidatePath("/club");
  revalidatePath("/council");
  revalidatePath(`/club/item/${id}`);
  redirect(`/club/item/${id}`);
}

// Снять объявление может автор или член совета.
export async function withdrawListing(formData: FormData): Promise<void> {
  const m = await activeMember();
  if (!m) return;
  const id = String(formData.get("id") ?? "");
  const l = await store.getListing(id);
  if (!l || (l.authorId !== m.id && m.role !== "council")) return;
  if (await store.withdrawListing(id, new Date())) {
    await logEvent("listing_withdrawn", `Снято: «${l.title}» (${m.pseudonym})`, m.id);
  }
  revalidatePath("/club");
  revalidatePath(`/club/item/${id}`);
}

export type InquiryState = { done?: boolean; error?: string };

// Отклик уходит куратору (совету), стороны напрямую не связываются.
export async function inquire(_prev: InquiryState, formData: FormData): Promise<InquiryState> {
  const m = await activeMember();
  if (!m) return { error: "Войдите в клуб" };
  const l = await store.getListing(String(formData.get("id") ?? ""));
  // Тот же доступ, что и на чтение: тихий лот недоступен тем, кто его не видит.
  if (!l || l.status !== "active" || !visibleTo(l, m.id, m.role === "council")) return { error: "Объявление снято" };
  if (l.authorId === m.id) return { error: "Это ваше объявление" };
  const message = String(formData.get("message") ?? "").trim().slice(0, 1000);
  await store.addInquiry({
    id: randomUUID(),
    listingId: l.id,
    listingKind: l.kind,
    listingTitle: l.title,
    authorId: l.authorId,
    authorPseudonym: l.authorPseudonym,
    fromId: m.id,
    fromPseudonym: m.pseudonym,
    message,
    status: "new",
    createdAt: new Date().toISOString(),
  });
  await logEvent(
    "inquiry",
    `${l.kind === "offer" ? "Запрос по лоту" : "«Есть у меня»"}: «${l.title}», от ${m.pseudonym} к ${l.authorPseudonym}`,
    m.id,
  );
  revalidatePath("/council");
  return { done: true };
}
