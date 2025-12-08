import type { Metadata } from "next";
import { AppThemeProvider } from "@/components/AppThemeProvider";
import "./globals.css";

import ConditionalNavbar from "@/components/ConditionalNavbar";

export const metadata: Metadata = {
  title: "Fanta Claus",
  description: "Gioco di Natale aziendale",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="it">
      <body>
        <AppThemeProvider>
          {/* Navbar solo se NON siamo in home */}
          <ConditionalNavbar />
          {children}
        </AppThemeProvider>
      </body>
    </html>
  );
}
