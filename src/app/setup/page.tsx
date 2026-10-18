import { Suspense } from "react";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { store } from "@/server/store";
import { SetupForm } from "./setup-form";
import s from "../invite/invite.module.css";

// Страница существует, только пока база пуста; после первого приглашения отдаёт 404.
export default function SetupPage() {
  return (
    <main className={s.page}>
      <div className={s.narrow}>
        <p className={s.mark}>Certa</p>
        <Suspense fallback={null}>
          <SetupContent />
        </Suspense>
      </div>
    </main>
  );
}

async function SetupContent() {
  await connection();
  if (!(await store.isEmpty())) notFound();
  return (
    <>
      <h1 className={s.title}>Первичная настройка</h1>
      <p className={s.lead}>
        Клуб ещё пуст. Создайте приглашение для первого члена экспертного совета: по нему он зарегистрируется,
        подключит второй фактор и дальше будет выдавать приглашения из кабинета.
      </p>
      <SetupForm />
    </>
  );
}
