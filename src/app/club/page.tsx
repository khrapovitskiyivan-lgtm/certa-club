import { Suspense } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { currentMember } from "@/server/auth";
import { logout } from "../auth-actions";
import s from "../invite/invite.module.css";

export default function ClubPage() {
  return (
    <main className={s.page}>
      <div className={s.narrow}>
        <p className={s.mark}>Certa</p>
        <Suspense fallback={null}>
          <ClubContent />
        </Suspense>
      </div>
    </main>
  );
}

async function ClubContent() {
  await connection();
  const m = await currentMember();
  if (!m) redirect("/login");
  if (m.status === "awaiting_kyc") redirect("/verify");

  return (
    <>
      {m.status === "active" ? (
        <>
          <h1 className={s.title}>Добро пожаловать, {m.pseudonym}</h1>
          <p className={s.lead}>
            Ваше участие подтверждено. Здесь появятся предложения клуба и запросы участников.
          </p>
        </>
      ) : (
        <>
          <h1 className={s.title}>Верификация на рассмотрении</h1>
          <p className={s.lead}>
            Экспертный совет рассматривает вашу верификацию. Когда участие будет подтверждено, клуб откроется для
            вас здесь.
          </p>
        </>
      )}
      <form action={logout}>
        <button type="submit" className={s.backBtn}>
          Выйти
        </button>
      </form>
    </>
  );
}
