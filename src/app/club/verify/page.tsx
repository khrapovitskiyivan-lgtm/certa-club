import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { safeNext } from "@/core/next-path";
import { AGENT_TYPES } from "@/core/verification";
import { currentMember } from "@/server/auth";
import { store } from "@/server/store";
import { ClubHeader } from "../club-header";
import { VerifyForm } from "../../verify/verify-form";
import s from "../../invite/invite.module.css";
import c from "../club.module.css";

// Кабинет верификации внутри клуба: сюда ведут «Предложить», «Ищу» и отклик на лот, пока участник не подтверждён.
export default function ClubVerifyPage({ searchParams }: PageProps<"/club/verify">) {
  return (
    <main className={s.page}>
      <div className={c.wide}>
        <Suspense fallback={null}>
          <Content searchParams={searchParams} />
        </Suspense>
      </div>
    </main>
  );
}

const fmt = (iso: string) => new Date(iso).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" });

async function Content({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await connection();
  const me = await currentMember();
  if (!me) redirect("/login");
  const next = safeNext((await searchParams).next);

  // Что человек хотел сделать: отклик на лот или размещение.
  let goal = "размещать лоты и откликаться на них";
  const itemId = next.match(/^\/club\/item\/([\w-]+)$/)?.[1];
  if (itemId) {
    const l = await store.getListing(itemId);
    if (l) goal = `откликнуться на «${l.title}»`;
  } else if (next.startsWith("/club/new")) {
    goal = next.includes("kind=request") ? "разместить запрос «Ищу»" : "предложить лот";
  }

  const v = me.verification;
  return (
    <>
      <ClubHeader me={me} />
      <div className={s.narrow} style={{ margin: 0 }}>
        <p className={c.cardCat}>Кабинет верификации</p>
        {me.status === "active" && (
          <>
            <h1 className={s.title}>Участие подтверждено</h1>
            <p className={s.lead}>Вы можете размещать лоты и откликаться на них.</p>
            <Link href={next} className={s.submit} style={{ display: "inline-block", textAlign: "center" }}>
              Продолжить
            </Link>
          </>
        )}
        {me.status === "kyc_submitted" && (
          <>
            <h1 className={s.title}>Верификация на рассмотрении</h1>
            <p className={s.lead}>
              Экспертный совет рассматривает заявку. Когда участие будет подтверждено, вы сможете {goal}. Витрина
              открыта и сейчас.
            </p>
            {v && (
              <dl className={c.dl}>
                <dt>Способ</dt>
                <dd>{v.method === "self" ? "Лично, через провайдера" : `Через агента: ${AGENT_TYPES[v.agentType as keyof typeof AGENT_TYPES] ?? v.agentType}, ${v.agentName}`}</dd>
                <dt>Отправлено</dt>
                <dd>{fmt(v.submittedAt)}</dd>
              </dl>
            )}
            <Link href={next} className={s.backBtn}>
              Вернуться
            </Link>
          </>
        )}
        {me.status === "awaiting_kyc" && (
          <>
            <h1 className={s.title}>Верификация</h1>
            <p className={s.lead}>
              Чтобы {goal}, подтвердите участие. Клуб работает по стандартам частного банковского обслуживания:
              подтверждаются личность и финансовая состоятельность, состав активов раскрывать не нужно. Это делается
              один раз.
            </p>
            <VerifyForm next={next} />
          </>
        )}
      </div>
    </>
  );
}
