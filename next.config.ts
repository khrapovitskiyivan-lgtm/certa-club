import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  // Отдельная сборка для своего сервера (Docker); Vercel эту настройку не использует.
  output: "standalone",
  partialPrefetching: true,
  // Заголовки безопасности: сайт нельзя встроить в чужую страницу (кликджекинг),
  // адрес страницы (в нём бывает токен входа) не уходит на внешние сайты, только HTTPS.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
          { key: "Referrer-Policy", value: "no-referrer" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Strict-Transport-Security", value: "max-age=31536000" },
        ],
      },
    ];
  },
};

export default nextConfig;
