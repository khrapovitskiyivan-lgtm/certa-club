import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import { CATEGORIES, formatAmount, visibleTo } from "@/core/listing";
import { currentMember } from "@/server/auth";
import { store } from "@/server/store";
import { withdrawListing } from "../../actions";
import { ClubHeader } from "../../club-header";
import { InquiryForm } from "./inquiry-form";
import s from "../../../invite/invite.module.css";
import c from "../../club.module.css";

export default function ItemPage({ params }: PageProps<"/club/item/[id]">) {
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

const fmt = (iso: string) => new Date(iso).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" });

async function Content({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  const me = await currentMember();
  if (!me) redirect("/login");
  if (me.status !== "active") redirect("/verify");
  const { id } = await params;
  const l = await store.getListing(id);
  const isCouncil = me.role === "council";
  if (!l || !visibleTo(l, me.id, isCouncil)) notFound();
  const mine = l.authorId === me.id;
  const isOffer = l.kind === "offer";

  return (
    <>
      <ClubHeader me={me} />
      <article className={c.item}>
        <span className={c.cardCat}>
          {isOffer ? "Предложение" : "Ищут в клубе"} · {CATEGORIES[l.category]}
        </span>
        <h1 className={c.itemTitle}>{l.title}</h1>
        {l.photos?.map((src) => (
          // eslint-disable-next-line @next/next/no-img-element -- статичные SVG, оптимизация не нужна
          <img key={src} src={src} alt={l.title} className={c.photoLarge} />
        ))}
        {l.demo && <span className={c.badge}>Тестовый лот</span>}
        {l.quiet && <span className={c.badge}>Тихий лот: виден только вам и совету</span>}
        {l.status !== "active" && <span className={c.badge}>Снято</span>}
        {l.description && <p className={c.itemText}>{l.description}</p>}

        <dl className={c.dl}>
          <dt>{isOffer ? "Цена" : "Бюджет"}</dt>
          <dd>
            {isOffer
              ? l.onRequest
                ? "По запросу"
                : formatAmount(l.amount, l.currency)
              : l.amount
                ? `до ${formatAmount(l.amount, l.currency)}`
                : "Не указан"}
          </dd>
          <dt>{isOffer ? "Где находится" : "Где удобно получить"}</dt>
          <dd>
            {l.country}, {l.city}
          </dd>
          <dt>{isOffer ? "Продавец" : "Ищет"}</dt>
          <dd>{l.authorPseudonym}</dd>
          <dt>Размещено</dt>
          <dd>{fmt(l.createdAt)}</dd>
        </dl>

        {l.status === "active" && !mine && <InquiryForm id={l.id} kind={l.kind} />}

        {l.status === "active" && (mine || isCouncil) && (
          <form action={withdrawListing}>
            <input type="hidden" name="id" value={l.id} />
            <button type="submit" className={s.backBtn}>
              {mine ? "Снять с витрины" : "Снять (совет)"}
            </button>
          </form>
        )}
      </article>
    </>
  );
}
