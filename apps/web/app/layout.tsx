import type { Metadata } from "next";
import { DM_Sans, Instrument_Serif } from "next/font/google";

import "./globals.css";
import "./lovelydent.css";
import "./workspace.css";
import "./clinical.css";
import { ThemeProvider } from "../components/ThemeProvider";

const dmSans = DM_Sans({
  subsets: ["latin", "latin-ext"],
  variable: "--font-sans",
  display: "swap",
});

const instrumentSerif = Instrument_Serif({
  subsets: ["latin", "latin-ext"],
  weight: "400",
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  title: "LovelyDent — Klinik idarəetmə sistemi",
  description: "Dental klinika üçün qəbul, klinik qeyd, kassa və idarəetmə platforması",
  icons: {
    icon: "/lovelydent-icon.png",
    shortcut: "/lovelydent-icon.png",
    apple: "/lovelydent-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="az" className={`${dmSans.variable} ${instrumentSerif.variable}`}>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
