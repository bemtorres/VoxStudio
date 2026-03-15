import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "VoxStudio - Personajes con voces IA",
  description: "Plataforma para crear personajes con voces generadas por IA. Diseña identidades, personalidad y convierte texto en audio realista.",
  icons: {
    icon: "/favicon.svg",
    apple: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className={`${inter.className} bg-[#0f0f0f] text-[#f5f5f5]`}>
        {children}
      </body>
    </html>
  );
}
