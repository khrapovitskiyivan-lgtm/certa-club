import { describe, expect, it } from "vitest";
import type { Listing } from "../core/listing";

// Проверка запросов к настоящему Postgres. Запускается только с PG_TEST_URL (например, Postgres в Docker).
const url = process.env.PG_TEST_URL;

describe.skipIf(!url)("pgStore: модерация лотов", () => {
  it("статусы, версия, снятие", async () => {
    process.env.DATABASE_URL = url;
    const { pgStore } = await import("./store-pg");
    const id = `t-${Date.now()}`;
    const lot: Listing = {
      id, kind: "offer", authorId: "a", authorPseudonym: "A", category: "watches", title: "Часы", description: "Описание лота",
      currency: "RUB", country: "Россия", city: "Москва", status: "pending", createdAt: new Date().toISOString(),
      photos: ["/api/file/u/a/photo/x.jpg"], docs: [{ key: "u/a/doc/x.pdf", name: "Паспорт.pdf" }],
    };
    await pgStore.addListing(lot);
    // Отказ по версии 0.
    expect(await pgStore.updateListingIf(id, ["pending"], { status: "rejected", rejectReason: "Нужны фото" }, 0)).toBe(true);
    expect((await pgStore.getListing(id))?.rejectReason).toBe("Нужны фото");
    // Правка автора: версия 1, причина сброшена (null), снова на проверке.
    expect(await pgStore.updateListingIf(id, ["pending", "rejected", "active"], { title: "Часы, исправлено", rev: 1, status: "pending", rejectReason: null }, 0)).toBe(true);
    const edited = await pgStore.getListing(id);
    expect([edited?.status, edited?.rev, edited?.rejectReason, edited?.title]).toEqual(["pending", 1, null, "Часы, исправлено"]);
    // Совет смотрел старую версию: не проходит.
    expect(await pgStore.updateListingIf(id, ["pending"], { status: "active" }, 0)).toBe(false);
    // Актуальная версия: проходит один раз.
    expect(await pgStore.updateListingIf(id, ["pending"], { status: "active" }, 1)).toBe(true);
    expect(await pgStore.updateListingIf(id, ["pending"], { status: "rejected" }, 1)).toBe(false);
    // Без версии (снятие и прочее) работает как раньше.
    expect(await pgStore.withdrawListing(id, new Date())).toBe(true);
    expect(await pgStore.withdrawListing(id, new Date())).toBe(false);
    expect((await pgStore.getListing(id))?.docs?.[0].name).toBe("Паспорт.pdf");
  });
});

describe.skipIf(!url)("pgStore: сделки, эксперты, лимиты, участники", () => {
  it("отклик: этап и заметка", async () => {
    process.env.DATABASE_URL = url;
    const { pgStore } = await import("./store-pg");
    const id = `i-${Date.now()}`;
    await pgStore.addInquiry({
      id, listingId: "l", listingKind: "offer", listingTitle: "Часы", authorId: "s", authorPseudonym: "S",
      fromId: "b", fromPseudonym: "B", message: "Хочу осмотр", status: "new", createdAt: new Date().toISOString(),
    });
    expect((await pgStore.getInquiry(id))?.stage).toBeUndefined();
    expect(await pgStore.updateInquiry(id, { status: "handled", stage: "contract", note: "Звонил", stageAt: "2026-11-13T10:00:00Z" })).toBe(true);
    const got = await pgStore.getInquiry(id);
    expect([got?.stage, got?.note, got?.status, got?.message]).toEqual(["contract", "Звонил", "handled", "Хочу осмотр"]);
    expect(await pgStore.updateInquiry("нет-такого", { stage: "closed" })).toBe(false);
    expect((await pgStore.listInquiries()).some((x) => x.id === id && x.stage === "contract")).toBe(true);
  });

  it("эксперты: запись, правка, удаление", async () => {
    const { pgStore } = await import("./store-pg");
    const id = `e-${Date.now()}`;
    const now = new Date().toISOString();
    const e = { id, fullName: "Иван Петров", nameMode: "initials" as const, field: "watches" as const, specialization: "Механика", credentials: "20 лет", city: "Москва", published: false, createdAt: now, updatedAt: now };
    await pgStore.putExpert(e);
    await pgStore.putExpert({ ...e, published: true, consentAt: now, experienceYears: 20 });
    const got = await pgStore.getExpert(id);
    expect([got?.published, got?.experienceYears, got?.consentAt]).toEqual([true, 20, now]);
    expect((await pgStore.listExperts()).filter((x) => x.id === id)).toHaveLength(1);
    expect(await pgStore.deleteExpert(id)).toBe(true);
    expect(await pgStore.deleteExpert(id)).toBe(false);
    expect(await pgStore.getExpert(id)).toBeUndefined();
  });

  it("лимит: параллельные попытки не превышают максимум, сброс", async () => {
    const { pgStore } = await import("./store-pg");
    const key = `k-${Date.now()}`;
    const now = Date.now();
    const r = await Promise.all(Array.from({ length: 10 }, () => pgStore.hitLimit(key, 3, 60_000, now)));
    expect(r.filter(Boolean)).toHaveLength(3);
    // Окно прошло: снова можно.
    expect(await pgStore.hitLimit(key, 3, 60_000, now + 61_000)).toBe(true);
    await pgStore.resetLimit(key);
    expect(await pgStore.hitLimit(key, 1, 60_000, now)).toBe(true);
  });

  it("участник: блокировка, снятие блокировки, версия сессий", async () => {
    const { pgStore } = await import("./store-pg");
    const id = `m-${Date.now()}`;
    const code = `c-${id}`;
    await pgStore.addInvite({ codeHash: code, inviteeName: "Тест", createdAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 86_400_000).toISOString() });
    const m = { id, fullName: "Тест", pseudonym: "Т", email: `${id}@x.test`, phone: "+7", city: "М", occupation: "-", about: "-", invitedAs: "Тест", status: "active" as const, createdAt: new Date().toISOString() };
    expect(await pgStore.redeem(code, m, new Date())).toBe("ok");
    expect(await pgStore.updateMember(id, { blockedAt: "2026-11-13T10:00:00Z", sessionVersion: 2, checkMethod: "video_call" })).toBe(true);
    expect((await pgStore.findByEmail(`${id}@x.test`))?.blockedAt).toBe("2026-11-13T10:00:00Z");
    expect(await pgStore.updateMember(id, { blockedAt: null })).toBe(true);
    const got = await pgStore.getMember(id);
    expect([got?.blockedAt ?? null, got?.sessionVersion, got?.checkMethod]).toEqual([null, 2, "video_call"]);
  });
});
