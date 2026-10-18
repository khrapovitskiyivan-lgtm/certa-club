import { PasswordForm } from "../forms";
import s from "../../invite/invite.module.css";

export default function PasswordPage() {
  return (
    <main className={s.page}>
      <div className={s.narrow}>
        <p className={s.mark}>Certa</p>
        <h1 className={s.title}>Пароль</h1>
        <p className={s.lead}>Пароль, который вы задали при вступлении.</p>
        <PasswordForm />
      </div>
    </main>
  );
}
