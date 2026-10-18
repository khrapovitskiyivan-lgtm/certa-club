import { PasskeyLogin } from "./forms";
import s from "../invite/invite.module.css";

export default function LoginPage() {
  return (
    <main className={s.page}>
      <div className={s.narrow}>
        <p className={s.mark}>Certa</p>
        <h1 className={s.title}>Вход для участников</h1>
        <p className={s.lead}>Face ID, отпечаток пальца или код-пароль телефона, как удобнее.</p>
        <PasskeyLogin />
        <p className={s.hint} style={{ marginTop: 28 }}>
          Новое устройство? На главной странице нажмите «Вход по приглашению» и введите свою почту.
        </p>
      </div>
    </main>
  );
}
