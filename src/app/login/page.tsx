import { PasskeyLogin, PasswordLogin } from "./forms";
import s from "../invite/invite.module.css";

export default function LoginPage() {
  return (
    <main className={s.page}>
      <div className={s.narrow}>
        <p className={s.mark}>Certa</p>
        <h1 className={s.title}>Вход для участников</h1>
        <PasswordLogin />
        <p className={s.hint} style={{ margin: "36px 0 14px" }}>
          Если на этом устройстве включён вход по Face ID:
        </p>
        <PasskeyLogin />
      </div>
    </main>
  );
}
