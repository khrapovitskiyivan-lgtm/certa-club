import { CodeForm } from "../forms";
import s from "../../invite/invite.module.css";

export default function CodePage() {
  return (
    <main className={s.page}>
      <div className={s.narrow}>
        <p className={s.mark}>Certa</p>
        <h1 className={s.title}>Код подтверждения</h1>
        <p className={s.lead}>Откройте приложение-аутентификатор и введите шестизначный код для Certa.</p>
        <CodeForm />
      </div>
    </main>
  );
}
