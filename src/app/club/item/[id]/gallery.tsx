"use client";

import { useState } from "react";
import c from "../../club.module.css";

// Фото лота: большое выбранное и ряд миниатюр под ним.
export function Gallery({ photos, alt }: { photos: string[]; alt: string }) {
  const [i, setI] = useState(0);
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element -- приватные файлы отдаются через /api/file */}
      <img src={photos[i]} alt={alt} className={c.photoLarge} />
      {photos.length > 1 && (
        <div className={c.gallery}>
          {photos.map((p, j) => (
            <button key={p} type="button" onClick={() => setI(j)} aria-label={`Фото ${j + 1}`} style={{ borderColor: j === i ? "var(--ink)" : "transparent" }}>
              {/* eslint-disable-next-line @next/next/no-img-element -- миниатюра */}
              <img src={p} alt="" loading="lazy" />
            </button>
          ))}
        </div>
      )}
    </>
  );
}
