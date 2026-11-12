import { Suspense } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { EXPERT_FIELDS, displayName, yearsText, type ExpertField } from "@/core/expert";
import { currentMember } from "@/server/auth";
import { store } from "@/server/store";
import { AppHeader } from "../../app-header";
import s from "../../invite/invite.module.css";
import c from "../club.module.css";
import { BackLink } from "@/app/back-link";

export default function ExpertsPage() {
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

// Эксперты клуба для участников: только опубликованные с согласия профили, без контактов.
async function Content() {
  await connection();
  const me = await currentMember();
  if (!me) redirect("/login");
  const experts = (await store.listExperts()).filter((e) => e.published && e.consentAt);
  const fields = (Object.keys(EXPERT_FIELDS) as ExpertField[]).filter((f) => experts.some((e) => e.field === f));

  return (
    <>
      <AppHeader me={me} area="club" />
      <BackLink href="/club" label="Витрина" />
      <h1 className={s.title}>Эксперты клуба</h1>
      <p className={s.lead}>
        Перед сделкой вещь осматривает независимый эксперт и даёт письменное заключение о подлинности и состоянии. Эксперт в сделке не
        заинтересован: его оплата не зависит ни от вывода, ни от того, состоится ли сделка.
      </p>
      <p className={s.hint}>
        Связь с экспертом только через куратора. Если для вашей вещи в круге нет эксперта, куратор подберёт профильного специалиста под сделку.
      </p>
      {fields.length === 0 && <p className={c.empty}>Круг экспертов формируется. Профили появятся здесь с согласия экспертов.</p>}
      {fields.map((f) => (
        <section key={f} className={c.expertGroup}>
          <h2 className={c.cardCat}>{EXPERT_FIELDS[f]}</h2>
          {experts
            .filter((e) => e.field === f)
            .map((e) => (
              <article key={e.id} className={c.expert}>
                <p className={c.itemTitle}>{displayName(e)}</p>
                {e.specialization && <p className={c.dealNow}>{e.specialization}</p>}
                <p className={c.itemText}>{e.credentials}</p>
                <p className={c.cardMeta}>
                  {[e.experienceYears !== undefined ? `Стаж ${yearsText(e.experienceYears)}` : "", e.city].filter(Boolean).join(" · ")}
                </p>
              </article>
            ))}
        </section>
      ))}
    </>
  );
}
