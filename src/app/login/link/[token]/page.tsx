import { Suspense } from "react";
import { LinkForm } from "../../forms";
import s from "../../../invite/invite.module.css";

// Ссылку гасим только по нажатию кнопки: почтовые сканеры, открывающие ссылки заранее, её не потратят.
export default function LinkPage() {
  return (
    <main className={s.page}>
      <div className={s.narrow}>
        <p className={s.mark}>Certa</p>
        <h1 className={s.title}>Вход в клуб</h1>
        <p className={s.lead}>Нажмите, чтобы продолжить. Затем включите вход по Face ID на этом устройстве.</p>
        <Suspense fallback={null}>
          <LinkForm />
        </Suspense>
      </div>
    </main>
  );
}
