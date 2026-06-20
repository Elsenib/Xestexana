import type { Metadata } from "next";

import "./globals.css";
import "./lovelydent.css";
import "./workspace.css";
import "./clinical.css";
import { ThemeProvider } from "../components/ThemeProvider";

export const metadata: Metadata = {
  title: "LovelyDent — Klinik idarəetmə sistemi",
  description: "Dental klinika üçün qəbul, klinik qeyd, kassa və idarəetmə platforması",
  icons: {
    icon: "/lovelydent-icon.png",
    shortcut: "/lovelydent-icon.png",
    apple: "/lovelydent-icon.png"
  }
};

export default function RootLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="az">
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
