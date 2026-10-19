// Хранилище файлов лота. На Vercel: приватный Blob (ключи берутся из окружения сами, через OIDC).
// Локально без Blob: папка .data/uploads. Наружу файлы отдаёт только /api/file после проверки прав.
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { get, put } from "@vercel/blob";

const DATA_DIR = process.env.CERTA_DATA_DIR ?? path.join(process.cwd(), ".data");
const blobEnabled = () => Boolean(process.env.BLOB_STORE_ID || process.env.BLOB_READ_WRITE_TOKEN);

export async function putFile(key: string, body: ArrayBuffer, contentType: string): Promise<void> {
  if (blobEnabled()) {
    await put(key, Buffer.from(body), { access: "private", contentType, addRandomSuffix: false });
    return;
  }
  const file = path.join(DATA_DIR, "uploads", key);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, Buffer.from(body));
}

export async function getFile(key: string): Promise<{ body: ReadableStream<Uint8Array> | Buffer; contentType: string } | null> {
  if (blobEnabled()) {
    const r = await get(key, { access: "private" });
    if (!r || r.statusCode !== 200) return null;
    return { body: r.stream, contentType: r.blob.contentType };
  }
  try {
    const ext = path.extname(key).slice(1);
    const types: Record<string, string> = { jpg: "image/jpeg", png: "image/png", webp: "image/webp", pdf: "application/pdf" };
    return { body: await readFile(path.join(DATA_DIR, "uploads", key)), contentType: types[ext] ?? "application/octet-stream" };
  } catch {
    return null;
  }
}
