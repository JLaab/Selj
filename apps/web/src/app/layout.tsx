import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Selj – marknadsplatsen som går snabbt på mobil och desktop",
  description:
    "Selj: lägg upp och hitta annonser snabbt, med bra sök, länval och stabil scrollupplevelse.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="sv">
      <body
        className={`${geistSans.variable} ${geistMono.variable}`}
        data-theme="light"
      >
        {children}
      </body>
    </html>
  );
}
