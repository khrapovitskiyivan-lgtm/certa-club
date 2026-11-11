"use client";

import { useActionState } from "react";
import { EXPERT_FIELDS, NAME_MODES, type Expert } from "@/core/expert";
import { saveExpertAction, type ExpertFormState } from "./actions";
import s from "../../invite/invite.module.css";

// Профиль эксперта: новый (без expert) или правка существующего.
export function ExpertForm({ expert }: { expert?: Expert }) {
  const [state, action, pending] = useActionState<ExpertFormState, FormData>(saveExpertAction, {});
  const e = state.errors ?? {};
  const id = expert?.id ?? "new";
  // После ошибки показываем введённое, иначе сохранённое.
  const iv = state.values;
  const val = (k: string, saved: string | number | undefined) => iv?.[k] ?? (saved === undefined ? "" : String(saved));
  const chk = (k: string, saved: boolean) => (iv ? iv[k] === "on" : saved);
  const v = expert;
  return (
    <form key={state.values ? JSON.stringify(state.values) : "saved"} action={action} className={s.form} noValidate>
      {v && <input type="hidden" name="id" value={v.id} />}
      <div className={s.field}>
        <label htmlFor={`fn-${id}`} className={s.label}>
          Имя и фамилия
        </label>
        <input id={`fn-${id}`} name="fullName" className={s.input} defaultValue={val("fullName", v?.fullName)} />
        {e.fullName && <p className={s.fieldError}>{e.fullName}</p>}
      </div>
      <div className={s.field}>
        <label htmlFor={`nm-${id}`} className={s.label}>
          Как показывать имя
        </label>
        <select id={`nm-${id}`} name="nameMode" className={s.select} defaultValue={val("nameMode", v?.nameMode ?? "full")}>
          {Object.entries(NAME_MODES).map(([k, t]) => (
            <option key={k} value={k}>
              {t}
            </option>
          ))}
        </select>
      </div>
      <div className={s.field}>
        <label htmlFor={`fd-${id}`} className={s.label}>
          Направление
        </label>
        <select id={`fd-${id}`} name="field" className={s.select} defaultValue={val("field", v?.field)}>
          <option value="" disabled>
            Выберите
          </option>
          {Object.entries(EXPERT_FIELDS).map(([k, t]) => (
            <option key={k} value={k}>
              {t}
            </option>
          ))}
        </select>
        {e.field && <p className={s.fieldError}>{e.field}</p>}
      </div>
      <div className={s.field}>
        <label htmlFor={`sp-${id}`} className={s.label}>
          Специализация (необязательно)
        </label>
        <input
          id={`sp-${id}`}
          name="specialization"
          className={s.input}
          defaultValue={val("specialization", v?.specialization)}
          placeholder="Например: швейцарские механические часы XX века"
        />
      </div>
      <div className={s.field}>
        <label htmlFor={`cr-${id}`} className={s.label}>
          Квалификация
        </label>
        <textarea
          id={`cr-${id}`}
          name="credentials"
          rows={3}
          className={s.input}
          defaultValue={val("credentials", v?.credentials)}
          placeholder="Образование, аттестация, место работы"
        />
        {e.credentials && <p className={s.fieldError}>{e.credentials}</p>}
      </div>
      <div className={s.field}>
        <label htmlFor={`yr-${id}`} className={s.label}>
          Стаж, лет (необязательно)
        </label>
        <input id={`yr-${id}`} name="experienceYears" inputMode="numeric" className={s.input} defaultValue={val("experienceYears", v?.experienceYears)} />
        {e.experienceYears && <p className={s.fieldError}>{e.experienceYears}</p>}
      </div>
      <div className={s.field}>
        <label htmlFor={`ct-${id}`} className={s.label}>
          Город (необязательно)
        </label>
        <input id={`ct-${id}`} name="city" className={s.input} defaultValue={val("city", v?.city)} />
      </div>
      <div className={s.agree}>
        <label className={s.check}>
          <input type="checkbox" name="consent" defaultChecked={chk("consent", Boolean(v?.consentAt))} />
          <span>Эксперт письменно согласился на публикацию профиля</span>
        </label>
        <label className={s.check}>
          <input type="checkbox" name="published" defaultChecked={chk("published", v?.published ?? false)} />
          <span>Показывать во вкладке «Эксперты»</span>
        </label>
        {e.published && <p className={s.fieldError}>{e.published}</p>}
      </div>
      {state.formError && (
        <p className={s.formError} role="alert">
          {state.formError}
        </p>
      )}
      {state.saved && <p className={s.hint}>Сохранено</p>}
      <button type="submit" className={s.submit} disabled={pending}>
        {pending ? "Сохраняем" : v ? "Сохранить" : "Добавить эксперта"}
      </button>
    </form>
  );
}
