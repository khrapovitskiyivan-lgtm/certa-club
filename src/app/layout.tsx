import type { Metadata } from "next";
import { Cormorant_Garamond, Tenor_Sans } from "next/font/google";
import "./globals.css";

const serif = Cormorant_Garamond({
  variable: "--font-serif",
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500"],
  style: ["normal", "italic"],
});

// Tenor Sans есть только в начертании 400.
const sans = Tenor_Sans({
  variable: "--font-sans",
  subsets: ["latin", "cyrillic"],
  weight: "400",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.CERTA_BASE_URL ?? "http://localhost:3000"),
  title: "Certa",
  description: "Закрытый клуб. Вход по приглашению.",
  // Карточка ссылки в мессенджерах: заголовок, описание и картинка public/og-v2.png.
  openGraph: {
    type: "website",
    siteName: "Certa",
    title: "Certa",
    description: "Закрытый клуб. Вход по приглашению.",
    locale: "ru_RU",
    images: [{ url: "/og-v2.png", width: 1200, height: 630, alt: "Certa" }],
  },
  twitter: { card: "summary_large_image" },
  // Закрытый клуб не должен попадать в поисковую выдачу.
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ru" className={`${serif.variable} ${sans.variable}`}>
      <body>{children}</body>
    </html>
  );
}
