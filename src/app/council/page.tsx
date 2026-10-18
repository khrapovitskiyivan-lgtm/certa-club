import { Suspense } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import type { Invite } from "@/core/invites";
import { AGENT_TYPES } from "@/core/verification";
import { currentCouncil } from "@/server/auth";
import { store, type Member } from "@/server/store";
import { logout } from "../auth-actions";
import { approveMember } from "./actions";
import { InviteForm } from "./invite-form";
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

function verificationText(m: Member): string {
  const v = m.verification;
  if (!v) return "не отправлена";
  if (v.method === "self") return "лично, через провайдера";
  return `через агента: ${AGENT_TYPES[v.agentType as keyof typeof AGENT_TYPES] ?? v.agentType}, ${v.agentName}, ${v.agentContact}`;
}

// Страница динамическая (connection), поэтому текущее время читается на каждый запрос.
function inviteStatus(i: Invite): string {
  if (i.usedAt) return "использовано";
  return new Date(i.expiresAt).getTime() < Date.now() ? "истекло" : "ждёт";
}

async function CouncilContent() {
  await connection();
  const me = await currentCouncil();
  if (!me) redirect("/login");

  const [members, invites] = await Promise.all([store.listMembers(), store.listInvites()]);
  const pending = members.filter((m) => m.status === "kyc_submitted");
  const waitingKyc = members.filter((m) => m.status === "awaiting_kyc");
  const active = members.filter((m) => m.status === "active");

  return (
    <>
      <header className={c.head}>
        <p className={s.mark}>Certa</p>
        <div className={c.who}>
          <span>Экспертный совет · {me.pseudonym}</span>
          <form action={logout}>
            <button type="submit" className={s.backBtn}>
              Выйти
            </button>
          </form>
        </div>
      </header>

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
                <td>{m.role === "council" ? "совет" : "участник"}</td>
                <td>с {fmt(m.activatedAt ?? m.createdAt)}</td>
              </tr>
            ))}
            {waitingKyc.map((m) => (
              <tr key={m.id} className={c.muted}>
                <td>{m.pseudonym}</td>
                <td>{m.fullName}</td>
                <td>ждём верификацию</td>
                <td>{fmt(m.createdAt)}</td>
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
              <tr key={i.codeHash} className={i.usedAt ? c.muted : undefined}>
                <td>{i.inviteeName}</td>
                <td>{inviteStatus(i)}</td>
                <td>{i.usedAt ? fmt(i.usedAt) : `до ${fmt(i.expiresAt)}`}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}
