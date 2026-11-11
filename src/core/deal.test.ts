import { describe, expect, it } from "vitest";
import { isCheckMethod, isDealStage, isOpenStage, stageOf } from "./deal";

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
