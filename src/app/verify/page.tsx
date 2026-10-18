import { Suspense } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { sessionMemberId } from "@/server/session";
import { store } from "@/server/store";
import { Steps } from "../invite/steps";
import { VerifyForm } from "./verify-form";
import s from "../invite/invite.module.css";

export default function VerifyPage() {
  return (
    <main className={s.page}>
      <div className={s.narrow}>
        <p className={s.mark}>Certa</p>
        <Suspense fallback={null}>
          <VerifyContent />
        </Suspense>
      </div>
    </main>
  );
}

async function VerifyContent() {
  // Сессия и статус участника читаются только во время запроса.
  await connection();
  const id = await sessionMemberId();
  const member = id ? await store.getMember(id) : undefined;
  if (!member) {
    return (
      <>
        <h1 className={s.title}>Сессия истекла</h1>
        <p className={s.lead}>Чтобы продолжить верификацию, обратитесь к куратору клуба.</p>
      </>
    );
  }
  if (member.status !== "awaiting_kyc") redirect("/welcome");

  return (
    <>
      <Steps current={2} />
      <h1 className={s.title}>Верификация</h1>
      <p className={s.lead}>
        Клуб работает по стандартам частного банковского обслуживания: каждый участник подтверждает личность
        и финансовую состоятельность. Раскрывать состав активов не требуется. Выберите удобный способ.
      </p>
      <VerifyForm />
    </>
  );
}
