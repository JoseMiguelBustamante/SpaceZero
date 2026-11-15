import type { Metadata } from "next";
import "./globals.css";
import "./world.css";
import "./kids.css";
export const metadata: Metadata = {
  title: "MISIÓN RESCATE — Espejo Marciano",
  description:
    "Explora islas mágicas de Bolivia y Marte con Chispa. Aprende ciencia con datos reales de NASA.",
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
