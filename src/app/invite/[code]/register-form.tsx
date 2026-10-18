"use client";

import { useActionState, useState } from "react";
import { CITY_SUGGESTIONS, formatPhone } from "@/core/phone";
import { register, type RegisterState } from "../../actions";
import s from "../invite.module.css";

type FieldProps = {
  name: string;
  label: string;
  state: RegisterState;
  type?: string;
  hint?: string;
  autoComplete?: string;
  textarea?: boolean;
  list?: string;
};

function Field({ name, label, state, type = "text", hint, autoComplete, textarea, list }: FieldProps) {
  const error = state.errors?.[name as keyof NonNullable<RegisterState["errors"]>];
  const common = {
    id: name,
    name,
    defaultValue: state.values?.[name] ?? "",
    autoComplete,
    "aria-invalid": error ? true : undefined,
    "aria-describedby": error ? `${name}-err` : undefined,
    className: s.input,
  };
  return (
    <div className={s.field}>
      <label htmlFor={name} className={s.label}>
        {label}
      </label>
      {textarea ? <textarea rows={3} maxLength={500} {...common} /> : <input type={type} list={list} {...common} />}
      {hint && !error && <p className={s.hint}>{hint}</p>}
      {error && (
        <p id={`${name}-err`} className={s.fieldError}>
          {error}
        </p>
      )}
    </div>
  );
}

// Телефон с маской: российский номер форматируется при вводе, иностранный вводится свободно.
function PhoneField({ state }: { state: RegisterState }) {
  const [value, setValue] = useState(state.values?.phone ?? "+7");
  const error = state.errors?.phone;
  return (
    <div className={s.field}>
      <label htmlFor="phone" className={s.label}>
        Телефон
      </label>
      <input
        id="phone"
        name="phone"
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        className={s.input}
        value={value}
        onChange={(e) => setValue(formatPhone(e.target.value))}
        aria-invalid={error ? true : undefined}
      />
      {error ? (
        <p className={s.fieldError}>{error}</p>
      ) : (
        <p className={s.hint}>Для другой страны сотрите +7 и введите её код, например +971</p>
      )}
    </div>
  );
}

export function RegisterForm({ code }: { code: string }) {
  const [state, action, pending] = useActionState<RegisterState, FormData>(register.bind(null, code), {});

  return (
    <form action={action} className={s.form} noValidate>
      <fieldset className={s.group}>
        <legend className={s.legend}>О вас</legend>
        <Field name="fullName" label="Имя и фамилия" state={state} autoComplete="name" />
        <Field name="email" label="Почта" type="email" state={state} autoComplete="email" />
        <PhoneField state={state} />
        <Field name="city" label="Город" state={state} autoComplete="address-level2" list="city-list" hint="Начните вводить, появятся подсказки" />
        <datalist id="city-list">
          {CITY_SUGGESTIONS.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
        <Field name="occupation" label="Род занятий" state={state} hint="Одной строкой" />
        <Field
          name="about"
          label="Чем хотели бы поделиться с клубом"
          state={state}
          textarea
          hint="Необязательно. Не указывайте номера счетов и сведения об активах."
        />
      </fieldset>

      <fieldset className={s.group}>
        <legend className={s.legend}>В клубе</legend>
        <Field
          name="pseudonym"
          label="Псевдоним"
          state={state}
          hint="Под ним вас видят другие участники. Имя раскрывается только с вашего согласия."
        />
      </fieldset>

      <div className={s.agree}>
        <label className={s.check}>
          <input type="checkbox" name="agreeRules" defaultChecked={state.values?.agreeRules === "on"} />
          <span>Я принимаю правила клуба и соглашение об электронной подписи</span>
        </label>
        {state.errors?.agreeRules && <p className={s.fieldError}>{state.errors.agreeRules}</p>}
      </div>

      {state.formError && (
        <p className={s.formError} role="alert">
          {state.formError}
        </p>
      )}

      <button type="submit" className={s.submit} disabled={pending}>
        {pending ? "Отправляем" : "Вступить в клуб"}
      </button>
    </form>
  );
}
