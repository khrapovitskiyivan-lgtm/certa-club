import { randomUUID } from "node:crypto";
import { store } from "./store";

// Запись в журнал клуба. Сбой журнала не должен ломать основное действие.
export async function logEvent(type: string, text: string, memberId?: string): Promise<void> {
  try {
    await store.addEvent({ id: randomUUID(), at: new Date().toISOString(), type, text, memberId });
  } catch (e) {
    console.error(`[журнал] не записано: ${e instanceof Error ? e.message : "ошибка"}`);
  }
}
