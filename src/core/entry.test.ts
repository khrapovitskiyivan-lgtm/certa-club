import { describe, expect, it } from "vitest";
import { checkLoginLink, classifyEntry, createLoginLink, hashToken } from "./entry";

const NOW = new Date("2026-10-18T10:00:00Z");

describe("поле на главной", () => {
  it("узнаёт код приглашения в любом виде", () => {
    expect(classifyEntry(" ks4y vbu3 wuwe ")).toEqual({ kind: "code", code: "KS4Y-VBU3-WUWE" });
  });

  it("узнаёт почту и приводит к нижнему регистру", () => {
    expect(classifyEntry(" Anna@Example.COM ")).toEqual({ kind: "email", email: "anna@example.com" });
  });

  it("всё прочее считает неверным вводом", () => {
    expect(classifyEntry("привет")).toEqual({ kind: "invalid" });
    expect(classifyEntry("anna@")).toEqual({ kind: "invalid" });
  });
});

describe("ссылка входа", () => {
  it("хранит только хеш токена и действует 15 минут", () => {
    const { token, link } = createLoginLink("m1", NOW);
    expect(JSON.stringify(link)).not.toContain(token);
    expect(link.tokenHash).toBe(hashToken(token));
    expect(checkLoginLink(link, NOW)).toBe(true);
    expect(checkLoginLink(link, new Date(NOW.getTime() + 16 * 60 * 1000))).toBe(false);
  });

  it("одноразовая", () => {
    const { link } = createLoginLink("m1", NOW);
    expect(checkLoginLink({ ...link, usedAt: NOW.toISOString() }, NOW)).toBe(false);
    expect(checkLoginLink(undefined, NOW)).toBe(false);
  });
});
