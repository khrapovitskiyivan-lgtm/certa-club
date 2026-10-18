// Контракт шага верификации: лично через провайдера или через агента.
import { z } from "zod";

export const AGENT_TYPES = {
  bank: "Банк",
  family_office: "Семейный офис",
  representative: "Доверенный представитель",
} as const;

export const verificationSchema = z.discriminatedUnion("method", [
  z.object({ method: z.literal("self") }),
  z.object({
    method: z.literal("agent"),
    agentType: z.enum(Object.keys(AGENT_TYPES) as [keyof typeof AGENT_TYPES, ...(keyof typeof AGENT_TYPES)[]], {
      message: "Выберите тип агента",
    }),
    agentName: z.string().trim().min(2, "Укажите название или имя").max(120),
    agentContact: z.string().trim().min(5, "Укажите контакт для связи").max(160),
  }),
]);

export type VerificationInput = z.infer<typeof verificationSchema>;
export type VerificationErrors = Partial<Record<"method" | "agentType" | "agentName" | "agentContact", string>>;

export function validateVerification(raw: Record<string, unknown>):
  | { ok: true; data: VerificationInput }
  | { ok: false; errors: VerificationErrors } {
  const r = verificationSchema.safeParse(raw);
  if (r.success) return { ok: true, data: r.data };
  const errors: VerificationErrors = {};
  for (const issue of r.error.issues) {
    const key = (issue.path[0] ?? "method") as keyof VerificationErrors;
    if (!errors[key]) errors[key] = key === "method" ? "Выберите способ верификации" : issue.message;
  }
  return { ok: false, errors };
}
