import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import { currentMember } from "@/server/auth";
import { store } from "@/server/store";
import { ClubHeader } from "../../../club-header";
import { ListingForm } from "../../../new/listing-form";
import s from "../../../../invite/invite.module.css";
import c from "../../../club.module.css";

// Правка своего лота: после сохранения он снова уходит на проверку совета.
export default function EditPage({ params }: PageProps<"/club/item/[id]/edit">) {
  return (
    <main className={s.page}>
      <div className={c.wide}>
        <Suspense fallback={null}>
          <Content params={params} />
        </Suspense>
      </div>
    </main>
  );
}

async function Content({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  const me = await currentMember();
  if (!me) redirect("/login");
  const l = await store.getListing((await params).id);
  if (!l || l.authorId !== me.id || l.status === "withdrawn" || me.status !== "active") notFound();

  return (
    <>
      <ClubHeader me={me} />
      <div className={s.narrow} style={{ margin: 0 }}>
        <h1 className={s.title}>Исправить лот</h1>
        {l.rejectReason && <p className={s.formError}>Совет вернул лот: {l.rejectReason}</p>}
        <p className={s.lead}>
          {me.role === "council" ? "Изменения сразу появятся на витрине." : "После сохранения лот снова уйдёт на проверку экспертного совета. Обычно решение в течение суток."}
        </p>
        <ListingForm kind={l.kind} initial={l} />
      </div>
    </>
  );
}
