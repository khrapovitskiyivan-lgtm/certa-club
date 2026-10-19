// Хранилище на Postgres. Участники и приглашения лежат в jsonb: модель ещё меняется,
// а уникальность почты и атомарность операций обеспечивают колонки и условия в SQL.
import postgres from "postgres";
import type { Invite } from "../core/invites";
import type { LoginLink } from "../core/entry";
import type { Listing } from "../core/listing";
import type { ClubEvent, Credential, Inquiry, Member, Store } from "./store-types";

let client: postgres.Sql | null = null;
let ready: Promise<void> | null = null;

function sql(): postgres.Sql {
  // Ленивое подключение: модуль импортируется и там, где база не настроена.
  if (!client) {
    const url = process.env.DATABASE_URL!;
    // Удалённая база только с проверкой сертификата и имени хоста; без TLS только локальная.
    const local = ["localhost", "127.0.0.1", "::1", "[::1]"].includes(new URL(url).hostname);
    client = postgres(url, { max: 5, onnotice: () => {}, ssl: local ? false : "verify-full" });
  }
  return client;
}

// Схема создаётся при первом обращении; полноценные миграции понадобятся с ростом модели.
function schema(): Promise<void> {
  ready ??= (async () => {
    const db = sql();
    await db`create table if not exists invites (code_hash text primary key, data jsonb not null)`;
    await db`create table if not exists members (id text primary key, email text unique not null, data jsonb not null)`;
    await db`create table if not exists listings (id text primary key, created_at timestamptz not null, data jsonb not null)`;
    await db`create table if not exists inquiries (id text primary key, created_at timestamptz not null, data jsonb not null)`;
    await db`create table if not exists events (id text primary key, at timestamptz not null, data jsonb not null)`;
    await db`create table if not exists credentials (id text primary key, member_id text not null, data jsonb not null)`;
    await db`create table if not exists login_links (
      token_hash text primary key, member_id text not null,
      expires_at timestamptz not null, used_at timestamptz)`;
  })();
  return ready;
}

type Json = Parameters<postgres.Sql["json"]>[0];
const j = (v: unknown) => sql().json(v as Json);

export const pgStore: Store = {
  async addListing(l) {
    await schema();
    await sql()`insert into listings (id, created_at, data) values (${l.id}, ${l.createdAt}, ${j(l)})`;
  },

  async getListing(id) {
    await schema();
    const rows = await sql()`select data from listings where id = ${id}`;
    return rows[0]?.data as Listing | undefined;
  },

  async listListings() {
    await schema();
    const rows = await sql()`select data from listings order by created_at desc`;
    return rows.map((r) => r.data as Listing);
  },

  async withdrawListing(id, now) {
    await schema();
    const rows = await sql()`update listings set data = data || ${j({ status: "withdrawn", withdrawnAt: now.toISOString() })}
      where id = ${id} and data->>'status' <> 'withdrawn' returning id`;
    return rows.length > 0;
  },

  async updateListingIf(id, from, patch) {
    await schema();
    const rows = await sql()`update listings set data = data || ${j(patch)}
      where id = ${id} and data->>'status' = any(${from as string[]}) returning id`;
    return rows.length > 0;
  },

  async addInquiry(i) {
    await schema();
    await sql()`insert into inquiries (id, created_at, data) values (${i.id}, ${i.createdAt}, ${j(i)})`;
  },

  async listInquiries() {
    await schema();
    const rows = await sql()`select data from inquiries order by created_at desc`;
    return rows.map((r) => r.data as Inquiry);
  },

  async markInquiryHandled(id) {
    await schema();
    await sql()`update inquiries set data = data || ${j({ status: "handled" })} where id = ${id}`;
  },

  async addEvent(e) {
    await schema();
    await sql()`insert into events (id, at, data) values (${e.id}, ${e.at}, ${j(e)})`;
  },

  async listEvents(limit) {
    await schema();
    const rows = await sql()`select data from events order by at desc limit ${limit}`;
    return rows.map((r) => r.data as ClubEvent);
  },

  async revokeInvite(codeHash, now) {
    await schema();
    const rows = await sql()`update invites set data = data || ${j({ revokedAt: now.toISOString() })}
      where code_hash = ${codeHash} and data->>'usedAt' is null and data->>'revokedAt' is null returning code_hash`;
    return rows.length > 0;
  },

  async deleteUnfinishedMember(id) {
    await schema();
    return sql().begin(async (tx) => {
      const rows = await tx`delete from members where id = ${id}
        and data->>'status' <> 'active' and coalesce(data->>'role', '') <> 'council' returning id`;
      if (!rows.length) return false;
      await tx`delete from credentials where member_id = ${id}`;
      return true;
    });
  },

  async addCredential(c) {
    await schema();
    await sql()`insert into credentials (id, member_id, data) values (${c.id}, ${c.memberId}, ${j(c)})`;
  },

  async getCredential(id) {
    await schema();
    const rows = await sql()`select data from credentials where id = ${id}`;
    return rows[0]?.data as Credential | undefined;
  },

  async listCredentials(memberId) {
    await schema();
    const rows = await sql()`select data from credentials where member_id = ${memberId}`;
    return rows.map((r) => r.data as Credential);
  },

  async updateCredentialCounter(id, counter) {
    await schema();
    await sql()`update credentials set data = data || jsonb_build_object('counter', ${counter}::int) where id = ${id}`;
  },

  async listInvites() {
    await schema();
    const rows = await sql()`select data from invites order by data->>'createdAt'`;
    return rows.map((r) => r.data as Invite);
  },

  async isEmpty() {
    await schema();
    const rows = await sql()`select (select count(*) from invites) + (select count(*) from members) as n`;
    return Number(rows[0].n) === 0;
  },

  async addFirstInvite(invite) {
    await schema();
    return sql().begin(async (tx) => {
      // Блокировка таблиц: два одновременных запроса не создадут два первичных приглашения.
      await tx`lock table invites, members in exclusive mode`;
      const rows = await tx`select (select count(*) from invites) + (select count(*) from members) as n`;
      if (Number(rows[0].n) !== 0) return false;
      await tx`insert into invites (code_hash, data) values (${invite.codeHash}, ${tx.json(invite as unknown as Json)})`;
      return true;
    });
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
      if (!data || data.usedAt || data.revokedAt || new Date(data.expiresAt) <= now) return "unavailable" as const;
      const taken = await tx`select 1 from members where email = ${member.email}`;
      if (taken.length) return "email_taken" as const;
      await tx`update invites set data = data || ${tx.json({ usedAt: now.toISOString() })} where code_hash = ${codeHash}`;
      await tx`insert into members (id, email, data) values (${member.id}, ${member.email}, ${tx.json(member as unknown as Json)})`;
      return "ok" as const;
    });
  },
};
