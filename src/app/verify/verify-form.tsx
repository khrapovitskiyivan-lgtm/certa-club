"use client";

import { useActionState, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { AGENT_TYPES } from "@/core/verification";
import { submitVerification, type VerifyState } from "../actions";
import s from "../invite/invite.module.css";

export function VerifyForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState<VerifyState, FormData>(submitVerification, {});
  const [method, setMethod] = useState(state.values?.method ?? "");
  const e = state.errors ?? {};

  return (
    <form action={action} className={s.form} noValidate>
      {/* Выбор держим в состоянии: сброс формы после отправки не должен терять способ. */}
      <input type="hidden" name="method" value={method} />
      <input type="hidden" name="next" value={next} />
      <div className={s.options} role="radiogroup" aria-label="Способ верификации">
        <label className={s.option}>
          <input type="radio" name="methodChoice" value="self" checked={method === "self"} onChange={() => setMethod("self")} />
          <span className={s.optionTitle}>Лично</span>
          <span className={s.optionText}>
            Через независимого провайдера: документ, удостоверяющий личность, и проверка лица.
            Ссылку на проверку куратор клуба пришлёт на почту из анкеты.
          </span>
        </label>
        <label className={s.option}>
          <input type="radio" name="methodChoice" value="agent" checked={method === "agent"} onChange={() => setMethod("agent")} />
          <span className={s.optionTitle}>Через агента</span>
          <span className={s.optionText}>
            Ваш банк, семейный офис или доверенный представитель подтвердит личность и состоятельность. Клуб
            свяжется с агентом сам.
          </span>
        </label>
        {e.method && <p className={s.fieldError}>{e.method}</p>}
      </div>

      <AnimatePresence initial={false}>
        {method === "agent" && (
          <motion.fieldset
            className={s.group}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            style={{ overflow: "hidden" }}
          >
            <legend className={s.legend}>Агент</legend>
            <div className={s.field}>
              <label htmlFor="agentType" className={s.label}>
                Кто подтвердит
              </label>
              <select id="agentType" name="agentType" className={s.select} defaultValue={state.values?.agentType ?? ""}>
                <option value="" disabled>
                  Выберите
                </option>
                {Object.entries(AGENT_TYPES).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
              {e.agentType && <p className={s.fieldError}>{e.agentType}</p>}
            </div>
            <div className={s.field}>
              <label htmlFor="agentName" className={s.label}>
                Название или имя
              </label>
              <input id="agentName" name="agentName" className={s.input} defaultValue={state.values?.agentName ?? ""} />
              {e.agentName && <p className={s.fieldError}>{e.agentName}</p>}
            </div>
            <div className={s.field}>
              <label htmlFor="agentContact" className={s.label}>
                Контакт для связи
              </label>
              <input id="agentContact" name="agentContact" className={s.input} defaultValue={state.values?.agentContact ?? ""} />
              <p className={s.hint}>Почта или телефон вашего менеджера или представителя</p>
              {e.agentContact && <p className={s.fieldError}>{e.agentContact}</p>}
            </div>
          </motion.fieldset>
        )}
      </AnimatePresence>

      {state.formError && (
        <p className={s.formError} role="alert">
          {state.formError}
        </p>
      )}

      <button type="submit" className={s.submit} disabled={pending}>
        {pending ? "Отправляем" : "Отправить на верификацию"}
      </button>
    </form>
  );
}
