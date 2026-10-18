// Назначение участника членом экспертного совета. Нужен для первого входа, пока совета нет.
// Запуск: npm run council -- почта@участника
import { store } from "../src/server/store.ts";

const email = process.argv[2];
if (!email) {
  console.error("Использование: npm run council -- почта@участника");
  process.exit(1);
}

const m = await store.findByEmail(email);
if (!m) {
  console.error(`Участник с почтой ${email} не найден. Сначала он регистрируется по приглашению.`);
  process.exit(1);
}

await store.updateMember(m.id, {
  role: "council",
  status: "active",
  activatedAt: m.activatedAt ?? new Date().toISOString(),
});
console.log(`${m.fullName} (${m.pseudonym}) теперь в экспертном совете.`);
console.log("Вход: /login, при первом входе нужно подключить приложение-аутентификатор.");
