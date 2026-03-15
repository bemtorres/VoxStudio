import type { Metadata } from "next";
import { Nunito } from "next/font/google";
import "../globals.css";

const nunito = Nunito({ subsets: ["latin"], weight: ["400", "600", "700", "800"] });

export const metadata: Metadata = {
  title: "Panel Admin — VoxStudio",
  description: "Panel de administración con selector de secciones",
};

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className={`${nunito.className} min-h-screen w-full bg-gradient-to-br from-[#fdf2f8] via-[#e0e7ff] to-[#ecfdf5] text-slate-700 antialiased`}>
      {children}
    </div>
  );
}
