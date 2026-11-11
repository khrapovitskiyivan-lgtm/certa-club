import { randomUUID } from "node:crypto";
import { checkFile, fileUrl, makeKey, sniffOk, type FileKind } from "@/core/upload";
import { currentMember, uploadLimiter } from "@/server/auth";
import sharp from "sharp";
import { putFile } from "@/server/files";


// Загрузка одного файла лота. Только подтверждённые участники: размещать лоты могут только они.
export async function POST(req: Request) {
  const m = await currentMember();
  if (!m || m.status !== "active") return Response.json({ error: "Нет доступа" }, { status: 403 });
  if (!(await uploadLimiter.hit(m.id))) return Response.json({ error: "Слишком много файлов, попробуйте позже" }, { status: 429 });

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  const kind: FileKind = form?.get("kind") === "doc" ? "doc" : "photo";
  if (!(file instanceof File)) return Response.json({ error: "Файл не получен" }, { status: 400 });

  const check = checkFile(kind, file.type, file.size);
  if (!check.ok) return Response.json({ error: check.error }, { status: 400 });
  const body = await file.arrayBuffer();
  if (!sniffOk(new Uint8Array(body.slice(0, 16)), check.ext)) return Response.json({ error: "Файл повреждён или не того формата" }, { status: 400 });

  // Фото перекодируем на сервере: метаданные (геопозиция, устройство, дата съёмки) не сохраняются,
  // даже если файл пришёл в обход сжатия в браузере. Поворот по EXIF применяется к пикселям.
  let out: ArrayBuffer = body;
  if (kind === "photo") {
    try {
      const buf = await sharp(Buffer.from(body)).rotate().toBuffer();
      out = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
    } catch {
      return Response.json({ error: "Файл повреждён или не того формата" }, { status: 400 });
    }
  }

  const key = makeKey(m.id, kind, randomUUID(), check.ext);
  await putFile(key, out, file.type);
  return Response.json({ key, url: fileUrl(key) });
}
