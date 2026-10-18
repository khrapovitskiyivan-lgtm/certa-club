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
  passwordHash: string;
  invitedAs: string;
  // KYC проходит сразу после анкеты; доступ к клубу после подтверждения советом.
  status: "awaiting_kyc" | "kyc_submitted" | "active";
  verification?: Verification;
  // Роль в клубе: совет подтверждает участников и выдаёт приглашения.
  role?: "member" | "council";
  // Секрет второго фактора (TOTP). Пусто, пока участник не настроил приложение.
  totpSecret?: string;
  // Последний использованный шаг TOTP: защита от повтора кода.
  totpLastStep?: number;
  activatedAt?: string;
  createdAt: string;
};

export type Verification =
  | { method: "self"; submittedAt: string }
  | { method: "agent"; agentType: string; agentName: string; agentContact: string; submittedAt: string };

export type Store = {
  listInvites(): Promise<Invite[]>;
  addInvite(invite: Invite): Promise<void>;
  addLoginLink(link: LoginLink): Promise<void>;
  // Гасит ссылку и возвращает её; повторно по той же ссылке войти нельзя.
  consumeLoginLink(tokenHash: string, now: Date): Promise<LoginLink | undefined>;
  getMember(id: string): Promise<Member | undefined>;
  findByEmail(email: string): Promise<Member | undefined>;
  listMembers(): Promise<Member[]>;
  // Атомарно отмечает шаг TOTP использованным; false, если этот или более поздний шаг уже был.
  consumeTotpStep(id: string, step: number): Promise<boolean>;
  updateMember(id: string, patch: Partial<Omit<Member, "id">>): Promise<boolean>;
  submitVerification(id: string, v: Verification): Promise<boolean>;
  // Помечает приглашение использованным и создаёт участника одной операцией.
  redeem(codeHash: string, member: Member, now: Date): Promise<"ok" | "unavailable" | "email_taken">;
};
