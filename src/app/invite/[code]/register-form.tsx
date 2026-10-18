"use client";

import { useActionState } from "react";
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
};

function Field({ name, label, state, type = "text", hint, autoComplete, textarea }: FieldProps) {
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
      {textarea ? <textarea rows={3} maxLength={500} {...common} /> : <input type={type} {...common} />}
      {hint && !error && <p className={s.hint}>{hint}</p>}
      {error && (
        <p id={`${name}-err`} className={s.fieldError}>
          {error}
        </p>
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
        <Field name="phone" label="Телефон" type="tel" state={state} autoComplete="tel" />
        <Field name="city" label="Город" state={state} autoComplete="address-level2" />
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
        <Field
          name="password"
          label="Пароль"
          type="password"
          state={state}
          autoComplete="new-password"
          hint="Не короче 12 символов"
        />
        <Field name="passwordConfirm" label="Пароль ещё раз" type="password" state={state} autoComplete="new-password" />
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
