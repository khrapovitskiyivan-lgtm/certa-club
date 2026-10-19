import { describe, expect, it } from "vitest";
import { checkFile, cleanName, makeKey, ownKeys, parseKey, sniffOk } from "./upload";

const id = "123e4567-e89b-42d3-a456-426614174000";

describe("файлы лота", () => {
  it("ключ разбирается обратно", () => {
    expect(parseKey(makeKey("m1", "photo", id, "jpg"))).toEqual({ memberId: "m1", kind: "photo", ext: "jpg" });
    expect(parseKey("u/m1/photo/../x.jpg")).toBeNull();
    expect(parseKey(`u/m1/photo/${id}.exe`)).toBeNull();
  });
  it("тип и размер", () => {
    expect(checkFile("photo", "image/jpeg", 1000)).toEqual({ ok: true, ext: "jpg" });
    expect(checkFile("photo", "application/pdf", 1000).ok).toBe(false);
    expect(checkFile("doc", "application/pdf", 5 * 1024 * 1024).ok).toBe(false);
  });
  it("из формы только свои ключи", () => {
    const mine = makeKey("m1", "photo", id, "jpg");
    const other = makeKey("m2", "photo", id, "jpg");
    const doc = makeKey("m1", "doc", id, "pdf");
    expect(ownKeys([mine, other, doc, mine, 5], "m1", "photo")).toEqual([mine]);
  });
  it("имя документа без пути", () => {
    expect(cleanName("C:\\a\\паспорт часов.pdf")).toBe("паспорт часов.pdf");
    expect(cleanName("")).toBe("Документ");
  });
});

describe("сигнатура файла", () => {
  it("jpeg и подделка", () => {
    expect(sniffOk(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]), "jpg")).toBe(true);
    expect(sniffOk(new TextEncoder().encode("<html>"), "jpg")).toBe(false);
    expect(sniffOk(new TextEncoder().encode("%PDF-1.7"), "pdf")).toBe(true);
  });
});
