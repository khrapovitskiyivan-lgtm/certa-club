"use client";

import { useState } from "react";
import s from "../../invite/invite.module.css";

// Регистрация с телефона: QR сканировать нечем, поэтому ссылка otpauth открывает приложение кодов
// на этом же устройстве (iPhone: «Пароли», Android: Google Authenticator / Яндекс Ключ).
export function KeyActions({ uri, secret }: { uri: string; secret: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className={s.keyActions}>
      <a href={uri} className={s.submit}>
        Добавить код на этом телефоне
      </a>
      <button
        type="button"
        className={s.backBtn}
        onClick={async () => {
          await navigator.clipboard.writeText(secret);
          setCopied(true);
        }}
      >
        {copied ? "Ключ скопирован" : "Скопировать ключ"}
      </button>
    </div>
  );
}
