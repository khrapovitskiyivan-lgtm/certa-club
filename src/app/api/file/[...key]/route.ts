import { fileUrl, parseKey } from "@/core/upload";
import { visibleTo } from "@/core/listing";
import { currentMember } from "@/server/auth";
import { getFile } from "@/server/files";
import { store } from "@/server/store";

// Выдача файла лота. Фото видит тот, кому виден лот; документы только автор и совет.
export async function GET(_req: Request, ctx: RouteContext<"/api/file/[...key]">) {
  const m = await currentMember();
  if (!m) return new Response("Нет доступа", { status: 401 });
  const key = (await ctx.params).key.join("/");
  const p = parseKey(key);
  if (!p) return new Response("Не найдено", { status: 404 });

  const isCouncil = m.role === "council";
  let allowed = p.memberId === m.id || isCouncil;
  if (!allowed && p.kind === "photo") {
    const url = fileUrl(key);
    allowed = (await store.listListings()).some((l) => l.photos?.includes(url) && visibleTo(l, m.id, isCouncil));
  }
  if (!allowed) return new Response("Не найдено", { status: 404 });

  const f = await getFile(key);
  if (!f) return new Response("Не найдено", { status: 404 });
  return new Response(f.body as BodyInit, {
    headers: {
      "Content-Type": f.contentType,
      "Cache-Control": "private, max-age=3600",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "sandbox; default-src 'none'; img-src 'self'; style-src 'unsafe-inline'",
      "Content-Disposition": p.kind === "doc" ? "attachment" : "inline",
    },
  });
}
