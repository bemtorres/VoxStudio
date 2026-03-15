import type { Metadata } from "next";
import { Nunito } from "next/font/google";

const nunito = Nunito({ subsets: ["latin"], weight: ["400", "600", "700", "800"] });

export default function GameLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className={`game-layout ${nunito.className} min-h-screen w-full bg-gradient-to-br from-slate-50 via-[#e8f4f4] to-[#f0f9ff] text-[#373D48] antialiased`}>
      {children}
    </div>
  );
}
