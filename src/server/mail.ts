// Отправка писем. Почтовый сервис не выбран (зависит от юрисдикции и хостинга),
// поэтому пока письма пишутся в журнал .data/outbox.log и в консоль сервера.
// Подключение сервиса: заменить тело sendMail, сигнатура остаётся.
import { appendFile, mkdir } from "node:fs/promises";
import path from "node:path";

const DATA_DIR = process.env.CERTA_DATA_DIR ?? path.join(process.cwd(), ".data");

export async function sendMail(to: string, subject: string, text: string): Promise<void> {
  const entry = `--- ${new Date().toISOString()}\nКому: ${to}\nТема: ${subject}\n\n${text}\n\n`;
  await mkdir(DATA_DIR, { recursive: true });
  await appendFile(path.join(DATA_DIR, "outbox.log"), entry, "utf8");
  if (process.env.NODE_ENV !== "production") console.log(`[почта] ${to}: ${subject}`);
}
