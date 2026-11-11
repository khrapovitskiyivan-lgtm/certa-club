// Адрес сайта для ссылок в письмах и для ключей входа. В проде без CERTA_BASE_URL работать нельзя:
// ссылки вели бы на localhost, а ключи Face ID привязались бы к чужому домену.
export function baseUrl(): string {
  const u = process.env.CERTA_BASE_URL;
  if (u) return u.replace(/\/$/, "");
  // Предпросмотр на Vercel: свой адрес развёртывания.
  if (process.env.VERCEL_ENV === "preview" && process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  if (process.env.NODE_ENV === "production") throw new Error("CERTA_BASE_URL не задан");
  return "http://localhost:3000";
}
