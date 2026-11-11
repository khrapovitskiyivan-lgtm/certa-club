import { baseUrl } from "./base-url";

// Параметры проверяющей стороны WebAuthn: домен и источник берутся из адреса сайта.
export function relyingParty(): { rpID: string; origin: string; rpName: string } {
  const origin = baseUrl();
  return { rpID: new URL(origin).hostname, origin, rpName: "Certa" };
}
