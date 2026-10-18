"use client";

import { useActionState, useState } from "react";
import { issueInvite, type InviteState } from "./actions";
import s from "../invite/invite.module.css";
import c from "./council.module.css";

export function InviteForm() {
  const [state, action, pending] = useActionState<InviteState, FormData>(issueInvite, {});
  const [copied, setCopied] = useState(false);

  return (
    <div className={c.inviteBox}>
      <form action={action} className={c.inline} noValidate>
        <div className={s.field}>
          <label htmlFor="name" className={s.label}>
            Кого приглашаем
          </label>
          <input id="name" name="name" className={s.input} placeholder="Имя и фамилия" />
        </div>
        <div className={s.field}>
          <label htmlFor="days" className={s.label}>
            Срок, дней
          </label>
          <input id="days" name="days" type="number" min={1} max={60} defaultValue={14} className={s.input} />
        </div>
        <button type="submit" className={s.submit} disabled={pending}>
          {pending ? "Создаём" : "Создать приглашение"}
        </button>
      </form>
      {state.error && <p className={s.formError}>{state.error}</p>}
      {state.link && (
        <div className={c.issued}>
          <p className={s.label}>Приглашение создано: {state.name}. Ссылка показывается один раз, сохраните её.</p>
          <p className={c.warn}>
            Не открывайте ссылку сами: она одноразовая и сработает только для первого, кто по ней зарегистрируется.
            Отправьте её лично и попросите открыть в Safari или Chrome, а не внутри Telegram.
          </p>
          <p className={c.link}>{state.link}</p>
          <p className={s.hint}>Код для ввода на главной: {state.code}</p>
          <button
            type="button"
            className={s.backBtn}
            onClick={async () => {
              await navigator.clipboard.writeText(state.link!);
              setCopied(true);
            }}
          >
            {copied ? "Скопировано" : "Скопировать ссылку"}
          </button>
        </div>
      )}
    </div>
  );
}
