import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google";
import "./globals.css";

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist",
  weight: ["400", "500", "600", "700"],
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
  weight: ["400", "500"],
});

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  variable: "--font-instrument-serif",
  weight: "400",
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "Mantenedor de Gastos",
  description: "Gestiona tus gastos mensuales",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: "#F4EFE6",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="es"
      className={`${geist.variable} ${geistMono.variable} ${instrumentSerif.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
