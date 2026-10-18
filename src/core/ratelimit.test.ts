import { describe, expect, it } from "vitest";
import { createLimiter } from "./ratelimit";

describe("ограничение попыток", () => {
  it("пускает max попыток в окне, потом блокирует, после окна снова пускает", () => {
    const l = createLimiter(3, 60_000);
    expect([l.hit("a", 0), l.hit("a", 1), l.hit("a", 2)]).toEqual([true, true, true]);
    expect(l.hit("a", 3)).toBe(false);
    expect(l.hit("b", 3)).toBe(true);
    expect(l.hit("a", 61_000)).toBe(true);
  });
});
