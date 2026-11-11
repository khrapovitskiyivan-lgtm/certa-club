import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import type { Listing } from "../core/listing";

let fileStore: typeof import("./store-file").fileStore;

beforeAll(async () => {
  process.env.CERTA_DATA_DIR = mkdtempSync(path.join(tmpdir(), "certa-"));
  ({ fileStore } = await import("./store-file"));
});

const lot = (): Listing => ({
  id: "l1", kind: "offer", authorId: "a", authorPseudonym: "A", category: "watches", title: "Часы", description: "Описание лота",
  currency: "RUB", country: "Россия", city: "Москва", status: "pending", createdAt: new Date().toISOString(),
});

describe("модерация по версии лота", () => {
  it("решение по старой версии не проходит", async () => {
    await fileStore.addListing(lot());
    // Автор исправил лот: версия 0 -> 1.
    expect(await fileStore.updateListingIf("l1", ["pending"], { title: "Часы, исправлено", rev: 1 }, 0)).toBe(true);
    // Совет смотрел версию 0: публикация отклоняется.
    expect(await fileStore.updateListingIf("l1", ["pending"], { status: "active" }, 0)).toBe(false);
    expect((await fileStore.getListing("l1"))?.status).toBe("pending");
    // По актуальной версии проходит, и только один раз.
    expect(await fileStore.updateListingIf("l1", ["pending"], { status: "active" }, 1)).toBe(true);
    expect(await fileStore.updateListingIf("l1", ["pending"], { status: "rejected" }, 1)).toBe(false);
  });
});

describe("лимиты попыток в хранилище", () => {
  it("считает попытки в окне и сбрасывается", async () => {
    const t = 1_000_000;
    for (let i = 0; i < 3; i++) expect(await fileStore.hitLimit("login:a@b", 3, 1000, t + i)).toBe(true);
    expect(await fileStore.hitLimit("login:a@b", 3, 1000, t + 10)).toBe(false);
    // Другой ключ не затронут.
    expect(await fileStore.hitLimit("login:c@d", 3, 1000, t + 10)).toBe(true);
    // Окно прошло: снова можно.
    expect(await fileStore.hitLimit("login:a@b", 3, 1000, t + 2000)).toBe(true);
    await fileStore.resetLimit("login:a@b");
    for (let i = 0; i < 3; i++) expect(await fileStore.hitLimit("login:a@b", 3, 1000, t + 2001)).toBe(true);
  });
});

describe("битый файл хранилища", () => {
  it("не читается как пустая база", async () => {
    const { writeFile } = await import("node:fs/promises");
    await writeFile(path.join(process.env.CERTA_DATA_DIR!, "store.json"), "{битый", "utf8");
    await expect(fileStore.isEmpty()).rejects.toThrow();
  });
});
