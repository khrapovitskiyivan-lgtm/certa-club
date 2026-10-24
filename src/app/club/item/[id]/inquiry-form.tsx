"use client";

import { useActionState } from "react";
import { inquire, type InquiryState } from "../../actions";
import s from "../../../invite/invite.module.css";

export function InquiryForm({ id, kind }: { id: string; kind: "offer" | "request" }) {
  const [state, action, pending] = useActionState<InquiryState, FormData>(inquire, {});
  if (state.done) {
    return <p className={s.lead}>Отклик передан куратору клуба. Он свяжется с вами по почте или телефону из анкеты. Автор не увидит вашего имени без вашего согласия.</p>;
  }
  return (
    <form action={action} className={s.form} noValidate>
      <input type="hidden" name="id" value={id} />
      <div className={s.field}>
        <label htmlFor="message" className={s.label}>
          {kind === "offer" ? "Комментарий для куратора (необязательно)" : "Что у вас есть (необязательно)"}
        </label>
        <textarea id="message" name="message" rows={3} maxLength={1000} className={s.input} />
      </div>
      {state.error && <p className={s.formError}>{state.error}</p>}
      <button type="submit" className={s.submit} disabled={pending}>
        {pending ? "Отправляем" : kind === "offer" ? "Запросить" : "Есть у меня"}
      </button>
    </form>
  );
}
