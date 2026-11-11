import { headers } from "next/headers";
import { sessionToken, startSession } from "./session";
import { store, type Member } from "./store";

// Лимиты попыток хранятся в базе: на Vercel много экземпляров, счётчик в памяти обнулялся бы.
function limiter(name: string, max: number, windowMs: number) {
  return {
    hit: (key: string) => store.hitLimit(`${name}:${key}`, max, windowMs, Date.now()),
    reset: (key: string) => store.resetLimit(`${name}:${key}`),
  };
}

export const inviteLimiter = limiter("invite", 10, 15 * 60 * 1000);
// Вход по паролю: по почте (нельзя обойти сменой адреса) и отдельно по адресу клиента.
export const loginLimiter = limiter("login", 5, 15 * 60 * 1000);
export const loginIpLimiter = limiter("login_ip", 30, 15 * 60 * 1000);
// Общий потолок на ввод кодов приглашения со всех адресов вместе.
// Письма со ссылкой входа: не больше трёх на почту за 15 минут.
export const emailLinkLimiter = limiter("email_link", 3, 15 * 60 * 1000);
export const inviteGlobalLimiter = limiter("invite_all", 200, 15 * 60 * 1000);
// Загрузка файлов: не больше 60 на участника за 15 минут.
export const uploadLimiter = limiter("upload", 60, 15 * 60 * 1000);
// Отклики: не больше 20 на участника в час, чтобы не засыпать совет и авторов письмами.
export const inquiryLimiter = limiter("inquiry", 20, 60 * 60 * 1000);

// X-Forwarded-For задаёт клиент. Доверяем только последней записи, которую добавил наш прокси,
// и только если прокси явно включён (CERTA_TRUST_PROXY=1). Иначе адрес неизвестен (null),
// и лимит по адресу пропускается; лимиты по почте, участнику и общий действуют всегда.
export async function clientIp(): Promise<string | null> {
  if (process.env.CERTA_TRUST_PROXY !== "1") return null;
  const xff = (await headers()).get("x-forwarded-for");
  return xff?.split(",").map((x) => x.trim()).filter(Boolean).pop() ?? null;
}

// Сессия действительна, только если её версия совпадает с текущей и участник не заблокирован.
export async function currentMember(): Promise<Member | null> {
  const t = await sessionToken();
  if (!t) return null;
  const m = await store.getMember(t.id);
  if (!m || m.blockedAt || (m.sessionVersion ?? 0) !== t.ver) return null;
  return m;
}

// Сессия выдана недавно: для действий, которые дают постоянный доступ (новый ключ входа).
export async function freshMember(maxAgeSec = 10 * 60): Promise<Member | null> {
  const t = await sessionToken();
  const m = await currentMember();
  if (!t || !m || Date.now() / 1000 - t.issuedAt > maxAgeSec) return null;
  return m;
}

// Выдать сессию с текущей версией участника. Заблокированному сессия не выдаётся.
export async function startMemberSession(memberId: string): Promise<boolean> {
  const m = await store.getMember(memberId);
  if (!m || m.blockedAt) return false;
  await startSession(m.id, m.sessionVersion ?? 0);
  return true;
}

// Погасить все сессии участника на всех устройствах.
export async function revokeSessions(m: Member): Promise<number> {
  const ver = (m.sessionVersion ?? 0) + 1;
  await store.updateMember(m.id, { sessionVersion: ver });
  return ver;
}

// Проверка прав совета: вызывать в каждом действии и странице совета.
export async function currentCouncil(): Promise<Member | null> {
  const m = await currentMember();
  return m?.role === "council" ? m : null;
}
