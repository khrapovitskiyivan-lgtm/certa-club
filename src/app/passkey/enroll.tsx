"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { browserSupportsWebAuthn, startRegistration } from "@simplewebauthn/browser";
import { passkeyRegistrationOptions, passkeyRegistrationVerify } from "../passkey-actions";
import s from "../invite/invite.module.css";

export function Enroll() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function enroll() {
    if (!browserSupportsWebAuthn()) {
      setError("Этот браузер не поддерживает вход по Face ID. Откройте ссылку в Safari на iPhone или в Chrome на Android");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const options = await passkeyRegistrationOptions();
      if (!options) {
        setError("Сессия истекла. Откройте ссылку из письма или приглашения ещё раз");
        return;
      }
      const response = await startRegistration({ optionsJSON: options });
      const r = await passkeyRegistrationVerify(response);
      if (r.ok) router.push(r.next);
      else setError(r.error);
    } catch {
      // Отмена в системном окне или устройство не ответило.
      setError("Не получилось. Нажмите кнопку ещё раз и подтвердите Face ID или отпечатком");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={s.form}>
      <button type="button" className={s.submit} onClick={enroll} disabled={busy}>
        {busy ? "Ждём подтверждения" : "Включить вход по Face ID"}
      </button>
      {error && (
        <p className={s.formError} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
