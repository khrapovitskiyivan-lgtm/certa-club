import { describe, expect, it } from "vitest";
import { councilInquiryMail, dealRole, dealStatusMail, dealSteps, lotStatus, isCheckMethod, isDealStage, isOpenStage, stageOf } from "./deal";

describe("этапы сделки", () => {
  it("принимает только известные этапы", () => {
    expect(isDealStage("expertise")).toBe(true);
    expect(isDealStage("toString")).toBe(false);
    expect(isDealStage("")).toBe(false);
  });
  it("закрытая и отменённая не открыты", () => {
    expect(isOpenStage("payment")).toBe(true);
    expect(isOpenStage("closed")).toBe(false);
    expect(isOpenStage("cancelled")).toBe(false);
  });
  it("ранние отклики без этапа читаются по статусу", () => {
    expect(stageOf({ status: "new" })).toBe("new");
    expect(stageOf({ status: "handled" })).toBe("connected");
    expect(stageOf({ status: "handled", stage: "contract" })).toBe("contract");
  });
  it("способ проверки только из списка", () => {
    expect(isCheckMethod("passport_in_person")).toBe(true);
    expect(isCheckMethod("constructor")).toBe(false);
  });
});

describe("сделка глазами сторон", () => {
  const offer = { listingKind: "offer" as const, authorId: "seller", fromId: "buyer" };
  const request = { listingKind: "request" as const, authorId: "buyer", fromId: "seller" };
  it("роль по виду объявления", () => {
    expect(dealRole(offer, "buyer")).toBe("buyer");
    expect(dealRole(offer, "seller")).toBe("seller");
    expect(dealRole(request, "buyer")).toBe("buyer");
    expect(dealRole(request, "seller")).toBe("seller");
    expect(dealRole(offer, "stranger")).toBeNull();
  });
  it("полоса этапов", () => {
    const st = dealSteps("contract").map((x) => x.state);
    expect(st).toEqual(["done", "done", "done", "current", "todo", "todo", "todo"]);
    expect(dealSteps("closed").every((x) => x.state === "done")).toBe(true);
    // Отменённая сделка: ни один шаг не текущий.
    expect(dealSteps("cancelled").some((x) => x.state === "current")).toBe(false);
  });
});

describe("письмо о статусе сделки", () => {
  it("роль, этап, путь с отметками и ссылка", () => {
    const m = dealStatusMail({ role: "seller", pseudonym: "Хронос", title: "Часы", stage: "contract" }, "https://x/club/deals");
    expect(m.subject).toBe("Сделка «Часы»: договор");
    expect(m.text).toContain("Вы продаёте «Часы».");
    expect(m.text).toContain("3. Экспертиза: пройдено");
    expect(m.text).toContain("4. Договор: сейчас");
    expect(m.text).toContain("5. Деньги в банке\n");
    expect(m.text).toContain("https://x/club/deals");
    expect(m.text).not.toContain("—");
  });
  it("остановленная сделка без пути", () => {
    const m = dealStatusMail({ role: "buyer", pseudonym: "К", title: "Монета", stage: "cancelled" }, "u");
    expect(m.text).toContain("Вы покупаете");
    expect(m.text).not.toContain("Ход сделки");
  });
});

describe("статус своего лота", () => {
  it("по статусу лота", () => {
    expect(lotStatus({ status: "pending" }, []).label).toBe("На проверке у совета");
    expect(lotStatus({ status: "active", quiet: true }, []).label).toBe("Тихий лот");
    expect(lotStatus({ status: "active" }, []).deals).toBe("Откликов пока нет");
    const r = lotStatus({ status: "rejected", rejectReason: "Фото" }, []);
    expect(r.hint).toContain("Причина: Фото.");
  });
  it("отклики: число и самый продвинутый этап", () => {
    const d = lotStatus({ status: "active" }, [{ status: "new" }, { status: "handled", stage: "contract" }, { status: "handled", stage: "cancelled" }]);
    expect(d.deals).toBe("Откликов: 3, дальше всех: договор");
    expect(lotStatus({ status: "active" }, [{ status: "handled", stage: "closed" }]).deals).toBe("Откликов: 1, закрыто сделок: 1");
  });
});

describe("письмо совету о новом отклике", () => {
  const buyer = { pseudonym: "Коллекционер", fullName: "Тест Покупатель", phone: "+7 (912) 000-00-01", email: "b@x.test" };
  const seller = { pseudonym: "Хронос", fullName: "Тест Продавец", phone: "+7 (912) 000-00-02", email: "s@x.test" };
  it("обе стороны с контактами и комментарий", () => {
    const m = councilInquiryMail({ kind: "offer", title: "Часы", message: "Хочу осмотр", from: buyer, author: seller, authorPseudonym: "Хронос" }, "https://x/council");
    expect(m.subject).toBe("Новый отклик: «Часы»");
    expect(m.text).toContain("Покупатель: Коллекционер\n  Тест Покупатель\n  +7 (912) 000-00-01\n  b@x.test");
    expect(m.text).toContain("Продавец: Хронос\n  Тест Продавец");
    expect(m.text).toContain("Комментарий: Хочу осмотр");
    expect(m.text).not.toContain("—");
  });
  it("у запроса роли наоборот, тестовый автор без контактов", () => {
    const m = councilInquiryMail({ kind: "request", title: "Монета", message: "", from: seller, author: null, authorPseudonym: "Демо" }, "u");
    expect(m.text).toContain("Продавец: Хронос");
    expect(m.text).toContain("Покупатель: Демо (тестовый или удалённый автор)");
    expect(m.text).toContain("Комментария нет.");
  });
});
