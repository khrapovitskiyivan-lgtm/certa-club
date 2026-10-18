import { describe, expect, it } from "vitest";
import { checkInvite, createInvite, generateCode, normalizeCode } from "./invites";
import { validateRegistration } from "./registration";

const NOW = new Date("2026-10-18T10:00:00Z");

describe("коды приглашений", () => {
  it("генерирует код формата XXXX-XXXX-XXXX без похожих символов", () => {
    for (let i = 0; i < 200; i++) {
      const c = generateCode();
      expect(c).toMatch(/^[2-9A-HJKMNP-Z]{4}-[2-9A-HJKMNP-Z]{4}-[2-9A-HJKMNP-Z]{4}$/);
    }
  });

  it("нормализует регистр, пробелы и дефисы", () => {
    expect(normalizeCode(" k7qx m2pa-9dbc ")).toBe("K7QX-M2PA-9DBC");
    expect(normalizeCode("K7QXM2PA9DBC")).toBe("K7QX-M2PA-9DBC");
  });

  it("отвергает неверную длину и чужие символы", () => {
    expect(normalizeCode("K7QX-M2PA")).toBeNull();
    expect(normalizeCode("K7QX-M2PA-9DB0")).toBeNull();
  });
});

describe("проверка приглашения", () => {
  it("находит действующее приглашение по коду", () => {
    const { code, invite } = createInvite("Сергей", NOW, 14);
    const r = checkInvite([invite], code.toLowerCase(), NOW);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.invite.inviteeName).toBe("Сергей");
  });

  it("не хранит сам код", () => {
    const { code, invite } = createInvite("Сергей", NOW, 14);
    expect(JSON.stringify(invite)).not.toContain(code);
  });

  it("неизвестный код", () => {
    const { invite } = createInvite("Сергей", NOW, 14);
    expect(checkInvite([invite], generateCode(), NOW)).toEqual({ ok: false, reason: "not_found" });
  });

  it("использованное приглашение", () => {
    const { code, invite } = createInvite("Сергей", NOW, 14);
    const used = { ...invite, usedAt: NOW.toISOString() };
    expect(checkInvite([used], code, NOW)).toEqual({ ok: false, reason: "used" });
  });

  it("просроченное приглашение", () => {
    const { code, invite } = createInvite("Сергей", NOW, 14);
    const later = new Date(NOW.getTime() + 15 * 24 * 3600 * 1000);
    expect(checkInvite([invite], code, later)).toEqual({ ok: false, reason: "expired" });
  });
});

describe("форма регистрации", () => {
  const valid = {
    fullName: "Сергей Петров",
    pseudonym: "Collector 7",
    email: "S@Example.com",
    phone: "+7 900 123-45-67",
    city: "Москва",
    occupation: "Собственник бизнеса",
    password: "очень-длинный-пароль",
    passwordConfirm: "очень-длинный-пароль",
    agreeRules: "on",
  };

  it("принимает корректные данные и нормализует почту", () => {
    const r = validateRegistration(valid);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data.email).toBe("s@example.com");
  });

  it("требует согласия с правилами", () => {
    const r = validateRegistration({ ...valid, agreeRules: undefined });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.agreeRules).toBeDefined();
  });

  it("ловит несовпадение паролей", () => {
    const r = validateRegistration({ ...valid, passwordConfirm: "другой-пароль-123" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.passwordConfirm).toBe("Пароли не совпадают");
  });

  it("показывает все ошибки сразу, включая несовпадение паролей", () => {
    const r = validateRegistration({ ...valid, agreeRules: undefined, passwordConfirm: "другой-пароль-123" });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.errors.agreeRules).toBeDefined();
      expect(r.errors.passwordConfirm).toBe("Пароли не совпадают");
    }
  });

  it("короткий пароль", () => {
    const r = validateRegistration({ ...valid, password: "short", passwordConfirm: "short" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.password).toBeDefined();
  });
});
