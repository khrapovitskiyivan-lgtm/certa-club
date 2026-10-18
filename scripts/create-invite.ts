// Создание приглашения вручную, пока нет кабинета совета.
// Запуск: npm run invite -- "Имя Фамилия" [дней]
import { createInvite } from "../src/core/invites.ts";
import { store } from "../src/server/store.ts";

const name = process.argv[2];
const days = Number(process.argv[3] ?? 14);
if (!name) {
  console.error('Использование: npm run invite -- "Имя Фамилия" [дней]');
  process.exit(1);
}

const { code, invite } = createInvite(name, new Date(), days);
await store.addInvite(invite);
const base = process.env.CERTA_BASE_URL ?? "http://localhost:3000";
console.log(`Приглашение для: ${invite.inviteeName}`);
console.log(`Код: ${code}`);
console.log(`Ссылка: ${base}/invite/${code}`);
console.log(`Действует до: ${invite.expiresAt}`);
