"use client";

import { useActionState, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { startAuthentication } from "@simplewebauthn/browser";
import { enterCode, type CodeState } from "../actions";
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

// Вход по почте и паролю (та же логика, что в поле на главной).
export function PasswordLogin() {
  const [state, action, pending] = useActionState<CodeState, FormData>(enterCode, {});
  return (
    <form action={action} className={s.form} noValidate>
      <div className={s.group}>
        <div className={s.field}>
          <label htmlFor="code" className={s.label}>
            Почта
          </label>
          <input id="code" name="code" type="email" autoComplete="username" className={s.input} defaultValue={state.email ?? ""} />
        </div>
        <div className={s.field}>
          <label htmlFor="password" className={s.label}>
            Пароль
          </label>
          <input id="password" name="password" type="password" autoComplete="current-password" className={s.input} />
        </div>
      </div>
      {(state.error || state.notice) && (
        <p className={state.error ? s.formError : s.hint} role="status">
          {state.error ?? state.notice}
        </p>
      )}
      <button type="submit" className={s.submit} disabled={pending}>
        {pending ? "Проверяем" : "Войти"}
      </button>
      <button type="submit" name="intent" value="link" className={s.backBtn} disabled={pending}>
        Забыли пароль?
      </button>
    </form>
  );
}
