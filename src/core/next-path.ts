// Возврат после верификации только внутрь витрины: чужие адреса в next не принимаем.
export function safeNext(raw: unknown): string {
  const v = typeof raw === "string" ? raw : "";
  return /^\/club(\/[\w\-/?=&]*)?$/.test(v) && !v.startsWith("/club/verify") ? v : "/club";
}
