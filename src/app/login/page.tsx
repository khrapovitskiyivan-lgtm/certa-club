import { LoginForm } from "./forms";
import s from "../invite/invite.module.css";

export default function LoginPage() {
  return (
    <main className={s.page}>
      <div className={s.narrow}>
        <p className={s.mark}>Certa</p>
        <h1 className={s.title}>Вход для участников</h1>
        <p className={s.lead}>Почта и пароль, указанные при вступлении. Затем код из приложения на телефоне.</p>
        <LoginForm />
      </div>
    </main>
  );
}
