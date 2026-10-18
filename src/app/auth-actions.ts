"use server";

import { redirect } from "next/navigation";
import { hashToken } from "@/core/entry";
import { endSession, startLinked } from "@/server/session";
import { store } from "@/server/store";

export type AuthState = { error?: string };

// Переход по ссылке из письма: гасим ссылку и предлагаем включить Face ID на этом устройстве.
export async function redeemLoginLink(token: string): Promise<AuthState> {
  const link = await store.consumeLoginLink(hashToken(token), new Date());
  if (!link) return { error: "Ссылка недействительна или устарела. Введите почту на главной ещё раз" };
  await startLinked(link.memberId);
  redirect("/passkey");
}

export async function logout(): Promise<void> {
  await endSession();
  redirect("/");
}
