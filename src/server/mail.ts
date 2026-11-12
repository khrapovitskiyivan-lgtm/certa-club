// Отправка писем. Основной провайдер Unisender Go (серверы в России): UNISENDER_API_KEY и MAIL_FROM.
// Запасной: Resend (RESEND_API_KEY и MAIL_FROM), пока Unisender не настроен.
// Иначе: локально письма пишутся в .data/outbox.log, на сервере только в журнал при CERTA_MAIL_LOG=1.
// Смена провайдера: заменить sendViaProvider, сигнатура sendMail остаётся.
import { appendFile, mkdir } from "node:fs/promises";
import path from "node:path";

const DATA_DIR = process.env.CERTA_DATA_DIR ?? path.join(process.cwd(), ".data");

// Запрос к Unisender Go, метод email/send. Хост зависит от дата-центра аккаунта (goapi, go1 или go2).
export function unisenderRequest(to: string, subject: string, text: string, env: Record<string, string | undefined>) {
  return {
    url: `https://${env.UNISENDER_HOST ?? "goapi.unisender.ru"}/ru/transactional/api/v1/email/send.json`,
    headers: { "X-API-KEY": env.UNISENDER_API_KEY ?? "", "Content-Type": "application/json", Accept: "application/json" },
    body: {
      message: {
        recipients: [{ email: to }],
        body: { plaintext: text },
        subject,
        from_email: env.MAIL_FROM ?? "",
        ...(env.MAIL_FROM_NAME ? { from_name: env.MAIL_FROM_NAME } : {}),
        ...(env.MAIL_REPLY_TO ? { reply_to: env.MAIL_REPLY_TO } : {}),
      },
    },
  };
}

async function sendViaUnisender(to: string, subject: string, text: string): Promise<void> {
  try {
    const r = unisenderRequest(to, subject, text, process.env);
    const res = await fetch(r.url, { method: "POST", headers: r.headers, body: JSON.stringify(r.body), signal: AbortSignal.timeout(8000) });
    if (!res.ok) {
      console.error(`[почта] не отправлено: ${res.status}`);
      return;
    }
    // Адрес может быть отклонён и при ответе 200: причина приходит в failed_emails.
    const data = (await res.json().catch(() => null)) as { failed_emails?: Record<string, string> } | null;
    const failed = Object.values(data?.failed_emails ?? {});
    if (failed.length) console.error(`[почта] адрес отклонён: ${failed.join(", ")}`);
  } catch (e) {
    console.error(`[почта] не отправлено: ${e instanceof Error ? e.name : "ошибка"}`);
  }
}

async function sendViaProvider(to: string, subject: string, text: string): Promise<void> {
  // Ошибки не пробрасываем и пишем без содержимого письма: в нём может быть ссылка входа.
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.MAIL_FROM,
        to: [to],
        subject,
        text,
        // Ответ участника уходит в живой ящик клуба (MAIL_REPLY_TO), а не на адрес отправки.
        ...(process.env.MAIL_REPLY_TO ? { reply_to: process.env.MAIL_REPLY_TO } : {}),
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) console.error(`[почта] не отправлено: ${res.status}`);
  } catch (e) {
    console.error(`[почта] не отправлено: ${e instanceof Error ? e.name : "ошибка"}`);
  }
}

export async function sendMail(to: string, subject: string, text: string): Promise<void> {
  if (process.env.UNISENDER_API_KEY && process.env.MAIL_FROM) {
    await sendViaUnisender(to, subject, text);
    return;
  }
  if (process.env.RESEND_API_KEY && process.env.MAIL_FROM) {
    await sendViaProvider(to, subject, text);
    return;
  }
  const entry = `--- ${new Date().toISOString()}\nКому: ${to}\nТема: ${subject}\n\n${text}\n\n`;
  if (process.env.NODE_ENV === "production") {
    if (process.env.CERTA_MAIL_LOG === "1") console.log(`[почта]\n${entry}`);
    return;
  }
  await mkdir(DATA_DIR, { recursive: true });
  await appendFile(path.join(DATA_DIR, "outbox.log"), entry, "utf8");
  console.log(`[почта] ${to}: ${subject}`);
}
