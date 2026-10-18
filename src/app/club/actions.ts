"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { validateOffer, validateRequest, type FieldErrors, type Listing } from "@/core/listing";
import { currentMember } from "@/server/auth";
import { logEvent } from "@/server/events";
import { store, type Member } from "@/server/store";

// Витрина доступна только подтверждённым участникам.
async function activeMember(): Promise<Member | null> {
  const m = await currentMember();
  return m?.status === "active" ? m : null;
}

export type ListingFormState = { errors?: FieldErrors; values?: Record<string, string>; formError?: string };

export async function createListing(
  kind: Listing["kind"],
  _prev: ListingFormState,
  formData: FormData,
): Promise<ListingFormState> {
  const m = await activeMember();
  if (!m) return { formError: "Войдите в клуб" };
  const values = Object.fromEntries(formData) as Record<string, string>;
  const base = {
    id: randomUUID(),
    kind,
    authorId: m.id,
    authorPseudonym: m.pseudonym,
    status: "active" as const,
    createdAt: new Date().toISOString(),
  };

  let listing: Listing;
  if (kind === "offer") {
    const v = validateOffer(values);
    if (!v.ok) return { errors: v.errors, values };
    const d = v.data;
    listing = {
      ...base,
      category: d.category,
      title: d.title,
      description: d.description,
      amount: d.priceOnRequest ? undefined : d.price,
      onRequest: Boolean(d.priceOnRequest),
      currency: d.currency,
      quiet: Boolean(d.quiet),
      country: d.country,
      city: d.city,
    };
  } else {
    const v = validateRequest(values);
    if (!v.ok) return { errors: v.errors, values };
    const d = v.data;
    listing = {
      ...base,
      category: d.category,
      title: d.title,
      description: d.description,
      amount: d.budget,
      currency: d.currency,
      country: d.country,
      city: d.city,
    };
  }

  await store.addListing(listing);
  await logEvent(
    kind === "offer" ? "offer_created" : "request_created",
    `${kind === "offer" ? "Новое предложение" : "Новый запрос"}: «${listing.title}» (${m.pseudonym})${listing.quiet ? ", тихий лот" : ""}`,
    m.id,
  );
  revalidatePath("/club");
  redirect(`/club/item/${listing.id}`);
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
  if (!l || l.status !== "active") return { error: "Объявление снято" };
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
