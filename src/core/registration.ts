// Контракт формы регистрации по приглашению: единый источник правды для клиента и сервера.
import { z } from "zod";

export const registrationSchema = z
  .object({
    fullName: z.string().trim().min(2, "Укажите имя и фамилию").max(120),
    pseudonym: z
      .string()
      .trim()
      .min(3, "Не короче трёх символов")
      .max(32, "Не длиннее 32 символов")
      .regex(/^[\p{L}\p{N} ._-]+$/u, "Только буквы, цифры, пробел, точка, дефис"),
    email: z.string().trim().toLowerCase().email("Проверьте адрес почты"),
    phone: z
      .string()
      .trim()
      .regex(/^\+?[\d\s()-]{7,20}$/, "Проверьте номер телефона"),
    city: z.string().trim().min(2, "Укажите город").max(80),
    occupation: z.string().trim().min(2, "Расскажите в одной строке").max(160),
    about: z.string().trim().max(500, "Не больше 500 знаков").optional().default(""),
    password: z.string().min(12, "Не короче 12 символов").max(128),
    passwordConfirm: z.string(),
    agreeRules: z.literal("on", { message: "Нужно согласие с правилами клуба" }),
  })
  .refine((d) => d.password === d.passwordConfirm, {
    path: ["passwordConfirm"],
    message: "Пароли не совпадают",
  });

export type RegistrationInput = z.infer<typeof registrationSchema>;

export type FieldErrors = Partial<Record<keyof RegistrationInput, string>>;

export function validateRegistration(raw: Record<string, unknown>):
  | { ok: true; data: RegistrationInput }
  | { ok: false; errors: FieldErrors } {
  const r = registrationSchema.safeParse(raw);
  if (r.success) return { ok: true, data: r.data };
  const errors: FieldErrors = {};
  for (const issue of r.error.issues) {
    const key = issue.path[0] as keyof RegistrationInput;
    if (key && !errors[key]) errors[key] = issue.message;
  }
  // refine не срабатывает при других ошибках, а показать все ошибки нужно сразу.
  if (!errors.passwordConfirm && raw.password !== raw.passwordConfirm) {
    errors.passwordConfirm = "Пароли не совпадают";
  }
  return { ok: false, errors };
}
