// Модель данных хранилища и его контракт. Реализации: файл (разработка) и Postgres (сервер).
import type { Invite } from "../core/invites";
import type { LoginLink } from "../core/entry";

export type Member = {
  id: string;
  fullName: string;
  pseudonym: string;
  email: string;
  phone: string;
  city: string;
  occupation: string;
  about: string;
  // Устаревшее: вход по паролю заменён на passkey; поле остаётся у ранних записей.
  passwordHash?: string;
  invitedAs: string;
  // KYC проходит сразу после анкеты; доступ к клубу после подтверждения советом.
  status: "awaiting_kyc" | "kyc_submitted" | "active";
  verification?: Verification;
  // Роль в клубе: совет подтверждает участников и выдаёт приглашения.
  role?: "member" | "council";
  activatedAt?: string;
  createdAt: string;
};

export type Verification =
  | { method: "self"; submittedAt: string }
  | { method: "agent"; agentType: string; agentName: string; agentContact: string; submittedAt: string };

// Ключ входа (passkey): публичный ключ устройства участника. Секрет остаётся на устройстве.
export type Credential = {
  id: string; // base64url
  memberId: string;
  publicKey: string; // base64url
  counter: number;
  transports?: string[];
  deviceType?: string;
  backedUp?: boolean;
  createdAt: string;
};

export type Store = {
  addCredential(c: Credential): Promise<void>;
  getCredential(id: string): Promise<Credential | undefined>;
  listCredentials(memberId: string): Promise<Credential[]>;
  updateCredentialCounter(id: string, counter: number): Promise<void>;
  listInvites(): Promise<Invite[]>;
  addInvite(invite: Invite): Promise<void>;
  // Пустая ли база: нет ни приглашений, ни участников (режим первичной настройки).
  isEmpty(): Promise<boolean>;
  // Атомарно добавляет первое приглашение, только если база пуста.
  addFirstInvite(invite: Invite): Promise<boolean>;
  addLoginLink(link: LoginLink): Promise<void>;
  // Гасит ссылку и возвращает её; повторно по той же ссылке войти нельзя.
  consumeLoginLink(tokenHash: string, now: Date): Promise<LoginLink | undefined>;
  getMember(id: string): Promise<Member | undefined>;
  findByEmail(email: string): Promise<Member | undefined>;
  listMembers(): Promise<Member[]>;
  updateMember(id: string, patch: Partial<Omit<Member, "id">>): Promise<boolean>;
  submitVerification(id: string, v: Verification): Promise<boolean>;
  // Помечает приглашение использованным и создаёт участника одной операцией.
  redeem(codeHash: string, member: Member, now: Date): Promise<"ok" | "unavailable" | "email_taken">;
};
