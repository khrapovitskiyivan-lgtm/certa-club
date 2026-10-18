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
  title: "Certa",
  description: "Вход по приглашению",
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
