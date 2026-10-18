import { Suspense } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import QRCode from "qrcode";
import { generateSecret, otpauthUri } from "@/core/totp";
import { pendingMemberId } from "@/server/session";
import { store } from "@/server/store";
import { signSetupSecret } from "@/server/totp-setup";
import { SetupForm } from "../forms";
import s from "../../invite/invite.module.css";

export default function SetupPage() {
  return (
    <main className={s.page}>
      <div className={s.narrow}>
        <p className={s.mark}>Certa</p>
        <Suspense fallback={null}>
          <SetupContent />
        </Suspense>
      </div>
    </main>
  );
}

async function SetupContent() {
  await connection();
  const id = await pendingMemberId();
  const m = id ? await store.getMember(id) : undefined;
  if (!m || m.totpSecret) redirect("/login");

  const secret = generateSecret();
  const qr = await QRCode.toDataURL(otpauthUri(secret, m.pseudonym), {
    margin: 0,
    width: 220,
    color: { dark: "#1f1d1aff", light: "#f3efe700" },
  });

  return (
    <>
      <h1 className={s.title}>Второй фактор</h1>
      <p className={s.lead}>
        Вход в клуб защищён кодом с телефона. Отсканируйте изображение в приложении-аутентификаторе (Google
        Authenticator, Яндекс Ключ, 1Password или аналог) и введите появившийся код.
      </p>
      {/* eslint-disable-next-line @next/next/no-img-element -- data URL, оптимизация не нужна */}
      <img src={qr} alt="QR-код для приложения-аутентификатора" width={220} height={220} className={s.qr} />
      <p className={s.hint}>
        Не получается отсканировать? Введите ключ вручную: <span className={s.secret}>{secret.match(/.{1,4}/g)?.join(" ")}</span>
      </p>
      <SetupForm secret={secret} sig={signSetupSecret(m.id, secret)} />
    </>
  );
}
