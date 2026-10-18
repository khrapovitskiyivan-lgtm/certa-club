// Подпись секрета на странице настройки второго фактора: секрет приходит из формы,
// подпись не даёт подменить его. Только серверный модуль: не экспортировать из "use server".
import { createHmac, timingSafeEqual } from "node:crypto";

function key(): string {
  return process.env.CERTA_SESSION_SECRET ?? "dev-only-secret-change-me";
}

export function signSetupSecret(memberId: string, secret: string): string {
  return createHmac("sha256", key()).update(`totp-setup.${memberId}.${secret}`).digest("base64url");
}

export function checkSetupSecret(memberId: string, secret: string, sig: string): boolean {
  const a = Buffer.from(sig);
  const b = Buffer.from(signSetupSecret(memberId, secret));
  return a.length === b.length && timingSafeEqual(a, b);
}
