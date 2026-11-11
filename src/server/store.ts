// Выбор хранилища: Postgres, если задан DATABASE_URL, иначе файл (локальная разработка).
import { fileStore } from "./store-file.ts";
import { pgStore } from "./store-pg.ts";
import type { Store } from "./store-types.ts";

export type { ClubEvent, Credential, Inquiry, Member, Store, Verification } from "./store-types.ts";

// В проде без базы не подменяем её файлом молча: на сервере файл пропал бы при перезапуске,
// а пустое хранилище снова открыло бы первичную настройку. Ошибка возникает при первом обращении.
const missingDb = new Proxy({} as Store, {
  get() {
    throw new Error("DATABASE_URL не задан: в production файловое хранилище не используется");
  },
});

export const store: Store = process.env.DATABASE_URL
  ? pgStore
  : process.env.NODE_ENV === "production" && process.env.CERTA_ALLOW_FILE_STORE !== "1"
    ? missingDb
    : fileStore;
