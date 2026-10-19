import s from "./invite.module.css";

const STEPS = ["О клубе", "О вас"] as const;

// Индикатор пути вступления: два шага, верификация позже, по необходимости, текущий выделен.
export function Steps({ current }: { current: 0 | 1 }) {
  return (
    <ol className={s.steps} aria-label="Шаги вступления">
      {STEPS.map((label, i) => (
        <li key={label} className={i === current ? s.stepCurrent : i < current ? s.stepDone : s.step} aria-current={i === current ? "step" : undefined}>
          <span className={s.stepNum}>{i + 1}</span>
          {label}
        </li>
      ))}
    </ol>
  );
}
