import { describe, expect, it } from "vitest";
import { unisenderRequest } from "./mail";

describe("запрос к Unisender Go", () => {
  it("адрес, ключ и простое письмо", () => {
    const r = unisenderRequest("a@x.test", "Тема", "Текст", { UNISENDER_API_KEY: "k", MAIL_FROM: "club@x.test", MAIL_REPLY_TO: "desk@x.test" });
    expect(r.url).toBe("https://goapi.unisender.ru/ru/transactional/api/v1/email/send.json");
    expect(r.headers["X-API-KEY"]).toBe("k");
    expect(r.body.message).toEqual({
      recipients: [{ email: "a@x.test" }],
      body: { plaintext: "Текст" },
      subject: "Тема",
      from_email: "club@x.test",
      reply_to: "desk@x.test",
    });
  });
  it("хост дата-центра из настройки", () => {
    expect(unisenderRequest("a", "s", "t", { UNISENDER_HOST: "go2.unisender.ru" }).url).toContain("https://go2.unisender.ru/");
  });
});
