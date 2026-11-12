import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { lotStatus } from "@/core/deal";
import { CATEGORIES, formatAmount, type Listing } from "@/core/listing";
import { currentMember } from "@/server/auth";
import { store } from "@/server/store";
import { AppHeader } from "../../app-header";
import { BackLink } from "../../back-link";
import s from "../../invite/invite.module.css";
import c from "../club.module.css";

export default function LotsPage() {
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

function price(l: Listing): string {
  if (l.kind === "offer") return l.onRequest ? "Цена по запросу" : formatAmount(l.amount, l.currency);
  return l.amount ? `Бюджет до ${formatAmount(l.amount, l.currency)}` : "Бюджет не указан";
}

// Все лоты и запросы автора с их статусом и откликами. Снятые внизу отдельным списком.
async function Content() {
  await connection();
  const me = await currentMember();
  if (!me) redirect("/login");
  const [listings, inquiries] = await Promise.all([store.listListings(), store.listInquiries()]);
  // Свежие первыми: порядок хранилищ (файл и Postgres) не одинаков, поэтому сортируем явно.
  const mine = listings.filter((l) => l.authorId === me.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const live = mine.filter((l) => l.status !== "withdrawn");
  const gone = mine.filter((l) => l.status === "withdrawn");

  const row = (l: Listing) => {
    const st = lotStatus(l, inquiries.filter((i) => i.listingId === l.id));
    return (
      <article key={l.id} className={c.deal}>
        <p className={c.cardCat}>
          {l.kind === "offer" ? "Предложение" : "Ищу"} · {CATEGORIES[l.category]} · <span style={{ whiteSpace: "nowrap" }}>{price(l)}</span>
        </p>
        <h2 className={c.itemTitle}>
          <Link href={`/club/item/${l.id}`}>{l.title}</Link>
        </h2>
        <p className={c.dealNow}>{st.label}</p>
        <p className={c.itemText}>{st.hint}</p>
        <p className={c.cardMeta}>{st.deals}</p>
      </article>
    );
  };

  return (
    <>
      <AppHeader me={me} area="club" />
      <BackLink href="/club" label="Витрина" />
      <h1 className={s.title}>Мои лоты</h1>
      <p className={s.lead}>
        Ваши вещи и запросы: где каждый сейчас и сколько на него откликов. Ход сделок смотрите в <Link href="/club/deals">«Моих сделках»</Link>.
      </p>
      {live.length === 0 && (
        <p className={c.empty}>
          Лотов пока нет. <Link href="/club/new?kind=offer">Предложить вещь</Link> или <Link href="/club/new?kind=request">написать, что ищете</Link>.
        </p>
      )}
      {live.map(row)}
      {gone.length > 0 && (
        <section className={c.expertGroup}>
          <h2 className={c.cardCat}>Снятые</h2>
          {gone.map(row)}
        </section>
      )}
    </>
  );
}
