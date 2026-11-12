import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { EXPERT_FIELDS, displayName } from "@/core/expert";
import { currentCouncil } from "@/server/auth";
import { store } from "@/server/store";
import { AppHeader } from "../../app-header";
import { deleteExpertAction } from "./actions";
import { ExpertForm } from "./expert-form";
import s from "../../invite/invite.module.css";
import c from "../council.module.css";
import { BackLink } from "@/app/back-link";

export default function CouncilExpertsPage() {
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

// Совет ведёт профили экспертов: добавляет, правит, публикует и скрывает.
async function Content() {
  await connection();
  const me = await currentCouncil();
  if (!me) redirect("/login");
  const experts = await store.listExperts();
  return (
    <>
      <AppHeader me={me} area="council" />
      <BackLink href="/council" label="Кабинет совета" />
      <p className={s.hint}>
        <Link href="/club/experts">Как видят участники</Link>
      </p>
      <section className={c.section}>
        <h2 className={c.h2}>
          Эксперты <span className={c.count}>{experts.length}</span>
        </h2>
        <p className={s.hint}>
          Участники видят профиль только с письменного согласия эксперта и отметкой «Показывать». Контактов в профиле нет: связь через куратора.
        </p>
        {experts.map((x) => (
          <details key={x.id} className={c.card}>
            <summary className={c.name}>
              {x.fullName}{" "}
              <span className={s.hint}>
                · {EXPERT_FIELDS[x.field]} · {x.published ? `виден как «${displayName(x)}»` : "скрыт"}
              </span>
            </summary>
            <ExpertForm key={x.updatedAt} expert={x} />
            <form action={deleteExpertAction} style={{ marginTop: 16 }}>
              <input type="hidden" name="id" value={x.id} />
              <button type="submit" className={c.danger}>
                Удалить профиль
              </button>
            </form>
          </details>
        ))}
      </section>
      <section className={c.section}>
        <h2 className={c.h2}>Добавить эксперта</h2>
        <ExpertForm key={experts.length} />
      </section>
    </>
  );
}
