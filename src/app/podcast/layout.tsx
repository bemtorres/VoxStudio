import type { Metadata } from "next";
import { Nunito } from "next/font/google";

const nunito = Nunito({ subsets: ["latin"], weight: ["400", "600", "700", "800"] });

export const metadata: Metadata = {
  title: "Podcast | VoxStudio",
  description: "Crea episodios de podcast con diálogos entre personajes",
};

export default function PodcastLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <div className={nunito.className}>{children}</div>;
}
