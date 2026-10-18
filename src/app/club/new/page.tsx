import { Suspense } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { currentMember } from "@/server/auth";
import { ClubHeader } from "../club-header";
import { ListingForm } from "./listing-form";
import s from "../../invite/invite.module.css";
import c from "../club.module.css";

export default function NewListingPage({ searchParams }: PageProps<"/club/new">) {
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

async function Content({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await connection();
  const me = await currentMember();
  if (!me) redirect("/login");
  if (me.status !== "active") redirect("/verify");
  const kind = (await searchParams).kind === "request" ? "request" : "offer";

  return (
    <>
      <ClubHeader me={me} />
      <div className={s.narrow} style={{ margin: 0 }}>
        <h1 className={s.title}>{kind === "offer" ? "Предложить" : "Ищу"}</h1>
        <p className={s.lead}>
          {kind === "offer"
            ? "Участники увидят вещь под вашим псевдонимом. Имя раскрывается только с вашего согласия, на этапе сделки."
            : "Запрос увидят участники клуба под вашим псевдонимом. У кого есть такая вещь, откликнется через куратора."}
        </p>
        <ListingForm kind={kind} />
      </div>
    </>
  );
}
