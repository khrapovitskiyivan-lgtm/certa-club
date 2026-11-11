"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { validateExpert, type Expert, type ExpertErrors } from "@/core/expert";
import { currentCouncil } from "@/server/auth";
import { logEvent } from "@/server/events";
import { store } from "@/server/store";

// values: введённое при ошибке, чтобы форма после сброса показала его снова.
export type ExpertFormState = { errors?: ExpertErrors; formError?: string; saved?: number; values?: Record<string, string> };

// Создать или изменить профиль эксперта. Согласие фиксируется датой; без согласия профиль не публикуется.
export async function saveExpertAction(_prev: ExpertFormState, formData: FormData): Promise<ExpertFormState> {
  const me = await currentCouncil();
  if (!me) return { formError: "Нет прав" };
  const raw = Object.fromEntries([...formData].map(([k, v]) => [k, String(v)]));
  const r = validateExpert(raw);
  if (!r.ok) return { errors: r.errors, values: raw };
  const id = String(formData.get("id") ?? "");
  const prev = id ? await store.getExpert(id) : undefined;
  if (id && !prev) return { formError: "Профиль не найден, обновите страницу" };
  const now = new Date().toISOString();
  const { consent, ...fields } = r.data;
  const e: Expert = {
    ...fields,
    id: prev?.id ?? randomUUID(),
    consentAt: consent ? (prev?.consentAt ?? now) : undefined,
    createdAt: prev?.createdAt ?? now,
    updatedAt: now,
  };
  await store.putExpert(e);
  const what = !prev
    ? "Добавлен эксперт"
    : prev.published !== e.published
      ? e.published
        ? "Опубликован эксперт"
        : "Скрыт эксперт"
      : "Изменён профиль эксперта";
  await logEvent("expert_saved", `${what}: ${e.fullName} (${me.pseudonym})`, me.id);
  revalidatePath("/council/experts");
  revalidatePath("/club/experts");
  return { saved: Date.now() };
}

export async function deleteExpertAction(formData: FormData): Promise<void> {
  const me = await currentCouncil();
  if (!me) return;
  const e = await store.getExpert(String(formData.get("id") ?? ""));
  if (e && (await store.deleteExpert(e.id))) {
    await logEvent("expert_deleted", `Удалён профиль эксперта: ${e.fullName} (${me.pseudonym})`, me.id);
  }
  revalidatePath("/council/experts");
  revalidatePath("/club/experts");
}
