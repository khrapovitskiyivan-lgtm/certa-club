"use client";

import { useActionState } from "react";
import { createFirstInvite, type SetupState } from "./actions";
import s from "../invite/invite.module.css";

export function SetupForm() {
  const [state, action, pending] = useActionState<SetupState, FormData>(createFirstInvite, {});
  if (state.link) {
    return (
      <div className={s.form}>
        <p className={s.lead}>Приглашение создано и действует двое суток. Ссылка показывается один раз:</p>
        <a href={state.link} className={s.secret}>
          {state.link}
        </a>
      </div>
    );
  }
  return (
    <form action={action} className={s.form} noValidate>
      <div className={s.field}>
        <label htmlFor="token" className={s.label}>
          Ключ настройки (CERTA_SETUP_TOKEN)
        </label>
        <input id="token" name="token" type="password" className={s.input} autoComplete="off" />
      </div>
      <div className={s.field}>
        <label htmlFor="name" className={s.label}>
          Имя первого члена совета
        </label>
        <input id="name" name="name" className={s.input} />
      </div>
      {state.error && <p className={s.formError}>{state.error}</p>}
      <button type="submit" className={s.submit} disabled={pending}>
        Создать приглашение
      </button>
    </form>
  );
}
