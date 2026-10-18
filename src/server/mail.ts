// Отправка писем. Почтовый сервис не выбран (зависит от юрисдикции и хостинга).
// Пока: локально письма пишутся в .data/outbox.log; на сервере только в журнал сервера,
// и то лишь при CERTA_MAIL_LOG=1 (временный режим для демонстрации, ссылки входа видны в журнале).
// Подключение сервиса: заменить тело sendMail, сигнатура остаётся.
import { appendFile, mkdir } from "node:fs/promises";
import path from "node:path";

const DATA_DIR = process.env.CERTA_DATA_DIR ?? path.join(process.cwd(), ".data");

export async function sendMail(to: string, subject: string, text: string): Promise<void> {
  const entry = `--- ${new Date().toISOString()}\nКому: ${to}\nТема: ${subject}\n\n${text}\n\n`;
  if (process.env.NODE_ENV === "production") {
    if (process.env.CERTA_MAIL_LOG === "1") console.log(`[почта]\n${entry}`);
    return;
  }
  await mkdir(DATA_DIR, { recursive: true });
  await appendFile(path.join(DATA_DIR, "outbox.log"), entry, "utf8");
  console.log(`[почта] ${to}: ${subject}`);
}
