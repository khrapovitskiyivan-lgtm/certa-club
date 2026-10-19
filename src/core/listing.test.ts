import { describe, expect, it } from "vitest";
import { formatAmount, rejectText, validateOffer, validateRequest, visibleTo, type Listing } from "./listing";

const offer = {
  category: "watches",
  title: "Patek Philippe Nautilus 5711",
  description: "Полный комплект, сервис 2024 года.",
  price: "12 500 000",
  currency: "RUB",
  country: "Россия",
  city: "Москва",
};

describe("предложение", () => {
  it("принимает цену с пробелами", () => {
    const r = validateOffer(offer);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data.price).toBe(12500000);
  });

  it("цена или «по запросу» обязательны", () => {
    const r = validateOffer({ ...offer, price: "" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.price).toBeDefined();
    expect(validateOffer({ ...offer, price: "", priceOnRequest: "on" }).ok).toBe(true);
  });

  it("страна и город обязательны", () => {
    const r = validateOffer({ ...offer, country: "", city: "" });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.errors.country).toBeDefined();
      expect(r.errors.city).toBeDefined();
    }
  });

  it("неизвестная категория", () => {
    const r = validateOffer({ ...offer, category: "cars" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.category).toBe("Выберите категорию");
  });
});

describe("запрос", () => {
  it("бюджет необязателен", () => {
    const r = validateRequest({ category: "art", title: "Работа Айвазовского", budget: "", country: "ОАЭ", city: "Дубай" });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data.budget).toBeUndefined();
  });
});

describe("видимость", () => {
  const base: Listing = {
    id: "1",
    kind: "offer",
    authorId: "a",
    authorPseudonym: "A",
    category: "watches",
    title: "t",
    description: "d",
    currency: "RUB",
    country: "Россия",
    city: "Москва",
    status: "active",
    createdAt: "",
  };

  it("обычный лот видят все участники", () => {
    expect(visibleTo(base, "b", false)).toBe(true);
  });

  it("тихий лот видят только автор и совет", () => {
    const q = { ...base, quiet: true };
    expect(visibleTo(q, "b", false)).toBe(false);
    expect(visibleTo(q, "a", false)).toBe(true);
    expect(visibleTo(q, "b", true)).toBe(true);
  });

  it("снятый лот пропадает из общей ленты", () => {
    const w = { ...base, status: "withdrawn" as const };
    expect(visibleTo(w, "b", false)).toBe(false);
  });
});

it("формат суммы", () => {
  expect(formatAmount(12500000, "RUB").replace(/\s/g, " ")).toBe("12 500 000 ₽");
  expect(formatAmount(undefined, "USD")).toBe("");
});

describe("причина отказа", () => {
  it("из списка, с уточнением, другое требует текста", () => {
    expect(rejectText("docs", "")).toBe("Не хватает документов о происхождении");
    expect(rejectText("docs", "нужен паспорт часов")).toBe("Не хватает документов о происхождении. Нужен паспорт часов");
    expect(rejectText("other", "")).toBeNull();
    expect(rejectText("other", "Дубликат лота")).toBe("Дубликат лота");
    expect(rejectText("bogus", "x")).toBeNull();
  });
});
