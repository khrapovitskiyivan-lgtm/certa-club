"use server";

import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { createLoginLink, classifyEntry, LINK_TTL_MIN } from "@/core/entry";
import { checkInvite, hashCode, normalizeCode } from "@/core/invites";
import { validateRegistration, type FieldErrors } from "@/core/registration";
import { validateVerification, type VerificationErrors } from "@/core/verification";
import { clientIp, emailLinkLimiter, inviteGlobalLimiter, inviteLimiter } from "@/server/auth";
import { sendMail } from "@/server/mail";
import { hashPassword } from "@/server/password";
import { registrationMemberId, sessionMemberId, startRegistration } from "@/server/session";
import { store } from "@/server/store";

export type CodeState = { error?: string; notice?: string };

const LINK_SENT = "Если вы участник клуба, ссылка для входа отправлена на вашу почту";
// Минимальное время ответа на ввод почты: по задержке нельзя понять, есть ли такой участник.
const EMAIL_MIN_MS = 900;

// Поле на главной: код приглашения ведёт к регистрации, почта участника к письму со ссылкой входа.
export async function enterCode(_prev: CodeState, formData: FormData): Promise<CodeState> {
  const raw = String(formData.get("code") ?? "");
  if (!raw.trim()) return { error: "Введите код приглашения или почту" };
  const entry = classifyEntry(raw);
  const now = Date.now();
  const ip = await clientIp();
  if (!inviteGlobalLimiter.hit("all", now) || (ip && !inviteLimiter.hit(ip, now))) {
    return { error: "Слишком много попыток. Попробуйте позже" };
  }
  if (entry.kind === "invalid") return { error: "Проверьте код приглашения или почту" };

  if (entry.kind === "code") {
    const r = checkInvite(await store.listInvites(), entry.code, new Date());
    if (!r.ok) return { error: "Приглашение не найдено или уже недействительно" };
    redirect(`/invite/${entry.code}`);
  }

  // Почта: ответ одинаковый всегда, письмо уходит только настоящему участнику.
  if (emailLinkLimiter.hit(entry.email, now)) {
    const m = await store.findByEmail(entry.email);
    if (m) {
      const { token, link } = createLoginLink(m.id, new Date(now));
      await store.addLoginLink(link);
      const base = process.env.CERTA_BASE_URL ?? "http://localhost:3000";
      await sendMail(
        m.email,
        "Вход в Certa",
        `Здравствуйте.

Ссылка для входа в клуб: ${base}/login/link/${token}
` +
          `Она действует ${LINK_TTL_MIN} минут и только один раз.

` +
          "Вход в Certa всегда начинается с главной страницы и вашей почты. Других ссылок на вход клуб не присылает.",
      );
    }
  }
  const left = EMAIL_MIN_MS - (Date.now() - now);
  if (left > 0) await new Promise((r) => setTimeout(r, left));
  return { notice: LINK_SENT };
}

export type RegisterState = { errors?: FieldErrors; formError?: string; values?: Record<string, string> };

export async function register(code: string, _prev: RegisterState, formData: FormData): Promise<RegisterState> {
  const raw = Object.fromEntries(formData) as Record<string, string>;
  // Пароли не возвращаем в форму.
  const values = { ...raw };
  delete values.password;
  delete values.passwordConfirm;

  const now = new Date();
  const check = checkInvite(await store.listInvites(), code, now);
  if (!check.ok) return { formError: "Приглашение недействительно", values };

  const v = validateRegistration(raw);
  if (!v.ok) return { errors: v.errors, values };

  const d = v.data;
  const memberId = randomUUID();
  const result = await store.redeem(
    hashCode(normalizeCode(code)!),
    {
      id: memberId,
      fullName: d.fullName,
      pseudonym: d.pseudonym,
      email: d.email,
      phone: d.phone,
      city: d.city,
      occupation: d.occupation,
      about: d.about,
      passwordHash: await hashPassword(d.password),
      invitedAs: check.invite.inviteeName,
      status: "awaiting_kyc",
      createdAt: now.toISOString(),
    },
    now,
  );
  if (result === "unavailable") return { formError: "Приглашение уже использовано", values };
  if (result === "email_taken") return { errors: { email: "Этот адрес уже зарегистрирован" }, values };
  // Полную сессию даёт только вход с кодом с телефона; здесь пропуск только на шаг верификации.
  await startRegistration(memberId);
  redirect("/verify");
}

export type VerifyState = { errors?: VerificationErrors; formError?: string; values?: Record<string, string> };

export async function submitVerification(_prev: VerifyState, formData: FormData): Promise<VerifyState> {
  const values = Object.fromEntries(formData) as Record<string, string>;
  const id = (await registrationMemberId()) ?? (await sessionMemberId());
  if (!id) return { formError: "Сессия истекла. Обратитесь к куратору клуба.", values };

  const v = validateVerification(values);
  if (!v.ok) return { errors: v.errors, values };

  const submittedAt = new Date().toISOString();
  const ok = await store.submitVerification(
    id,
    v.data.method === "self"
      ? { method: "self", submittedAt }
      : { ...v.data, submittedAt },
  );
  if (!ok) return { formError: "Не удалось сохранить. Обратитесь к куратору клуба.", values };
  redirect("/welcome");
}
