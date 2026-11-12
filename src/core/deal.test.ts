import { describe, expect, it } from "vitest";
import { dealRole, dealStatusMail, dealSteps, isCheckMethod, isDealStage, isOpenStage, stageOf } from "./deal";

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
