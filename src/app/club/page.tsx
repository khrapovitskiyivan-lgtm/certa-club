import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { CATEGORIES, formatAmount, visibleTo, type Category, type Listing } from "@/core/listing";
import { currentMember } from "@/server/auth";
import { store } from "@/server/store";
import { PasskeyOffer } from "../passkey/offer";
import { SetPassword } from "../passkey/set-password";
import { ClubHeader } from "./club-header";
import s from "../invite/invite.module.css";
import { VerifyNotice } from "./verify-notice";
import c from "./club.module.css";

export default function ClubPage({ searchParams }: PageProps<"/club">) {
  return (
    <main className={s.page}>
      <div className={c.wide}>
        <Suspense fallback={null}>
          <ClubContent searchParams={searchParams} />
        </Suspense>
      </div>
    </main>
  );
}

type Params = Promise<Record<string, string | string[] | undefined>>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

function price(l: Listing): string {
  if (l.kind === "offer") return l.onRequest ? "Цена по запросу" : formatAmount(l.amount, l.currency);
  return l.amount ? `Бюджет до ${formatAmount(l.amount, l.currency)}` : "Бюджет не указан";
}

async function ClubContent({ searchParams }: { searchParams: Params }) {
  await connection();
  const m = await currentMember();
  if (!m) redirect("/login");
  const hasKey = (await store.listCredentials(m.id)).length > 0;
  const banners = (
    <>
      {!m.passwordHash && <SetPassword email={m.email} />}
      {!hasKey && <PasskeyOffer />}
      {m.status !== "active" && <VerifyNotice me={m} action="размещать и откликаться" next="/club" />}
    </>
  );

  const sp = await searchParams;
  const tab = one(sp.tab) === "requests" ? "request" : "offer";
  const category = one(sp.category) as Category | "";
  const country = one(sp.country).trim().toLowerCase();
  const isCouncil = m.role === "council";

  const all = (await store.listListings()).filter((l) => l.kind === tab && l.status === "active" && visibleTo(l, m.id, isCouncil));
  const items = all.filter(
    (l) => (!category || l.category === category) && (!country || l.country.toLowerCase().includes(country)),
  );

  return (
    <>
      <ClubHeader me={m} />
      {banners}

      <div className={c.tabs}>
        <Link href="/club" className={tab === "offer" ? c.tabActive : c.tab}>
          Предложения клуба
        </Link>
        <Link href="/club?tab=requests" className={tab === "request" ? c.tabActive : c.tab}>
          Ищут в клубе
        </Link>
      </div>

      <form className={c.filters} method="get">
        {tab === "request" && <input type="hidden" name="tab" value="requests" />}
        <select name="category" defaultValue={category} aria-label="Категория">
          <option value="">Все категории</option>
          {Object.entries(CATEGORIES).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <input name="country" defaultValue={one(sp.country)} placeholder="Страна" aria-label="Страна" />
        <button type="submit" className={c.navBtn}>
          Показать
        </button>
      </form>

      {items.length === 0 ? (
        <p className={c.empty}>
          {all.length === 0
            ? tab === "offer"
              ? "Предложений пока нет. Станьте первым: «Предложить»."
              : "Запросов пока нет. Ищете что-то? «Ищу»."
            : "По этим условиям ничего не нашлось."}
        </p>
      ) : (
        <div className={c.grid}>
          {items.map((l) => (
            <Link key={l.id} href={`/club/item/${l.id}`} className={c.card}>
              {l.photos?.[0] && (
                // eslint-disable-next-line @next/next/no-img-element -- статичные SVG, оптимизация не нужна
                <img src={l.photos[0]} alt="" className={c.photo} />
              )}
              <span className={c.cardCat}>{CATEGORIES[l.category]}</span>
              <span className={c.cardTitle}>{l.title}</span>
              <span className={c.price}>{price(l)}</span>
              <span className={c.cardMeta}>
                {l.country}, {l.city} · {l.authorPseudonym}
              </span>
              {l.quiet && <span className={c.badge}>Тихий лот</span>}
              {l.demo && <span className={c.badge}>Тестовый</span>}
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
