import { describe, expect, it } from "vitest";
import { displayName, expertsForCategory, validateExpert, yearsText } from "./expert";

const base = { fullName: "Иван Петрович Сидоров", nameMode: "initials", field: "watches", credentials: "Часовой мастер, 20 лет практики", experienceYears: "20" };

describe("профиль эксперта", () => {
  it("валидный профиль без публикации", () => {
    const r = validateExpert(base);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data).toMatchObject({ experienceYears: 20, published: false, consent: false });
  });
  it("публикация без согласия запрещена", () => {
    const r = validateExpert({ ...base, published: "on" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.published).toBeDefined();
    expect(validateExpert({ ...base, published: "on", consent: "on" }).ok).toBe(true);
  });
  it("стаж необязателен, но в пределах", () => {
    const r = validateExpert({ ...base, experienceYears: "" });
    expect(r.ok && r.data.experienceYears).toBe(undefined);
    expect(validateExpert({ ...base, experienceYears: "200" }).ok).toBe(false);
  });
  it("неизвестное направление отклоняется", () => {
    expect(validateExpert({ ...base, field: "toString" }).ok).toBe(false);
  });
  it("имя инициалами", () => {
    expect(displayName({ fullName: "Иван Петрович Сидоров", nameMode: "initials" })).toBe("И. П. Сидоров");
    expect(displayName({ fullName: "Анна Смирнова", nameMode: "full" })).toBe("Анна Смирнова");
    expect(displayName({ fullName: "Смирнова", nameMode: "initials" })).toBe("Смирнова");
  });
  it("стаж словами", () => {
    expect([1, 3, 11, 12, 15, 21, 22, 25].map(yearsText)).toEqual(["1 год", "3 года", "11 лет", "12 лет", "15 лет", "21 год", "22 года", "25 лет"]);
  });
});

describe("эксперты у лота", () => {
  const e = (field: string, published = true, consentAt: string | null = "2026-11-11") => ({ field, published, consentAt }) as never;
  it("только опубликованные с согласием и по направлению категории", () => {
    const list = [e("watches"), e("gems"), e("watches", false), e("watches", true, null)];
    expect(expertsForCategory(list, "watches")).toHaveLength(1);
    expect(expertsForCategory(list, "jewelry")).toHaveLength(1);
    expect(expertsForCategory(list, "art")).toHaveLength(0);
  });
  it("основное направление первым", () => {
    const r = expertsForCategory([e("icons"), e("art")], "art") as { field: string }[];
    expect(r.map((x) => x.field)).toEqual(["art", "icons"]);
  });
});
