"use client";

import { useActionState } from "react";
import { useParams } from "next/navigation";
import { confirmSetup, login, loginWithLink, redeemLoginLink, verifyCode, type AuthState } from "../auth-actions";
import s from "../invite/invite.module.css";

function FormError({ state }: { state: AuthState }) {
  return state.error ? (
    <p className={s.formError} role="alert">
      {state.error}
    </p>
  ) : null;
}

export function LoginForm() {
  const [state, action, pending] = useActionState<AuthState, FormData>(login, {});
  return (
    <form action={action} className={s.form} noValidate>
      <div className={s.group}>
        <div className={s.field}>
          <label htmlFor="email" className={s.label}>
            Почта
          </label>
          <input id="email" name="email" type="email" autoComplete="username" className={s.input} defaultValue={state.email ?? ""} />
        </div>
        <div className={s.field}>
          <label htmlFor="password" className={s.label}>
            Пароль
          </label>
          <input id="password" name="password" type="password" autoComplete="current-password" className={s.input} />
        </div>
      </div>
      <FormError state={state} />
      <button type="submit" className={s.submit} disabled={pending}>
        {pending ? "Проверяем" : "Войти"}
      </button>
    </form>
  );
}

function CodeField() {
  return (
    <div className={s.field}>
      <label htmlFor="code" className={s.label}>
        Код из приложения
      </label>
      <input
        id="code"
        name="code"
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="[0-9 ]*"
        maxLength={7}
        className={`${s.input} ${s.codeInput}`}
        autoFocus
       
      />
    </div>
  );
}

export function CodeForm() {
  const [state, action, pending] = useActionState<AuthState, FormData>(verifyCode, {});
  return (
    <form action={action} className={s.form} noValidate>
      <CodeField />
      <FormError state={state} />
      <button type="submit" className={s.submit} disabled={pending}>
        {pending ? "Проверяем" : "Подтвердить"}
      </button>
    </form>
  );
}

export function SetupForm({ secret, sig }: { secret: string; sig: string }) {
  const [state, action, pending] = useActionState<AuthState, FormData>(confirmSetup, {});
  return (
    <form action={action} className={s.form} noValidate>
      <input type="hidden" name="secret" value={secret} />
      <input type="hidden" name="sig" value={sig} />
      <CodeField />
      <FormError state={state} />
      <button type="submit" className={s.submit} disabled={pending}>
        {pending ? "Проверяем" : "Подключить и войти"}
      </button>
    </form>
  );
}

export function LinkForm() {
  const { token } = useParams<{ token: string }>();
  const [state, action, pending] = useActionState<AuthState, FormData>(() => redeemLoginLink(token), {});
  return (
    <form action={action} className={s.form} noValidate>
      <FormError state={state} />
      <button type="submit" className={s.submit} disabled={pending}>
        {pending ? "Проверяем" : "Продолжить вход"}
      </button>
    </form>
  );
}

export function PasswordForm() {
  const [state, action, pending] = useActionState<AuthState, FormData>(loginWithLink, {});
  return (
    <form action={action} className={s.form} noValidate>
      <div className={s.field}>
        <label htmlFor="password" className={s.label}>
          Пароль
        </label>
        <input id="password" name="password" type="password" autoComplete="current-password" className={s.input} autoFocus />
      </div>
      <FormError state={state} />
      <button type="submit" className={s.submit} disabled={pending}>
        {pending ? "Проверяем" : "Войти"}
      </button>
    </form>
  );
}
