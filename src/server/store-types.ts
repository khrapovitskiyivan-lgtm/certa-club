// Модель данных хранилища и его контракт. Реализации: файл (разработка) и Postgres (сервер).
import type { Invite } from "../core/invites";
import type { LoginLink } from "../core/entry";
import type { Listing } from "../core/listing";

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
  // Сессии, выданные раньше этого момента (секунды Unix), недействительны: смена пароля выходит со всех устройств.
  sessionsValidFrom?: number;
  invitedAs: string;
  // KYC проходит сразу после анкеты; доступ к клубу после подтверждения советом.
  status: "awaiting_kyc" | "kyc_submitted" | "active";
  verification?: Verification;
  // Роль в клубе: совет подтверждает участников и выдаёт приглашения.
  // expert: даёт оценку и заключения по экспертизе (модуль экспертизы впереди).
  role?: "member" | "expert" | "council";
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

// Событие журнала клуба: хранится в базе без ограничения срока, видно совету.
export type ClubEvent = {
  id: string;
  at: string;
  type: string;
  text: string;
  memberId?: string;
};

// Отклик на лот или запрос: уходит куратору, он связывает стороны.
export type Inquiry = {
  id: string;
  listingId: string;
  listingKind: "offer" | "request";
  listingTitle: string;
  authorId: string;
  authorPseudonym: string;
  fromId: string;
  fromPseudonym: string;
  message: string;
  status: "new" | "handled";
  createdAt: string;
};

export type Store = {
  addListing(l: Listing): Promise<void>;
  getListing(id: string): Promise<Listing | undefined>;
  listListings(): Promise<Listing[]>;
  withdrawListing(id: string, now: Date): Promise<boolean>;
  // Атомарное изменение лота, только если его статус сейчас один из from: два члена совета не решат один лот дважды.
  // rev: если задан, изменение проходит только при совпадении версии лота.
  updateListingIf(id: string, from: Listing["status"][], patch: Partial<Listing>, rev?: number): Promise<boolean>;
  addInquiry(i: Inquiry): Promise<void>;
  listInquiries(): Promise<Inquiry[]>;
  markInquiryHandled(id: string): Promise<void>;
  addEvent(e: ClubEvent): Promise<void>;
  listEvents(limit: number): Promise<ClubEvent[]>;
  // Отзыв ещё не использованного приглашения.
  revokeInvite(codeHash: string, now: Date): Promise<boolean>;
  // Удаление незавершённой регистрации: только неактивный участник не из совета, вместе с его ключами.
  deleteUnfinishedMember(id: string): Promise<boolean>;
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
  // Подтверждение участия атомарно: только из статуса kyc_submitted, повторное нажатие ничего не делает.
  approveMember(id: string, now: Date): Promise<boolean>;
  // Смена роли атомарно: последнего члена совета снять нельзя даже при одновременных запросах.
  setMemberRole(id: string, role: "member" | "expert" | "council"): Promise<"ok" | "last_council" | "missing">;
  submitVerification(id: string, v: Verification): Promise<boolean>;
  // Помечает приглашение использованным и создаёт участника одной операцией.
  redeem(codeHash: string, member: Member, now: Date): Promise<"ok" | "unavailable" | "email_taken">;
};
