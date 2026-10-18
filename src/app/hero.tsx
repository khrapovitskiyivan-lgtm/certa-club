"use client";

import { Fragment, useActionState, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { enterCode, type CodeState } from "./actions";
import s from "./hero.module.css";

const EASE = [0.22, 1, 0.36, 1] as const;
const LETTERS = "CERTA".split("");
const SEEN_KEY = "certa.intro.seen";

// Таймлайн интро в секундах; на повторном визите сжимается.
const T = { line: 0, letters: 0.8, step: 0.2, letterDur: 2.2, invite: 4 };

export function Hero() {
  const reduced = useReducedMotion();
  const [speed] = useState(() => {
    if (typeof window === "undefined") return 1;
    try {
      return sessionStorage.getItem(SEEN_KEY) ? 0.35 : 1;
    } catch {
      return 1;
    }
  });
  // skip: интро нельзя ждать, любое действие доводит его до финала.
  const [skip, setSkip] = useState(false);
  const [done, setDone] = useState(false);
  const [open, setOpen] = useState(false);
  const doneRef = useRef(false);
  const instant = Boolean(reduced) || skip;

  useEffect(() => {
    try {
      sessionStorage.setItem(SEEN_KEY, "1");
    } catch {}
    const total = (T.invite + 0.8) * speed * 1000;
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
  }, [instant, speed]);

  const at = (delay: number, duration: number) =>
    instant ? { duration: 0 } : { delay: delay * speed, duration: duration * speed, ease: EASE };

  return (
    <main className={s.root} data-done={done || instant ? "" : undefined}>
      <Fragment key={skip ? "skip" : "intro"}>
      <div className={s.center}>
        <h1 className={s.name} aria-label="Certa">
          {LETTERS.map((ch, i) => (
            <motion.span
              key={i}
              aria-hidden
              className={s.letter}
              initial={{ opacity: 0, x: (i - 2) * 22, filter: "blur(8px)" }}
              animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
              transition={at(T.letters + i * T.step, T.letterDur)}
            >
              {ch}
            </motion.span>
          ))}
          <span className={s.tagline}>Редкие вещи. Проверенные люди.</span>
        </h1>

        <motion.div
          className={s.line}
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={at(T.line, 0.8)}
        />
      </div>

      <motion.div
        className={s.invite}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={at(T.invite, 0.6)}
      >
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
      </motion.div>
      </Fragment>
    </main>
  );
}

function CodeForm({ onClose }: { onClose: () => void }) {
  const [state, action, pending] = useActionState<CodeState, FormData>(enterCode, {});
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => ref.current?.focus(), []);

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
        autoComplete="off"
        spellCheck={false}

      />
      <button type="submit" className={s.submit} disabled={pending} aria-label="Войти">
        {pending ? "…" : "→"}
      </button>
      <p className={state.error ? s.error : s.notice} role="status" aria-live="polite">
        {state.error ?? state.notice ?? ""}
      </p>
    </motion.form>
  );
}
