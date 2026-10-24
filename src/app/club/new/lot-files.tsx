"use client";

import { useState } from "react";
import { keyFromUrl, LIMITS } from "@/core/upload";
import s from "../../invite/invite.module.css";
import c from "../club.module.css";

type Photo = { key: string; preview: string };
type Doc = { key: string; name: string };

// Фото сжимаем в браузере: до 2000 px по длинной стороне, JPEG. Заодно уходят метаданные с геопозицией.
async function compress(file: File): Promise<Blob> {
  const bmp = await createImageBitmap(file);
  const k = Math.min(1, 2000 / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bmp.width * k);
  canvas.height = Math.round(bmp.height * k);
  canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  bmp.close();
  return new Promise((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error("Не удалось обработать фото"))), "image/jpeg", 0.86));
}

async function send(body: Blob, name: string, kind: "photo" | "doc"): Promise<string> {
  const fd = new FormData();
  fd.append("file", new File([body], name, { type: body.type }));
  fd.append("kind", kind);
  const r = await fetch("/api/upload", { method: "POST", body: fd });
  const j = (await r.json().catch(() => ({}))) as { key?: string; error?: string };
  if (!r.ok || !j.key) throw new Error(j.error ?? "Не удалось загрузить");
  return j.key;
}

// Фото и документы лота. Файлы грузятся сразу по одному, в форму уходят только ключи.
export function LotFiles({ initialPhotos = [], initialDocs = [] }: { initialPhotos?: string[]; initialDocs?: Doc[] }) {
  const [photos, setPhotos] = useState<Photo[]>(() =>
    initialPhotos.flatMap((url) => {
      const key = keyFromUrl(url);
      return key ? [{ key, preview: url }] : [];
    }),
  );
  const [docs, setDocs] = useState<Doc[]>(initialDocs);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function addPhotos(files: FileList | null) {
    if (!files?.length) return;
    setError("");
    setBusy(true);
    const room = LIMITS.photo.max - photos.length;
    for (const f of Array.from(files).slice(0, room)) {
      try {
        const blob = await compress(f);
        const key = await send(blob, "photo.jpg", "photo");
        setPhotos((p) => [...p, { key, preview: URL.createObjectURL(blob) }]);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Не удалось загрузить фото");
      }
    }
    if (files.length > room) setError(`Не больше ${LIMITS.photo.max} фото`);
    setBusy(false);
  }

  async function addDocs(files: FileList | null) {
    if (!files?.length) return;
    setError("");
    setBusy(true);
    for (const f of Array.from(files).slice(0, LIMITS.doc.max - docs.length)) {
      // Больше лимита Vercel отрежет запрос ещё до сервера, поэтому проверяем здесь и говорим понятно.
      if (f.size > LIMITS.doc.bytes) {
        setError(`«${f.name}» больше 4 МБ. Сожмите PDF или загрузите фото страниц`);
        continue;
      }
      try {
        const key = await send(f, f.name, "doc");
        setDocs((d) => [...d, { key, name: f.name }]);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Не удалось загрузить документ");
      }
    }
    setBusy(false);
  }

  const makeCover = (i: number) => setPhotos((p) => [p[i], ...p.filter((_, j) => j !== i)]);
  const removePhoto = (i: number) => setPhotos((p) => p.filter((_, j) => j !== i));
  const removeDoc = (i: number) => setDocs((d) => d.filter((_, j) => j !== i));

  return (
    <>
      <div className={s.field}>
        <span className={s.label}>Фото</span>
        {photos.length > 0 && (
          <div className={c.thumbs}>
            {photos.map((p, i) => (
              <div key={p.key} className={c.thumb}>
                {/* eslint-disable-next-line @next/next/no-img-element -- превью из памяти браузера */}
                <img src={p.preview} alt="" />
                {i === 0 ? (
                  <span className={c.thumbTag}>Обложка</span>
                ) : (
                  <button type="button" className={c.thumbBtn} onClick={() => makeCover(i)}>
                    Обложка
                  </button>
                )}
                <button type="button" className={c.thumbDel} onClick={() => removePhoto(i)} aria-label="Убрать фото">
                  ×
                </button>
                <input type="hidden" name="photo" value={p.key} />
              </div>
            ))}
          </div>
        )}
        {photos.length < LIMITS.photo.max && (
          <label className={c.fileBtn}>
            {busy ? "Загружаем" : "Добавить фото"}
            <input type="file" accept="image/jpeg,image/png,image/webp,image/heic" multiple hidden disabled={busy} onChange={(e) => { void addPhotos(e.target.files); e.target.value = ""; }} />
          </label>
        )}
        <p className={s.hint}>До {LIMITS.photo.max} фото. Первое станет обложкой. Геопозиция из снимков удаляется.</p>
      </div>

      <div className={s.field}>
        <span className={s.label}>Документы о происхождении (необязательно)</span>
        {docs.map((d, i) => (
          <div key={d.key} className={c.docRow}>
            <span>{d.name}</span>
            <button type="button" className={c.thumbBtn} onClick={() => removeDoc(i)}>
              Убрать
            </button>
            <input type="hidden" name="doc" value={`${d.key}|${d.name}`} />
          </div>
        ))}
        {docs.length < LIMITS.doc.max && (
          <label className={c.fileBtn}>
            Добавить документ
            <input type="file" accept="application/pdf,image/jpeg,image/png" multiple hidden disabled={busy} onChange={(e) => { void addDocs(e.target.files); e.target.value = ""; }} />
          </label>
        )}
        <p className={s.hint}>Чеки, сертификаты, паспорт часов: PDF или фото до 4 МБ. Видят только вы и экспертный совет.</p>
      </div>
      {error && <p className={s.fieldError}>{error}</p>}
    </>
  );
}
