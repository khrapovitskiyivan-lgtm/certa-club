// Общий контракт хранилищ: одни и те же проверки для файла (локально) и Postgres (прод),
// чтобы поведение двух реализаций не расходилось.
import { expect } from "vitest";
import type { Listing } from "../core/listing";
import type { Member, Store } from "./store-types";

const member = (id: string, patch: Partial<Member> = {}): Member => ({
  id, fullName: "Имя Фамилия", pseudonym: id, email: `${id}@example.test`, phone: "+70000000000", city: "Москва",
  occupation: "", about: "", invitedAs: "Гость", status: "active", createdAt: new Date().toISOString(), ...patch,
});

export async function runStoreContract(store: Store, tag: string) {
  const t = `${tag}${Date.now()}`;
  // Участник появляется только через приглашение.
  let n = 0;
  const join = async (m: Member) => {
    const codeHash = `${t}-inv${n++}`;
    const now = new Date();
    await store.addInvite({ codeHash, inviteeName: "Гость", createdAt: now.toISOString(), expiresAt: new Date(now.getTime() + 86_400_000).toISOString() });
    return store.redeem(codeHash, m, now);
  };
  // Очистка цены при правке: null должен стирать старое значение.
  const lot: Listing = {
    id: `${t}-l`, kind: "request", authorId: "a", authorPseudonym: "A", category: "watches", title: "Ищу часы", description: "",
    amount: 4_000_000, currency: "RUB", country: "Россия", city: "Москва", status: "pending", createdAt: new Date().toISOString(),
  };
  await store.addListing(lot);
  expect(await store.updateListingIf(lot.id, ["pending"], { amount: null }, 0)).toBe(true);
  expect((await store.getListing(lot.id))?.amount ?? null).toBeNull();

  // Подтверждение участия только из kyc_submitted и только один раз.
  const m = member(`${t}-m`, { status: "kyc_submitted" });
  expect(await join(m)).toBe("ok");
  expect(await store.approveMember(m.id, new Date())).toBe(true);
  expect(await store.approveMember(m.id, new Date())).toBe(false);
  expect((await store.getMember(m.id))?.status).toBe("active");

  // Та же почта по другому приглашению: понятный отказ, а не ошибка.
  expect(await join(member(`${t}-dup`, { email: m.email }))).toBe("email_taken");

  // Последнего члена совета снять нельзя.
  const c1 = member(`${t}-c1`, { role: "council" });
  expect(await join(c1)).toBe("ok");
  const before = (await store.listMembers()).filter((x) => x.role === "council" && x.status === "active").length;
  if (before === 1) expect(await store.setMemberRole(c1.id, "member")).toBe("last_council");
  const c2 = member(`${t}-c2`, { role: "council" });
  expect(await join(c2)).toBe("ok");
  expect(await store.setMemberRole(c2.id, "expert")).toBe("ok");
  expect((await store.getMember(c2.id))?.role).toBe("expert");
  expect(await store.setMemberRole("нет-такого", "member")).toBe("missing");
}
