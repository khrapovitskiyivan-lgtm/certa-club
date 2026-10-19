import { describe, expect, it } from "vitest";
import { safeNext } from "./next-path";

describe("safeNext", () => {
  it("пропускает адреса витрины", () => {
    expect(safeNext("/club/item/abc-1")).toBe("/club/item/abc-1");
    expect(safeNext("/club/new?kind=request")).toBe("/club/new?kind=request");
  });
  it("чужие адреса и петлю заменяет витриной", () => {
    for (const v of ["https://evil.test", "//evil.test", "/club//evil.test/x".replace("//e", "/\e"), "/clubx", "/club/verify", undefined]) {
      expect(safeNext(v)).toBe("/club");
    }
  });
});
