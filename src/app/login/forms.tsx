"use client";

import { useActionState, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { startAuthentication } from "@simplewebauthn/browser";
import { redeemLoginLink, type AuthState } from "../auth-actions";
import { passkeyAuthenticationOptions, passkeyAuthenticationVerify } from "../passkey-actions";
import s from "../invite/invite.module.css";

export function LinkForm() {
  const { token } = useParams<{ token: string }>();
  const [state, action, pending] = useActionState<AuthState, FormData>(() => redeemLoginLink(token), {});
  return (
    <form action={action} className={s.form}>
      {state.error && (
        <p className={s.formError} role="alert">
          {state.error}
        </p>
      )}
      <button type="submit" className={s.submit} disabled={pending}>
        {pending ? "Проверяем" : "Продолжить вход"}
      </button>
    </form>
  );
}

// Явный вход по Face ID (страница /login, например из закладки).
export function PasskeyLogin() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function login() {
    setBusy(true);
    setError(null);
    try {
      const response = await startAuthentication({ optionsJSON: await passkeyAuthenticationOptions() });
      const r = await passkeyAuthenticationVerify(response);
      if (r.ok) router.push(r.next);
      else setError(r.error);
    } catch {
      setError("Вход не подтверждён. Если на этом устройстве нет ключа клуба, введите почту на главной");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className={s.form}>
      <button type="button" className={s.submit} onClick={login} disabled={busy}>
        {busy ? "Ждём подтверждения" : "Войти по Face ID"}
      </button>
      {error && (
        <p className={s.formError} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
