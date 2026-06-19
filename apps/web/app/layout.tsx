import type { Metadata } from "next";

import "./globals.css";
import "./lovelydent.css";
import { ThemeProvider } from "../components/ThemeProvider";

export const metadata: Metadata = {
  title: "LovelyDent — Klinik idarəetmə sistemi",
  description: "Xəstəxana qeydiyyatı və onlayn randevu platforması"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="az">
      <body>
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
