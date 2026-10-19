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
