import { Suspense } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import type { Invite } from "@/core/invites";
import { AGENT_TYPES } from "@/core/verification";
import { currentCouncil } from "@/server/auth";
import { store, type Member } from "@/server/store";
import Link from "next/link";
import {
  approveMember,
  createDemoListingsAction,
  deleteUnfinishedAction,
  markInquiryAction,
  revokeInviteAction,
  withdrawDemoListingsAction,
} from "./actions";
import { InviteForm } from "./invite-form";
import { RoleSelect } from "./role-select";
import { AppHeader } from "../app-header";
import { PasskeyOffer } from "../passkey/offer";
import { SetPassword } from "../passkey/set-password";
import s from "../invite/invite.module.css";
import c from "./council.module.css";

export default function CouncilPage() {
  return (
    <main className={s.page}>
      <div className={c.wide}>
        <Suspense fallback={null}>
          <CouncilContent />
        </Suspense>
      </div>
    </main>
  );
}

const fmt = (iso?: string) =>
  iso ? new Date(iso).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" }) : "";
// Дата и время по Москве: для журнала и регистраций важна точная минута.
const fmtTime = (iso?: string) =>
  iso
    ? new Date(iso).toLocaleString("ru-RU", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Europe/Moscow",
      })
    : "";

function verificationText(m: Member): string {
  const v = m.verification;
  if (!v) return "не отправлена";
  if (v.method === "self") return "лично, через провайдера";
  return `через агента: ${AGENT_TYPES[v.agentType as keyof typeof AGENT_TYPES] ?? v.agentType}, ${v.agentName}, ${v.agentContact}`;
}

// Страница динамическая (connection), поэтому текущее время читается на каждый запрос.
function inviteStatus(i: Invite): string {
  if (i.usedAt) return "использовано";
  if (i.revokedAt) return "отозвано";
  return new Date(i.expiresAt).getTime() < Date.now() ? "истекло" : "ждёт";
}

