import { headers } from "next/headers";
import { createLimiter } from "../core/ratelimit";
import { sessionMemberId } from "./session";
import { store, type Member } from "./store";

// Лимиты в памяти процесса: достаточно для одного сервера, при масштабировании вынести в хранилище.
export const inviteLimiter = createLimiter(10, 15 * 60 * 1000);
// Вход по паролю: по почте (нельзя обойти сменой адреса) и отдельно по адресу клиента.
export const loginLimiter = createLimiter(5, 15 * 60 * 1000);
export const loginIpLimiter = createLimiter(30, 15 * 60 * 1000);
// Общий потолок на ввод кодов приглашения со всех адресов вместе.
// Письма со ссылкой входа: не больше трёх на почту за 15 минут.
export const emailLinkLimiter = createLimiter(3, 15 * 60 * 1000);
export const inviteGlobalLimiter = createLimiter(200, 15 * 60 * 1000);

// X-Forwarded-For задаёт клиент. Доверяем только последней записи, которую добавил наш прокси,
// и только если прокси явно включён (CERTA_TRUST_PROXY=1). Иначе адрес неизвестен (null),
// и лимит по адресу пропускается; лимиты по почте, участнику и общий действуют всегда.
export async function clientIp(): Promise<string | null> {
  if (process.env.CERTA_TRUST_PROXY !== "1") return null;
  const xff = (await headers()).get("x-forwarded-for");
  return xff?.split(",").map((x) => x.trim()).filter(Boolean).pop() ?? null;
}

export async function currentMember(): Promise<Member | null> {
  const id = await sessionMemberId();
  if (!id) return null;
  return (await store.getMember(id)) ?? null;
}

// Проверка прав совета: вызывать в каждом действии и странице совета.
export async function currentCouncil(): Promise<Member | null> {
  const m = await currentMember();
  return m?.role === "council" ? m : null;
}
