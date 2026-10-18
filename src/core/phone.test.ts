import { describe, expect, it } from "vitest";
import { formatPhone, isCompletePhone } from "./phone";

describe("маска телефона", () => {
  it("российский номер в любом виде приводится к +7 (XXX) XXX-XX-XX", () => {
    expect(formatPhone("89001234567")).toBe("+7 (900) 123-45-67");
    expect(formatPhone("+79001234567")).toBe("+7 (900) 123-45-67");
    expect(formatPhone("9001234567")).toBe("+7 (900) 123-45-67");
    expect(formatPhone("+7 900 123 45 67")).toBe("+7 (900) 123-45-67");
  });

  it("частичный ввод форматируется постепенно", () => {
    expect(formatPhone("8")).toBe("+7");
    expect(formatPhone("+7 90")).toBe("+7 (90");
    expect(formatPhone("+7900")).toBe("+7 (900)");
    expect(formatPhone("+7900123")).toBe("+7 (900) 123");
    expect(formatPhone("+79001234")).toBe("+7 (900) 123-4");
  });

  it("иностранный номер остаётся свободным", () => {
    expect(formatPhone("+971 50 123 4567")).toBe("+971501234567");
    expect(formatPhone("+44 20")).toBe("+4420");
  });

  it("лишние цифры российского номера отрезаются", () => {
    expect(formatPhone("+790012345678999")).toBe("+7 (900) 123-45-67");
  });

  it("полнота номера", () => {
    expect(isCompletePhone("+7 (900) 123-45-67")).toBe(true);
    expect(isCompletePhone("+7 (900) 123-4")).toBe(false);
    expect(isCompletePhone("+971501234567")).toBe(true);
  });
});
