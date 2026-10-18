// Файловое хранилище для локальной разработки без базы данных.
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Invite } from "../core/invites";
import type { LoginLink } from "../core/entry";
import type { Member, Store, Verification } from "./store-types";

type Data = { invites: Invite[]; members: Member[]; loginLinks?: LoginLink[] };

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
  async listInvites(): Promise<Invite[]> {
    return (await load()).invites;
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
  // Атомарно отмечает шаг TOTP использованным; false, если этот или более поздний шаг уже был.
  consumeTotpStep(id: string, step: number): Promise<boolean> {
    return exclusive(async () => {
      const d = await load();
      const m = d.members.find((x) => x.id === id);
      if (!m || step <= (m.totpLastStep ?? -1)) return false;
      m.totpLastStep = step;
      await save(d);
      return true;
    });
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
      if (!inv || inv.usedAt || new Date(inv.expiresAt) <= now) return "unavailable";
      if (d.members.some((m) => m.email === member.email)) return "email_taken";
      inv.usedAt = now.toISOString();
      d.members.push(member);
      await save(d);
      return "ok";
    });
  },
};
