import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { DEAL_STAGES, PARTY_STAGES, dealRole, dealSteps, stageOf } from "@/core/deal";
import { currentMember } from "@/server/auth";
import { store } from "@/server/store";
import { AppHeader } from "../../app-header";
import s from "../../invite/invite.module.css";
import c from "../club.module.css";

export default function DealsPage() {
  return (
    <main className={s.page}>
      <div className={c.wide}>
        <Suspense fallback={null}>
          <Content />
        </Suspense>
      </div>
    </main>
  );
}

const fmt = (iso?: string) =>
  iso ? new Date(iso).toLocaleDateString("ru-RU", { day: "numeric", month: "long", timeZone: "Europe/Moscow" }) : "";

// Сделки участника: его отклики и отклики на его вещи и запросы. Имён другой стороны и заметок куратора здесь нет.
async function Content() {
  await connection();
  const me = await currentMember();
  if (!me) redirect("/login");
  const deals = (await store.listInquiries())
    .map((i) => ({ i, role: dealRole(i, me.id), stage: stageOf(i) }))
    .filter((d) => d.role !== null);

  return (
    <>
      <AppHeader me={me} area="club" />
      <h1 className={s.title}>Мои сделки</h1>
      <p className={s.lead}>Здесь видно, на каком этапе каждая сделка и что будет дальше. Этап отмечает куратор клуба.</p>
      {deals.length === 0 && (
        <p className={c.empty}>
          Сделок пока нет. Они появятся, когда вы откликнетесь на лот или кто-то откликнется на вашу вещь или запрос.
        </p>
      )}
      {deals.map(({ i, role, stage }) => (
        <article key={i.id} className={c.deal}>
          <p className={c.cardCat}>
            {role === "buyer" ? "Вы покупаете" : "Вы продаёте"} · с {fmt(i.createdAt)}
          </p>
          <h2 className={c.itemTitle}>
            <Link href={`/club/item/${i.listingId}`}>{i.listingTitle}</Link>
          </h2>
          <p className={c.dealNow}>{PARTY_STAGES[stage].title}</p>
          <p className={c.itemText}>{PARTY_STAGES[stage].next}</p>
          {stage !== "cancelled" && (
            <ol className={c.steps} aria-label="Этапы сделки">
              {dealSteps(stage).map((st) => (
                <li key={st.stage} className={c[`step_${st.state}`]} aria-current={st.state === "current" ? "step" : undefined}>
                  {st.stage === "new" ? "Отклик" : DEAL_STAGES[st.stage]}
                </li>
              ))}
            </ol>
          )}
        </article>
      ))}
    </>
  );
}
