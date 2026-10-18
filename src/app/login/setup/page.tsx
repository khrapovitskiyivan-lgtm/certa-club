import { Suspense } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import QRCode from "qrcode";
import { generateSecret, otpauthUri } from "@/core/totp";
import { pendingMemberId } from "@/server/session";
import { store } from "@/server/store";
import { signSetupSecret } from "@/server/totp-setup";
import { SetupForm } from "../forms";
import { KeyActions } from "./key-actions";
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
  const uri = otpauthUri(secret, m.pseudonym);
  const qr = await QRCode.toDataURL(uri, {
    margin: 0,
    width: 220,
    color: { dark: "#1f1d1aff", light: "#f3efe700" },
  });

  return (
    <>
      <h1 className={s.title}>Второй фактор</h1>
      <p className={s.lead}>
        Вход в клуб защищён шестизначным кодом с телефона, как в банке. Настраивается один раз.
      </p>
      <h2 className={s.legend}>Регистрируетесь с телефона</h2>
      <ol className={s.howto}>
        <li>
          Нажмите кнопку ниже. На iPhone откроются «Пароли»: укажите сайт certa-club.vercel.app и сохраните. На
          Android откроется Google Authenticator или Яндекс Ключ, если установлен.
        </li>
        <li>Вернитесь в браузер и введите шестизначный код из приложения в поле внизу страницы.</li>
      </ol>
      <KeyActions uri={uri} secret={secret} />

      <h2 className={s.legend}>Регистрируетесь с компьютера</h2>
      <ol className={s.howto}>
        <li>
          <b>iPhone:</b> наведите камеру телефона на код ниже, нажмите «Пароли» → «Добавить код проверки», укажите
          сайт certa-club.vercel.app и сохраните.
        </li>
        <li>
          <b>Android:</b> в Google Authenticator или Яндекс Ключе нажмите «+» → «Сканировать QR-код».
        </li>
        <li>Шестизначный код из приложения (меняется каждые 30 секунд) введите в поле ниже.</li>
      </ol>
      {/* eslint-disable-next-line @next/next/no-img-element -- data URL, оптимизация не нужна */}
      <img src={qr} alt="QR-код для приложения-аутентификатора" width={220} height={220} className={s.qr} />
      <p className={s.hint}>
        Не получается отсканировать? Введите ключ вручную: <span className={s.secret}>{secret.match(/.{1,4}/g)?.join(" ")}</span>
      </p>
      <p className={s.hint}>Код вводится на этой странице, в поле «Код из приложения».</p>
      <SetupForm secret={secret} sig={signSetupSecret(m.id, secret)} />
    </>
  );
}
