// Хранилище на Postgres. Участники и приглашения лежат в jsonb: модель ещё меняется,
// а уникальность почты и атомарность операций обеспечивают колонки и условия в SQL.
import postgres from "postgres";
import type { Invite } from "../core/invites";
import type { LoginLink } from "../core/entry";
import type { Member, Store } from "./store-types";

let client: postgres.Sql | null = null;
let ready: Promise<void> | null = null;

function sql(): postgres.Sql {
  // Ленивое подключение: модуль импортируется и там, где база не настроена.
  client ??= postgres(process.env.DATABASE_URL!, { max: 5, onnotice: () => {}, ssl: process.env.DATABASE_URL!.includes("localhost") ? false : "require" });
  return client;
}

// Схема создаётся при первом обращении; полноценные миграции понадобятся с ростом модели.
function schema(): Promise<void> {
  ready ??= (async () => {
    const db = sql();
    await db`create table if not exists invites (code_hash text primary key, data jsonb not null)`;
    await db`create table if not exists members (id text primary key, email text unique not null, data jsonb not null)`;
    await db`create table if not exists login_links (
      token_hash text primary key, member_id text not null,
      expires_at timestamptz not null, used_at timestamptz)`;
  })();
  return ready;
}

type Json = Parameters<postgres.Sql["json"]>[0];
const j = (v: unknown) => sql().json(v as Json);

export const pgStore: Store = {
  async listInvites() {
    await schema();
    const rows = await sql()`select data from invites order by data->>'createdAt'`;
    return rows.map((r) => r.data as Invite);
  },

  async addInvite(invite) {
    await schema();
    await sql()`insert into invites (code_hash, data) values (${invite.codeHash}, ${j(invite)})`;
  },

  async addLoginLink(link: LoginLink) {
    await schema();
    await sql()`delete from login_links where expires_at < now()`;
    await sql()`insert into login_links (token_hash, member_id, expires_at)
      values (${link.tokenHash}, ${link.memberId}, ${link.expiresAt})`;
  },

  async consumeLoginLink(tokenHash, now) {
    await schema();
    const rows = await sql()`update login_links set used_at = ${now.toISOString()}
      where token_hash = ${tokenHash} and used_at is null and expires_at > ${now.toISOString()}
      returning token_hash, member_id, expires_at, used_at`;
    const r = rows[0];
    if (!r) return undefined;
    return {
      tokenHash: r.token_hash,
      memberId: r.member_id,
      expiresAt: new Date(r.expires_at).toISOString(),
      usedAt: new Date(r.used_at).toISOString(),
    };
  },

  async getMember(id) {
    await schema();
    const rows = await sql()`select data from members where id = ${id}`;
    return rows[0]?.data as Member | undefined;
  },

  async findByEmail(email) {
    await schema();
    const rows = await sql()`select data from members where email = ${email.trim().toLowerCase()}`;
    return rows[0]?.data as Member | undefined;
  },

  async listMembers() {
    await schema();
    const rows = await sql()`select data from members order by data->>'createdAt'`;
    return rows.map((r) => r.data as Member);
  },

  async consumeTotpStep(id, step) {
    await schema();
    const rows = await sql()`update members set data = data || jsonb_build_object('totpLastStep', ${step}::int)
      where id = ${id} and coalesce((data->>'totpLastStep')::int, -1) < ${step}
      returning id`;
    return rows.length > 0;
  },

  async updateMember(id, patch) {
    await schema();
    const rows = await sql()`update members set data = data || ${j(patch)} where id = ${id} returning id`;
    return rows.length > 0;
  },

  async submitVerification(id, v) {
    await schema();
    const rows = await sql()`update members set data = data || ${j({ verification: v, status: "kyc_submitted" })}
      where id = ${id} and data->>'status' <> 'active' returning id`;
    return rows.length > 0;
  },

  async redeem(codeHash, member, now) {
    await schema();
    return sql().begin(async (tx) => {
      // Блокируем строку приглашения: две одновременные регистрации по одному коду невозможны.
      const inv = await tx`select data from invites where code_hash = ${codeHash} for update`;
      const data = inv[0]?.data as Invite | undefined;
      if (!data || data.usedAt || new Date(data.expiresAt) <= now) return "unavailable" as const;
      const taken = await tx`select 1 from members where email = ${member.email}`;
      if (taken.length) return "email_taken" as const;
      await tx`update invites set data = data || ${tx.json({ usedAt: now.toISOString() })} where code_hash = ${codeHash}`;
      await tx`insert into members (id, email, data) values (${member.id}, ${member.email}, ${tx.json(member as unknown as Json)})`;
      return "ok" as const;
    });
  },
};
