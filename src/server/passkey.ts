// Параметры проверяющей стороны WebAuthn: домен и источник берутся из адреса сайта.
export function relyingParty(): { rpID: string; origin: string; rpName: string } {
  const origin = (process.env.CERTA_BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
  return { rpID: new URL(origin).hostname, origin, rpName: "Certa" };
}
