import type { Metadata } from "next";
import { Nunito } from "next/font/google";

const nunito = Nunito({ subsets: ["latin"], weight: ["400", "600", "700", "800"] });

export const metadata: Metadata = {
  title: "Personajes | VoxStudio",
  description: "Gestiona personajes y voces generadas por IA",
};

export default function PersonajesLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <div className={nunito.className}>{children}</div>;
}
