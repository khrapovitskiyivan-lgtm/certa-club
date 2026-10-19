"use client";

import { useActionState } from "react";
import { setPasswordAction, type SetPasswordState } from "../../auth-actions";
import s from "../../invite/invite.module.css";

export function ChangePasswordForm() {
  const [state, action, pending] = useActionState<SetPasswordState, FormData>(setPasswordAction, {});
  if (state.done) return <p className={s.lead}>Пароль сохранён. Теперь входите по почте и этому паролю на любом устройстве.</p>;
  return (
    <form action={action} className={s.form} noValidate>
      <div className={s.group}>
        <div className={s.field}>
          <label htmlFor="password" className={s.label}>
            Новый пароль
          </label>
          <input id="password" name="password" type="password" autoComplete="new-password" className={s.input} />
          <p className={s.hint}>Не короче 8 символов</p>
        </div>
        <div className={s.field}>
          <label htmlFor="passwordConfirm" className={s.label}>
            Ещё раз
          </label>
          <input id="passwordConfirm" name="passwordConfirm" type="password" autoComplete="new-password" className={s.input} />
        </div>
      </div>
      {state.error && <p className={s.formError}>{state.error}</p>}
      <button type="submit" className={s.submit} disabled={pending}>
        {pending ? "Сохраняем" : "Сохранить пароль"}
      </button>
    </form>
  );
}
