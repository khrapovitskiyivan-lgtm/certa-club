import { Suspense } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { currentMember } from "@/server/auth";
import { ChangePasswordForm } from "./form";
import { AppHeader } from "../../app-header";
import s from "../../invite/invite.module.css";

export default function PasswordPage() {
  return (
    <main className={s.page}>
      <div className={s.narrow}>
        <Suspense fallback={null}>
          <Content />
        </Suspense>
      </div>
    </main>
  );
}

async function Content() {
  await connection();
  const me = await currentMember();
  if (!me) redirect("/login");
  return (
    <>
      <AppHeader me={me} area={me.role === "council" ? "council" : "club"} />
      <h1 className={s.title}>Пароль</h1>
      <p className={s.lead}>Новый пароль для входа по почте ({me.email}).</p>
      <ChangePasswordForm hasPassword={Boolean(me.passwordHash)} email={me.email} />
    </>
  );
}
