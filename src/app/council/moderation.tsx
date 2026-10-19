import Link from "next/link";
import { CATEGORIES, formatAmount, REJECT_REASONS, type Listing } from "@/core/listing";
import { fileUrl } from "@/core/upload";
import { approveListingAction, rejectListingAction } from "./actions";
import s from "../invite/invite.module.css";
import c from "./council.module.css";

const fmt = (iso: string) => new Date(iso).toLocaleString("ru-RU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Moscow" });

// Лоты на проверке: совет публикует или возвращает на доработку с причиной.
export function ModerationQueue({ lots }: { lots: Listing[] }) {
  return (
    <section className={c.section}>
      <h2 className={c.h2}>
        Лоты на проверке <span className={c.count}>{lots.length}</span>
      </h2>
      {lots.length === 0 && <p className={s.hint}>Новых лотов на проверке нет. Ориентир: решение в течение суток.</p>}
      {lots.map((l) => (
        <article key={l.id} className={c.card}>
          <div className={c.lot}>
            {l.photos?.[0] ? (
              // eslint-disable-next-line @next/next/no-img-element -- приватные файлы через /api/file
              <img src={l.photos[0]} alt="" className={c.lotCover} />
            ) : (
              <div className={c.lotCover} />
            )}
            <div>
              <p className={s.hint}>
                {l.kind === "offer" ? "Предложение" : "Запрос «Ищу»"} · {CATEGORIES[l.category]} · {l.authorPseudonym} · {fmt(l.createdAt)}
              </p>
              <p className={c.name}>
                <Link href={`/club/item/${l.id}`}>{l.title}</Link>
              </p>
              <p className={s.hint}>
                {l.kind === "offer" ? (l.onRequest ? "Цена по запросу" : formatAmount(l.amount, l.currency)) : l.amount ? `Бюджет до ${formatAmount(l.amount, l.currency)}` : "Бюджет не указан"} ·{" "}
                {l.country}, {l.city}
                {l.quiet ? " · тихий лот" : ""} · фото: {l.photos?.length ?? 0} · документы: {l.docs?.length ?? 0}
              </p>
              {l.docs?.map((d) => (
                <p key={d.key} className={s.hint}>
                  <a href={fileUrl(d.key)} style={{ textDecoration: "underline" }}>
                    {d.name}
                  </a>
                </p>
              ))}
            </div>
          </div>
          <div className={c.lotActions}>
            <form action={approveListingAction}>
              <input type="hidden" name="id" value={l.id} />
              <input type="hidden" name="rev" value={l.rev ?? 0} />
              <button type="submit" className={s.submit}>
                Опубликовать
              </button>
            </form>
            <form action={rejectListingAction} className={c.rejectForm}>
              <input type="hidden" name="id" value={l.id} />
              <input type="hidden" name="rev" value={l.rev ?? 0} />
              <select name="reason" className={s.select} defaultValue="" required>
                <option value="" disabled>
                  Причина отказа
                </option>
                {Object.entries(REJECT_REASONS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
              <input name="note" className={s.input} placeholder="Уточнение для автора (для «Другое» обязательно)" maxLength={500} />
              <button type="submit" className={c.danger}>
                Вернуть на доработку
              </button>
            </form>
          </div>
        </article>
      ))}
    </section>
  );
}
