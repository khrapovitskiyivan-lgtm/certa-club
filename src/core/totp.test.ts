import { describe, expect, it } from "vitest";
import { base32Decode, base32Encode, generateSecret, hotp, totp, verifyTotp } from "./totp";
import { createLimiter } from "./ratelimit";

// Эталонный секрет RFC 4226 / 6238: ASCII "12345678901234567890".
const RFC_SECRET = base32Encode(Buffer.from("12345678901234567890"));

describe("TOTP", () => {
  it("base32 туда и обратно", () => {
    const buf = Buffer.from("certa-secret-bytes");
    expect(base32Decode(base32Encode(buf)).equals(buf)).toBe(true);
  });

  it("HOTP совпадает с тестовыми векторами RFC 4226", () => {
    expect(hotp(RFC_SECRET, 0)).toBe("755224");
    expect(hotp(RFC_SECRET, 1)).toBe("287082");
    expect(hotp(RFC_SECRET, 9)).toBe("520489");
  });

  it("TOTP совпадает с вектором RFC 6238 (59 с, 8 цифр -> 6 последних)", () => {
    expect(totp(RFC_SECRET, 59_000)).toBe("287082");
  });

  it("принимает текущий и соседний шаг, отвергает дальний", () => {
    const s = generateSecret();
    const now = 1_800_000_000_000;
    expect(verifyTotp(s, totp(s, now), now)).toBe(true);
    expect(verifyTotp(s, totp(s, now - 30_000), now)).toBe(true);
    expect(verifyTotp(s, totp(s, now - 120_000), now)).toBe(false);
  });

  it("отвергает мусор", () => {
    const s = generateSecret();
    expect(verifyTotp(s, "12345", 0)).toBe(false);
    expect(verifyTotp(s, "abcdef", 0)).toBe(false);
  });
});

describe("ограничение попыток", () => {
  it("пускает max попыток в окне, потом блокирует, после окна снова пускает", () => {
    const l = createLimiter(3, 60_000);
    expect([l.hit("a", 0), l.hit("a", 1), l.hit("a", 2)]).toEqual([true, true, true]);
    expect(l.hit("a", 3)).toBe(false);
    expect(l.hit("b", 3)).toBe(true);
    expect(l.hit("a", 61_000)).toBe(true);
  });
});
