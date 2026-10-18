"use server";

import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
  type AuthenticationResponseJSON,
  type PublicKeyCredentialCreationOptionsJSON,
  type PublicKeyCredentialRequestOptionsJSON,
  type RegistrationResponseJSON,
} from "@simplewebauthn/server";
import { sendMail } from "@/server/mail";
import { relyingParty } from "@/server/passkey";
import {
  clearPending,
  linkedMemberId,
  registrationMemberId,
  sessionMemberId,
  setChallenge,
  startSession,
  takeChallenge,
} from "@/server/session";
import { store, type Member } from "@/server/store";

type Result = { ok: true; next: string } | { ok: false; error: string };

function home(m: Member): string {
  return m.role === "council" ? "/council" : m.status === "awaiting_kyc" ? "/verify" : "/club";
}

// Кто вправе добавить ключ:
// - уже вошедший по ключу участник (новое устройство добавляется из действующей сессии);
// - только что зарегистрированный или пришедший по ссылке из письма, но лишь пока ключей у него нет.
// Иначе захват почты позволил бы привязать свой ключ к чужому аккаунту.
async function enrollingMemberId(): Promise<string | null> {
  const session = await sessionMemberId();
  if (session) return session;
  const id = (await registrationMemberId()) ?? (await linkedMemberId());
  if (!id) return null;
  return (await store.listCredentials(id)).length === 0 ? id : null;
}

export async function passkeyRegistrationOptions(): Promise<PublicKeyCredentialCreationOptionsJSON | null> {
  const id = await enrollingMemberId();
  const m = id ? await store.getMember(id) : undefined;
  if (!m) return null;
  const { rpID, rpName } = relyingParty();
  const existing = await store.listCredentials(m.id);
  const options = await generateRegistrationOptions({
    rpName,
    rpID,
    userName: m.pseudonym,
    userDisplayName: m.pseudonym,
    userID: new TextEncoder().encode(m.id),
    attestationType: "none",
    excludeCredentials: existing.map((c) => ({ id: c.id, transports: c.transports })),
    // Ключ хранится на устройстве и синхронизируется (iCloud, Google), вход по Face ID / отпечатку.
    authenticatorSelection: { residentKey: "required", userVerification: "required" },
  });
  await setChallenge({ purpose: "reg", memberId: m.id, challenge: options.challenge });
  return options;
}

export async function passkeyRegistrationVerify(response: RegistrationResponseJSON): Promise<Result> {
  const ch = await takeChallenge("reg");
  if (!ch?.memberId) return { ok: false, error: "Время ожидания истекло. Попробуйте ещё раз" };
  // Повторная проверка права: между запросом параметров и ответом ключ мог уже появиться.
  if ((await enrollingMemberId()) !== ch.memberId) {
    return { ok: false, error: "Новое устройство добавляется из уже вошедшего. Войдите по Face ID на прежнем устройстве" };
  }
  const m = await store.getMember(ch.memberId);
  if (!m) return { ok: false, error: "Участник не найден" };
  const { rpID, origin } = relyingParty();
  try {
    const v = await verifyRegistrationResponse({
      response,
      expectedChallenge: ch.challenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      requireUserVerification: true,
    });
    if (!v.verified) return { ok: false, error: "Не удалось подтвердить устройство" };
    const c = v.registrationInfo.credential;
    await store.addCredential({
      id: c.id,
      memberId: m.id,
      publicKey: Buffer.from(c.publicKey).toString("base64url"),
      counter: c.counter,
      transports: c.transports,
      deviceType: v.registrationInfo.credentialDeviceType,
      backedUp: v.registrationInfo.credentialBackedUp,
      createdAt: new Date().toISOString(),
    });
  } catch {
    return { ok: false, error: "Не удалось подтвердить устройство" };
  }
  await sendMail(
    m.email,
    "Certa: добавлен ключ входа",
    "К вашему аккаунту в Certa добавлен новый ключ входа (Face ID или отпечаток) на устройстве.

" +
      "Если это были не вы, срочно свяжитесь с куратором клуба: ключ будет отозван.",
  );
  await clearPending();
  await startSession(m.id);
  return { ok: true, next: home(m) };
}

export async function passkeyAuthenticationOptions(): Promise<PublicKeyCredentialRequestOptionsJSON> {
  const { rpID } = relyingParty();
  // Без списка ключей: устройство само предложит ключ клуба, если он есть (вход без ввода почты).
  const options = await generateAuthenticationOptions({ rpID, userVerification: "required" });
  await setChallenge({ purpose: "auth", challenge: options.challenge });
  return options;
}

export async function passkeyAuthenticationVerify(response: AuthenticationResponseJSON): Promise<Result> {
  const ch = await takeChallenge("auth");
  if (!ch) return { ok: false, error: "Время ожидания истекло. Попробуйте ещё раз" };
  const cred = await store.getCredential(response.id);
  const m = cred ? await store.getMember(cred.memberId) : undefined;
  if (!cred || !m) return { ok: false, error: "Ключ не найден. Войдите через почту на главной" };
  const { rpID, origin } = relyingParty();
  try {
    const v = await verifyAuthenticationResponse({
      response,
      expectedChallenge: ch.challenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      requireUserVerification: true,
      credential: {
        id: cred.id,
        publicKey: new Uint8Array(Buffer.from(cred.publicKey, "base64url")),
        counter: cred.counter,
        transports: cred.transports,
      },
    });
    if (!v.verified) return { ok: false, error: "Не удалось подтвердить вход" };
    await store.updateCredentialCounter(cred.id, v.authenticationInfo.newCounter);
  } catch {
    return { ok: false, error: "Не удалось подтвердить вход" };
  }
  await startSession(m.id);
  return { ok: true, next: home(m) };
}
