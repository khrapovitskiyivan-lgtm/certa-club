"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useRouter } from "next/navigation";
import { browserSupportsWebAuthnAutofill, startAuthentication } from "@simplewebauthn/browser";
import { passkeyAuthenticationOptions, passkeyAuthenticationVerify } from "./passkey-actions";
import { enterCode, type CodeState } from "./actions";
import s from "./hero.module.css";

const EASE = [0.22, 1, 0.36, 1] as const;
const LETTERS = "CERTA".split("");
const SEEN_KEY = "certa.intro.seen";

// Длительность интро в секундах. Само интро на CSS (hero.module.css): оно идёт и без скриптов,
// иначе при медленной загрузке JS страница остаётся пустой.
const INTRO = 4.8;

export function Hero() {
  const reduced = useReducedMotion();
  // skip: интро нельзя ждать, любое действие доводит его до финала.
  const [skip, setSkip] = useState(false);
  const [done, setDone] = useState(false);
  const [open, setOpen] = useState(false);
  const doneRef = useRef(false);
  const instant = Boolean(reduced) || skip;

  useEffect(() => {
    // На повторном визите интро сразу в финале. Читаем после гидратации, чтобы HTML сервера и клиента совпадал.
    try {
      if (sessionStorage.getItem(SEEN_KEY)) {
        doneRef.current = true;
        const t = setTimeout(() => {
          setSkip(true);
          setDone(true);
        }, 0);
        return () => clearTimeout(t);
      }
      sessionStorage.setItem(SEEN_KEY, "1");
    } catch {}
    const total = INTRO * 1000;
    const id = setTimeout(() => {
      doneRef.current = true;
      setDone(true);
    }, instant ? 0 : total);
    // Пропуск только во время интро: перемонтирование доводит всё до финала мгновенно.
    const stop = () => {
      if (doneRef.current) return;
      doneRef.current = true;
      setSkip(true);
      setDone(true);
    };
    window.addEventListener("pointerdown", stop, { once: true });
    window.addEventListener("keydown", stop, { once: true });
    window.addEventListener("wheel", stop, { once: true });
    return () => {
      clearTimeout(id);
      window.removeEventListener("pointerdown", stop);
      window.removeEventListener("keydown", stop);
      window.removeEventListener("wheel", stop);
    };
  }, [instant]);

  return (
    <main className={s.root} data-done={done || instant ? "" : undefined} data-skip={instant ? "" : undefined}>
      <div className={s.center}>
        <h1 className={s.name} aria-label="Certa">
          {LETTERS.map((ch, i) => (
            <span key={i} aria-hidden className={s.letter} style={{ "--i": i } as React.CSSProperties}>
              {ch}
            </span>
          ))}
          <span className={s.tagline}>Редкие вещи. Проверенные люди.</span>
        </h1>

        <div className={s.line} />
      </div>

      <div className={s.invite}>
        <AnimatePresence mode="wait" initial={false}>
          {open ? (
            <CodeForm key="form" onClose={() => setOpen(false)} />
          ) : (
            <motion.button
              key="btn"
              type="button"
              className={s.inviteBtn}
              onClick={() => setOpen(true)}
              exit={{ opacity: 0, transition: { duration: 0.15 } }}
            >
              Вход по приглашению
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}

function CodeForm({ onClose }: { onClose: () => void }) {
  const [state, action, pending] = useActionState<CodeState, FormData>(enterCode, {});
  const ref = useRef<HTMLInputElement>(null);
  const router = useRouter();
  // Введена почта: показываем поле пароля и «Забыли пароль?».
  const [value, setValue] = useState(state.email ?? "");
  const isEmail = value.includes("@");
  useEffect(() => ref.current?.focus(), []);

  // Вход участника без ввода: если на устройстве есть ключ клуба, система сама предложит его
  // в подсказках поля. Постороннему ничего не показывается.
  useEffect(() => {
    let active = true;
    (async () => {
      if (!(await browserSupportsWebAuthnAutofill())) return;
      try {
        const options = await passkeyAuthenticationOptions();
        const response = await startAuthentication({ optionsJSON: options, useBrowserAutofill: true });
        const r = await passkeyAuthenticationVerify(response);
        if (active && r.ok) router.push(r.next);
      } catch {
        // Пользователь не выбрал ключ или ввёл код приглашения: ничего не делаем.
      }
    })();
    return () => {
      active = false;
    };
  }, [router]);

  return (
    <motion.form
      action={action}
      noValidate
      className={s.form}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } }}
      exit={{ opacity: 0, transition: { duration: 0.25 } }}
      onKeyDown={(e) => e.key === "Escape" && onClose()}
    >
      <label className={s.srOnly} htmlFor="code">
        Код приглашения или почта участника
      </label>
      <input
        ref={ref}
        id="code"
        name="code"
        className={s.input}
        placeholder="Код приглашения или почта"
        autoComplete="username webauthn"
        spellCheck={false}
        defaultValue={state.email ?? ""}
        onChange={(e) => setValue(e.target.value)}
      />
      {!isEmail && (
        <button type="submit" className={s.submit} disabled={pending} aria-label="Продолжить">
          {pending ? "…" : "→"}
        </button>
      )}
      {/* Поле пароля в DOM всегда: менеджер паролей заполняет пару почта+пароль сразу, до ввода «@» оно скрыто визуально */}
      <label className={s.srOnly} htmlFor="password">
        Пароль
      </label>
      <input
        id="password"
        name="password"
        type="password"
        className={isEmail ? `${s.input} ${s.password}` : s.srOnly}
        tabIndex={isEmail ? undefined : -1}
        placeholder="Пароль"
        autoComplete="current-password"
      />
      {isEmail && (
        <>
          <button type="submit" className={s.submit} disabled={pending} aria-label="Войти">
            {pending ? "…" : "→"}
          </button>
          <button type="submit" name="intent" value="link" className={s.forgot} disabled={pending}>
            Забыли пароль?
          </button>
        </>
      )}
      <p className={state.error ? s.error : s.notice} role="status" aria-live="polite">
        {state.error ?? state.notice ?? ""}
      </p>
    </motion.form>
  );
}