async function CouncilContent() {
  await connection();
  const me = await currentCouncil();
  if (!me) redirect("/login");

  const [members, invites, events, keys] = await Promise.all([
    store.listMembers(),
    store.listInvites(),
    store.listEvents(200),
    store.listCredentials(me.id),
  ]);
  const inquiries = await store.listInquiries();
  const demoActive = (await store.listListings()).filter((l) => l.demo && l.status === "active").length;
  const openInquiries = inquiries.filter((i) => i.status === "new");
  const pending = members.filter((m) => m.status === "kyc_submitted");
  const waitingKyc = members.filter((m) => m.status === "awaiting_kyc");
  const active = members.filter((m) => m.status === "active");

  return (
    <>
      <AppHeader me={me} area="council" />
      {!me.passwordHash && <SetPassword email={me.email} />}
      {keys.length === 0 && <PasskeyOffer />}

      <section className={c.section}>
        <h2 className={c.h2}>
          На рассмотрении <span className={c.count}>{pending.length}</span>
        </h2>
        {pending.length === 0 && <p className={s.hint}>Новых заявок на верификацию нет.</p>}
        {pending.map((m) => (
          <article key={m.id} className={c.card}>
            <div className={c.cardHead}>
              <div>
                <p className={c.name}>{m.fullName}</p>
                <p className={s.hint}>
                  Псевдоним {m.pseudonym} · приглашение на имя {m.invitedAs} · {fmt(m.createdAt)}
                </p>
              </div>
              <form action={approveMember}>
                <input type="hidden" name="id" value={m.id} />
                <button type="submit" className={s.submit}>
                  Подтвердить участие
                </button>
              </form>
            </div>
            <dl className={c.dl}>
              <dt>Почта</dt>
              <dd>{m.email}</dd>
              <dt>Телефон</dt>
              <dd>{m.phone}</dd>
              <dt>Город</dt>
              <dd>{m.city}</dd>
              <dt>Род занятий</dt>
              <dd>{m.occupation}</dd>
              {m.about && (
                <>
                  <dt>О себе</dt>
                  <dd>{m.about}</dd>
                </>
              )}
              <dt>Верификация</dt>
              <dd>{verificationText(m)}</dd>
            </dl>
          </article>
        ))}
      </section>

      <section className={c.section}>
        <h2 className={c.h2}>
          Отклики <span className={c.count}>{openInquiries.length}</span>
        </h2>
        {openInquiries.length === 0 && <p className={s.hint}>Новых откликов на лоты и запросы нет.</p>}
        <table className={c.table}>
          <tbody>
            {openInquiries.map((i) => (
              <tr key={i.id}>
                <td className={c.muted}>{fmtTime(i.createdAt)}</td>
                <td>
                  <Link href={`/club/item/${i.listingId}`}>«{i.listingTitle}»</Link>
                  <br />
                  {i.listingKind === "offer" ? "запрос по лоту" : "«есть у меня»"}: {i.fromPseudonym} → {i.authorPseudonym}
                  {i.message && (
                    <>
                      <br />
                      <span className={c.muted}>{i.message}</span>
                    </>
                  )}
                </td>
                <td>
                  <form action={markInquiryAction}>
                    <input type="hidden" name="id" value={i.id} />
                    <button type="submit" className={c.danger} style={{ color: "var(--accent)" }}>
                      Стороны связаны
                    </button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className={c.section}>
        <h2 className={c.h2}>Пригласить</h2>
        <InviteForm />
      </section>

      <section className={c.section}>
        <h2 className={c.h2}>
          Участники <span className={c.count}>{active.length}</span>
        </h2>
        <table className={c.table}>
          <tbody>
            {active.map((m) => (
              <tr key={m.id}>
                <td>{m.pseudonym}</td>
                <td>{m.fullName}</td>
                <td>
                  <RoleSelect
                    id={m.id}
                    role={m.role ?? "member"}
                    locked={m.role === "council" && active.filter((x) => x.role === "council").length <= 1}
                  />
                </td>
                <td>с {fmt(m.activatedAt ?? m.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className={c.section}>
        <h2 className={c.h2}>
          Без верификации <span className={c.count}>{waitingKyc.length}</span>
        </h2>
        <p className={s.hint}>Зарегистрировались и смотрят витрину, но ещё не отправили верификацию. После неё они появятся в «На рассмотрении».</p>
        <table className={c.table}>
          <tbody>
            {waitingKyc.map((m) => (
              <tr key={m.id} className={c.muted}>
                <td>{m.pseudonym}</td>
                <td>{m.fullName}</td>
                <td>
                  по приглашению «{m.invitedAs}» · {fmtTime(m.createdAt)}
                </td>
                <td>
                  <form action={deleteUnfinishedAction}>
                    <input type="hidden" name="id" value={m.id} />
                    <button type="submit" className={c.danger}>
                      Удалить регистрацию
                    </button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className={c.section}>
        <h2 className={c.h2}>Приглашения</h2>
        <table className={c.table}>
          <tbody>
            {[...invites].reverse().map((i) => (
              <tr key={i.codeHash} className={i.usedAt || i.revokedAt ? c.muted : undefined}>
                <td>{i.inviteeName}</td>
                <td>{inviteStatus(i)}</td>
                <td>
                  {i.usedAt
                    ? fmtTime(i.usedAt)
                    : i.revokedAt
                      ? fmtTime(i.revokedAt)
                      : `создано ${fmtTime(i.createdAt)}, до ${fmt(i.expiresAt)}`}
                </td>
                <td>
                  {inviteStatus(i) === "ждёт" && (
                    <form action={revokeInviteAction}>
                      <input type="hidden" name="codeHash" value={i.codeHash} />
                      <button type="submit" className={c.danger}>
                        Отозвать
                      </button>
                    </form>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className={c.section}>
        <h2 className={c.h2}>
          Тестовые лоты <span className={c.count}>{demoActive}</span>
        </h2>
        <p className={s.hint}>Шесть демонстрационных объявлений с отметкой «Тестовый», чтобы посмотреть витрину.</p>
        <div style={{ display: "flex", gap: 28, marginTop: 14 }}>
          <form action={createDemoListingsAction}>
            <button type="submit" className={c.danger} style={{ color: "var(--accent)" }}>
              Создать тестовые лоты
            </button>
          </form>
          {demoActive > 0 && (
            <form action={withdrawDemoListingsAction}>
              <button type="submit" className={c.danger}>
                Снять тестовые
              </button>
            </form>
          )}
        </div>
      </section>

      <section className={c.section}>
        <h2 className={c.h2}>Журнал</h2>
        {events.length === 0 && <p className={s.hint}>Событий пока нет.</p>}
        <table className={c.table}>
          <tbody>
            {events.map((e) => (
              <tr key={e.id}>
                <td className={c.muted}>{fmtTime(e.at)}</td>
                <td>{e.text}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}
