import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Reviva",
  description: "Sistema de gestão Reviva",
  viewport: "width=device-width, initial-scale=1, maximum-scale=1",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
