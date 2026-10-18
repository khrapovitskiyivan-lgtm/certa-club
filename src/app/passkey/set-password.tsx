"use client";

import { useActionState } from "react";
import { setPasswordAction, type SetPasswordState } from "../auth-actions";
import s from "../invite/invite.module.css";

// Строка «Задайте пароль» для тех, у кого пароля ещё нет.
export function SetPassword() {
  const [state, action, pending] = useActionState<SetPasswordState, FormData>(setPasswordAction, {});
  if (state.done) return <p className={s.offer}>Пароль задан. Теперь можно входить по почте и паролю.</p>;
  return (
    <form action={action} className={s.offer} noValidate>
      <span>Задайте пароль для входа по почте:</span>
      <input name="password" type="password" placeholder="Пароль" autoComplete="new-password" className={s.input} />
      <input name="passwordConfirm" type="password" placeholder="Ещё раз" autoComplete="new-password" className={s.input} />
      <button type="submit" className={s.offerBtn} disabled={pending}>
        Сохранить
      </button>
      {state.error && <span className={s.fieldError}>{state.error}</span>}
    </form>
  );
}
