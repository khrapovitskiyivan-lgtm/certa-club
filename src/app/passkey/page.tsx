import { Enroll } from "./enroll";
import s from "../invite/invite.module.css";

export default function PasskeyPage() {
  return (
    <main className={s.page}>
      <div className={s.narrow}>
        <p className={s.mark}>Certa</p>
        <h1 className={s.title}>Вход по Face ID</h1>
        <p className={s.lead}>
          Входить в клуб вы будете без пароля, как в банковском приложении: касанием или взглядом. Нажмите кнопку и
          подтвердите Face ID, отпечатком пальца или кодом-паролем телефона, как удобнее.
        </p>
        <p className={s.hint}>
          Ключ входа хранится на вашем устройстве и в вашей связке ключей (iCloud или Google). Клуб не получает ни
          ваших биометрических данных, ни паролей.
        </p>
        <Enroll />
      </div>
    </main>
  );
}
