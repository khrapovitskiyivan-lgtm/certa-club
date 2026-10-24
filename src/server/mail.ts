// Отправка писем. Если заданы RESEND_API_KEY и MAIL_FROM, письмо уходит через Resend (HTTP API, без SDK).
// Иначе: локально письма пишутся в .data/outbox.log, на сервере только в журнал при CERTA_MAIL_LOG=1.
// Смена провайдера: заменить sendViaProvider, сигнатура sendMail остаётся.
import { appendFile, mkdir } from "node:fs/promises";
import path from "node:path";

const DATA_DIR = process.env.CERTA_DATA_DIR ?? path.join(process.cwd(), ".data");

async function sendViaProvider(to: string, subject: string, text: string): Promise<void> {
  // Ошибки не пробрасываем и пишем без содержимого письма: в нём может быть ссылка входа.
  // Один повтор при сбое сети или ответе 5xx: иначе участник ждёт ссылку входа, которая не придёт.
  for (let attempt = 1; attempt <= 2; attempt++) {
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
      if (res.ok) return;
      console.error(`[почта] не отправлено: ${res.status}, попытка ${attempt}`);
      if (res.status < 500) return;
    } catch (e) {
      console.error(`[почта] не отправлено: ${e instanceof Error ? e.name : "ошибка"}, попытка ${attempt}`);
    }
  }
}

export async function sendMail(to: string, subject: string, text: string): Promise<void> {
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
