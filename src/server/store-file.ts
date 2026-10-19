// Файловое хранилище для локальной разработки без базы данных.
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Invite } from "../core/invites";
import type { LoginLink } from "../core/entry";
import type { Listing } from "../core/listing";
import type { ClubEvent, Credential, Inquiry, Member, Store, Verification } from "./store-types";

type Data = { invites: Invite[]; members: Member[]; loginLinks?: LoginLink[]; credentials?: Credential[]; events?: ClubEvent[]; listings?: Listing[]; inquiries?: Inquiry[] };

const DATA_DIR = process.env.CERTA_DATA_DIR ?? path.join(process.cwd(), ".data");
const FILE = path.join(DATA_DIR, "store.json");

async function load(): Promise<Data> {
  try {
    return JSON.parse(await readFile(FILE, "utf8")) as Data;
  } catch {
    return { invites: [], members: [] };
  }
}

async function save(data: Data): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
  // Атомарная запись через временный файл, чтобы не получить битый JSON.
  const tmp = FILE + ".tmp";
  await writeFile(tmp, JSON.stringify(data, null, 2), "utf8");
  await rename(tmp, FILE);
}

// Последовательная очередь записи: исключает гонку двух регистраций по одному коду.
let queue: Promise<unknown> = Promise.resolve();
function exclusive<T>(fn: () => Promise<T>): Promise<T> {
  const run = queue.then(fn, fn);
  queue = run.catch(() => undefined);
  return run;
}

export const fileStore: Store = {
  addListing(l) {
    return exclusive(async () => {
      const d = await load();
      (d.listings ??= []).push(l);
      await save(d);
    });
  },
  async getListing(id) {
    return (await load()).listings?.find((l) => l.id === id);
  },
  async listListings() {
    return [...((await load()).listings ?? [])].reverse();
  },
  withdrawListing(id, now) {
    return exclusive(async () => {
      const d = await load();
      const l = d.listings?.find((x) => x.id === id);
      if (!l || l.status === "withdrawn") return false;
      l.status = "withdrawn";
      l.withdrawnAt = now.toISOString();
      await save(d);
      return true;
    });
  },
  updateListingIf(id, from, patch, rev) {
    return exclusive(async () => {
      const d = await load();
      const l = d.listings?.find((x) => x.id === id);
      if (!l || !from.includes(l.status)) return false;
      if (rev !== undefined && (l.rev ?? 0) !== rev) return false;
      Object.assign(l, patch);
      await save(d);
      return true;
    });
  },
  addInquiry(i) {
    return exclusive(async () => {
      const d = await load();
      (d.inquiries ??= []).push(i);
      await save(d);
    });
  },
  async listInquiries() {
    return [...((await load()).inquiries ?? [])].reverse();
  },
  markInquiryHandled(id) {
    return exclusive(async () => {
      const d = await load();
      const i = d.inquiries?.find((x) => x.id === id);
      if (i) i.status = "handled";
      await save(d);
    });
  },
  addEvent(e) {
    return exclusive(async () => {
      const d = await load();
      (d.events ??= []).push(e);
      await save(d);
    });
  },
  async listEvents(limit) {
    return [...((await load()).events ?? [])].reverse().slice(0, limit);
  },
  revokeInvite(codeHash, now) {
    return exclusive(async () => {
      const d = await load();
      const i = d.invites.find((x) => x.codeHash === codeHash);
      if (!i || i.usedAt || i.revokedAt) return false;
      i.revokedAt = now.toISOString();
      await save(d);
      return true;
    });
  },
  deleteUnfinishedMember(id) {
    return exclusive(async () => {
      const d = await load();
      const m = d.members.find((x) => x.id === id);
      if (!m || m.status === "active" || m.role === "council") return false;
      d.members = d.members.filter((x) => x.id !== id);
      d.credentials = (d.credentials ?? []).filter((c) => c.memberId !== id);
      await save(d);
      return true;
    });
  },
  addCredential(c) {
    return exclusive(async () => {
      const d = await load();
      (d.credentials ??= []).push(c);
      await save(d);
    });
  },
  async getCredential(id) {
    return (await load()).credentials?.find((c) => c.id === id);
  },
  async listCredentials(memberId) {
    return ((await load()).credentials ?? []).filter((c) => c.memberId === memberId);
  },
  updateCredentialCounter(id, counter) {
    return exclusive(async () => {
      const d = await load();
      const c = d.credentials?.find((x) => x.id === id);
      if (c) c.counter = counter;
      await save(d);
    });
  },
  async listInvites(): Promise<Invite[]> {
    return (await load()).invites;
  },
  async isEmpty() {
    const d = await load();
    return d.invites.length === 0 && d.members.length === 0;
  },
  addFirstInvite(invite: Invite): Promise<boolean> {
    return exclusive(async () => {
      const d = await load();
      if (d.invites.length || d.members.length) return false;
      d.invites.push(invite);
      await save(d);
      return true;
    });
  },
  addInvite(invite: Invite): Promise<void> {
    return exclusive(async () => {
      const d = await load();
      d.invites.push(invite);
      await save(d);
    });
  },
  addLoginLink(link: LoginLink): Promise<void> {
    return exclusive(async () => {
      const d = await load();
      // Заодно чистим просроченные ссылки, чтобы файл не рос.
      const now = Date.now();
      d.loginLinks = (d.loginLinks ?? []).filter((l) => new Date(l.expiresAt).getTime() > now);
      d.loginLinks.push(link);
      await save(d);
    });
  },
  // Гасит ссылку и возвращает её; повторно по той же ссылке войти нельзя.
  consumeLoginLink(tokenHash: string, now: Date): Promise<LoginLink | undefined> {
    return exclusive(async () => {
      const d = await load();
      const l = (d.loginLinks ?? []).find((x) => x.tokenHash === tokenHash);
      if (!l || l.usedAt || new Date(l.expiresAt) <= now) return undefined;
      l.usedAt = now.toISOString();
      await save(d);
      return l;
    });
  },
  async getMember(id: string): Promise<Member | undefined> {
    return (await load()).members.find((m) => m.id === id);
  },
  async findByEmail(email: string): Promise<Member | undefined> {
    const e = email.trim().toLowerCase();
    return (await load()).members.find((m) => m.email === e);
  },
  async listMembers(): Promise<Member[]> {
    return (await load()).members;
  },
  // Частичное обновление участника одной операцией.
  updateMember(id: string, patch: Partial<Omit<Member, "id">>): Promise<boolean> {
    return exclusive(async () => {
      const d = await load();
      const m = d.members.find((x) => x.id === id);
      if (!m) return false;
      Object.assign(m, patch);
      await save(d);
      return true;
    });
  },
  submitVerification(id: string, v: Verification): Promise<boolean> {
    return exclusive(async () => {
      const d = await load();
      const m = d.members.find((x) => x.id === id);
      if (!m || m.status === "active") return false;
      m.verification = v;
      m.status = "kyc_submitted";
      await save(d);
      return true;
    });
  },
  // Помечает приглашение использованным и создаёт участника одной операцией.
  redeem(codeHash: string, member: Member, now: Date): Promise<"ok" | "unavailable" | "email_taken"> {
    return exclusive(async () => {
      const d = await load();
      const inv = d.invites.find((i) => i.codeHash === codeHash);
      if (!inv || inv.usedAt || inv.revokedAt || new Date(inv.expiresAt) <= now) return "unavailable";
      if (d.members.some((m) => m.email === member.email)) return "email_taken";
      inv.usedAt = now.toISOString();
      d.members.push(member);
      await save(d);
      return "ok";
    });
  },
};
