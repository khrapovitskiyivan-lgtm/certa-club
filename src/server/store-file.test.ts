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

describe("контракт хранилища", () => {
  it("цена, подтверждение, роли, повтор почты", async () => {
    
    const { fileStore } = await import("./store-file");
    const { runStoreContract } = await import("./store-contract");
    await runStoreContract(fileStore, "f");
  });
});
