import { randomUUID } from "node:crypto";
import { checkFile, fileUrl, makeKey, sniffOk, type FileKind } from "@/core/upload";
import { createLimiter } from "@/core/ratelimit";
import { currentMember } from "@/server/auth";
import { putFile } from "@/server/files";

// Не больше 60 файлов на участника за 15 минут.
const uploadLimiter = createLimiter(60, 15 * 60 * 1000);

// Загрузка одного файла лота. Только подтверждённые участники: размещать лоты могут только они.
export async function POST(req: Request) {
  const m = await currentMember();
  if (!m || m.status !== "active") return Response.json({ error: "Нет доступа" }, { status: 403 });
  if (!uploadLimiter.hit(m.id, Date.now())) return Response.json({ error: "Слишком много файлов, попробуйте позже" }, { status: 429 });

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  const kind: FileKind = form?.get("kind") === "doc" ? "doc" : "photo";
  if (!(file instanceof File)) return Response.json({ error: "Файл не получен" }, { status: 400 });

  const check = checkFile(kind, file.type, file.size);
  if (!check.ok) return Response.json({ error: check.error }, { status: 400 });
  const body = await file.arrayBuffer();
  if (!sniffOk(new Uint8Array(body.slice(0, 16)), check.ext)) return Response.json({ error: "Файл повреждён или не того формата" }, { status: 400 });

  const key = makeKey(m.id, kind, randomUUID(), check.ext);
  await putFile(key, body, file.type);
  return Response.json({ key, url: fileUrl(key) });
}
