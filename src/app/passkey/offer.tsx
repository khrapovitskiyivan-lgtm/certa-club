"use client";

import { useState, useSyncExternalStore } from "react";
import { browserSupportsWebAuthn, startRegistration } from "@simplewebauthn/browser";
import { passkeyRegistrationOptions, passkeyRegistrationVerify } from "../passkey-actions";
import s from "../invite/invite.module.css";

const DISMISS_KEY = "certa.passkey.offer.dismissed";

// Встроенные браузеры мессенджеров не поддерживают вход по ключу: там предложение не показываем.
function inAppBrowser(ua: string): boolean {
  return /Telegram|FBAN|FBAV|Instagram|WhatsApp|Line\/|VKClient|YaApp/i.test(ua);
}

function canOffer(): boolean {
  try {
    if (localStorage.getItem(DISMISS_KEY)) return false;
  } catch {}
  return browserSupportsWebAuthn() && !inAppBrowser(navigator.userAgent);
}

const subscribe = () => () => {};

// Тихое предложение включить вход по Face ID после входа по паролю.
export function PasskeyOffer() {
  const allowed = useSyncExternalStore(subscribe, canOffer, () => false);
  const [hidden, setHidden] = useState(false);
  const [status, setStatus] = useState<"idle" | "busy" | "done" | "error">("idle");
  if (!allowed || hidden) return null;

  async function enable() {
    setStatus("busy");
    try {
      const options = await passkeyRegistrationOptions();
      if (!options) throw new Error();
      const r = await passkeyRegistrationVerify(await startRegistration({ optionsJSON: options }));
      setStatus(r.ok ? "done" : "error");
    } catch {
      setStatus("error");
    }
  }

  function dismiss() {
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {}
    setHidden(true);
  }

  if (status === "done") return <p className={s.offer}>Вход по Face ID включён на этом устройстве.</p>;

  return (
    <div className={s.offer}>
      <span>Включить вход по Face ID или отпечатку на этом устройстве?</span>
      <button type="button" className={s.offerBtn} onClick={enable} disabled={status === "busy"}>
        {status === "busy" ? "Ждём подтверждения" : "Включить"}
      </button>
      <button type="button" className={s.offerBtn} onClick={dismiss}>
        Не сейчас
      </button>
      {status === "error" && <span className={s.fieldError}>Не получилось, попробуйте ещё раз.</span>}
    </div>
  );
}
