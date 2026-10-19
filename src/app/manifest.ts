import type { MetadataRoute } from "next";

// Манифест: иконка клуба при добавлении сайта на экран телефона.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Certa",
    short_name: "Certa",
    description: "Редкие вещи. Проверенные люди.",
    start_url: "/",
    display: "standalone",
    background_color: "#f3efe7",
    theme_color: "#f3efe7",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
