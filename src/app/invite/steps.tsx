import s from "./invite.module.css";

const STEPS = ["О клубе", "О вас", "Верификация"] as const;

// Индикатор пути вступления: три шага, текущий выделен.
export function Steps({ current }: { current: 0 | 1 | 2 }) {
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
