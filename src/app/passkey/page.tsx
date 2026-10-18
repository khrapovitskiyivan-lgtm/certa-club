import { Steps } from "../invite/steps";
import { Enroll } from "./enroll";
import s from "../invite/invite.module.css";

export default function PasskeyPage() {
  return (
    <main className={s.page}>
      <div className={s.narrow}>
        <p className={s.mark}>Certa</p>
        <Steps current={2} />
        <h1 className={s.title}>Вход по Face ID</h1>
        <p className={s.lead}>
          Входить в клуб вы будете без пароля, как в банковском приложении: касанием или взглядом. Нажмите кнопку и
          подтвердите Face ID, Touch ID или отпечатком пальца.
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
