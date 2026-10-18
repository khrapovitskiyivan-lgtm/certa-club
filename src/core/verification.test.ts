import { describe, expect, it } from "vitest";
import { validateVerification } from "./verification";

describe("верификация", () => {
  it("лично: достаточно выбора способа", () => {
    expect(validateVerification({ method: "self" })).toEqual({ ok: true, data: { method: "self" } });
  });

  it("через агента: принимает заполненные поля", () => {
    const r = validateVerification({
      method: "agent",
      agentType: "bank",
      agentName: "Частный банк",
      agentContact: "manager@bank.test",
    });
    expect(r.ok).toBe(true);
  });

  it("через агента: требует тип, название и контакт", () => {
    const r = validateVerification({ method: "agent" });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.errors.agentType).toBeDefined();
      expect(r.errors.agentName).toBeDefined();
      expect(r.errors.agentContact).toBeDefined();
    }
  });

  it("без выбора способа", () => {
    const r = validateVerification({});
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.method).toBe("Выберите способ верификации");
  });
});
