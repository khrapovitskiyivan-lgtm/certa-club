// Выбор хранилища: Postgres, если задан DATABASE_URL, иначе файл (локальная разработка).
import { fileStore } from "./store-file.ts";
import { pgStore } from "./store-pg.ts";
import type { Store } from "./store-types.ts";

export type { ClubEvent, Credential, Inquiry, Member, Store, Verification } from "./store-types.ts";

export const store: Store = process.env.DATABASE_URL ? pgStore : fileStore;
