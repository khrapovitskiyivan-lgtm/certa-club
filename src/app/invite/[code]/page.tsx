import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { checkInvite, normalizeCode } from "@/core/invites";
import { store } from "@/server/store";
import { Onboarding } from "./onboarding";
import s from "../invite.module.css";

export default function InvitePage({ params }: PageProps<"/invite/[code]">) {
  return (
    <Suspense fallback={<main className={s.page} />}>
      <InviteContent params={params} />
    </Suspense>
  );
}

// Состояние приглашения читается из хранилища на каждый запрос, не кэшируется.
async function InviteContent({ params }: { params: Promise<{ code: string }> }) {
  await connection();
  const { code } = await params;
  const check = checkInvite(await store.listInvites(), decodeURIComponent(code), new Date());

  if (!check.ok) {
    return (
      <main className={s.page}>
        <div className={s.narrow}>
          <p className={s.mark}>Certa</p>
          <h1 className={s.title}>Приглашение недействительно</h1>
          <p className={s.lead}>
            {check.reason === "used"
              ? "По этому приглашению уже прошла регистрация."
              : check.reason === "expired"
                ? "Срок действия приглашения истёк."
                : "Мы не нашли такого приглашения."}{" "}
            Если вы считаете, что это ошибка, обратитесь к тому, кто вас пригласил.
          </p>
          <Link href="/" className={s.back}>
            На главную
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className={s.page}>
      <div className={s.narrow}>
        <p className={s.mark}>Certa</p>
        <Onboarding name={check.invite.inviteeName} code={normalizeCode(decodeURIComponent(code))!} />
      </div>
    </main>
  );
}
