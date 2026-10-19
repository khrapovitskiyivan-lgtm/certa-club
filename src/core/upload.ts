// Контракт файлов лота: фото и документы. Ключ хранит владельца, по нему сервер проверяет права.

export type FileKind = "photo" | "doc";

export const LIMITS = {
  photo: { max: 10, bytes: 4 * 1024 * 1024, types: { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" } },
  doc: { max: 5, bytes: 4 * 1024 * 1024, types: { "application/pdf": "pdf", "image/jpeg": "jpg", "image/png": "png" } },
} as const satisfies Record<FileKind, { max: number; bytes: number; types: Record<string, string> }>;

export type LotDoc = { key: string; name: string };

const KEY_RE = /^u\/([\w-]{1,64})\/(photo|doc)\/([0-9a-f-]{36})\.(jpg|png|webp|pdf)$/;

export function makeKey(memberId: string, kind: FileKind, id: string, ext: string): string {
  return `u/${memberId}/${kind}/${id}.${ext}`;
}

export function parseKey(key: string): { memberId: string; kind: FileKind; ext: string } | null {
  const m = KEY_RE.exec(key);
  return m ? { memberId: m[1], kind: m[2] as FileKind, ext: m[4] } : null;
}

// Проверка файла до загрузки: тип из белого списка и размер.
export function checkFile(kind: FileKind, type: string, size: number): { ok: true; ext: string } | { ok: false; error: string } {
  const lim = LIMITS[kind];
  const ext = (lim.types as Record<string, string>)[type];
  if (!ext) return { ok: false, error: kind === "photo" ? "Фото в формате JPEG, PNG или WebP" : "Документ в PDF, JPEG или PNG" };
  if (size <= 0 || size > lim.bytes) return { ok: false, error: "Файл больше 4 МБ" };
  return { ok: true, ext };
}

export const fileUrl = (key: string) => `/api/file/${key}`;
export const keyFromUrl = (url: string) => (url.startsWith("/api/file/") ? url.slice("/api/file/".length) : null);

// Из формы берём только свои ключи нужного вида, без повторов и не больше лимита.
export function ownKeys(raw: unknown[], memberId: string, kind: FileKind): string[] {
  const out: string[] = [];
  for (const r of raw) {
    if (typeof r !== "string") continue;
    const p = parseKey(r);
    if (!p || p.memberId !== memberId || p.kind !== kind || out.includes(r)) continue;
    out.push(r);
    if (out.length >= LIMITS[kind].max) break;
  }
  return out;
}

// Имя документа для показа: без путей и управляющих символов, не длиннее 120.
export function cleanName(name: unknown): string {
  const s = typeof name === "string" ? name : "";
  const base = s.split(/[\\/]/).pop() ?? "";
  return base.replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, 120) || "Документ";
}

// Сверка содержимого с заявленным типом по первым байтам: под видом фото не загрузить страницу или скрипт.
export function sniffOk(head: Uint8Array, ext: string): boolean {
  const at = (sig: number[], from = 0) => sig.every((b, i) => head[from + i] === b);
  if (ext === "jpg") return at([0xff, 0xd8, 0xff]);
  if (ext === "png") return at([0x89, 0x50, 0x4e, 0x47]);
  if (ext === "webp") return at([0x52, 0x49, 0x46, 0x46]) && at([0x57, 0x45, 0x42, 0x50], 8);
  if (ext === "pdf") return at([0x25, 0x50, 0x44, 0x46]);
  return false;
}
