'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface AppLayoutProps {
  children: React.ReactNode;
  headerActions?: React.ReactNode;
}

export default function AppLayout({ children, headerActions }: AppLayoutProps) {
  const pathname = usePathname();

  const navItems = [
    { href: '/personajes', label: 'Personajes', icon: 'users' },
    { href: '/podcast', label: 'Podcast', icon: 'podcast' },
  ];

  const NavIcon = ({ name }: { name: string }) => {
    if (name === 'users') {
      return (
        <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      );
    }
    if (name === 'podcast') {
      return (
        <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 013-3V4a3 3 0 00-3 3v1a3 3 0 013 3z" />
        </svg>
      );
    }
    return null;
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 via-[#e8f4f4] to-[#f0f9ff] text-[#373D48]">
      <header className="fixed top-0 left-0 right-0 z-50 h-16 px-4 md:px-6 flex items-center justify-between bg-white/95 backdrop-blur-md border-b border-[#29B6B6]/20">
        <Link href="/" className="flex items-center gap-3 shrink-0">
          <img src="/VoxStudioLogo.png" alt="VoxStudio" className="w-9 h-9 object-contain" />
          <span className="text-lg font-extrabold hidden sm:inline"><span className="text-[#373D48]">Vox</span><span className="text-[#29B6B6]">Studio</span></span>
        </Link>

        <nav className="flex items-center gap-1 md:gap-2">
          {navItems.map(({ href, label, icon }) => (
            <Link
              key={href}
              href={href}
              className={`px-3 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 ${
                pathname === href
                  ? 'bg-[#29B6B6]/20 text-[#29B6B6]'
                  : 'text-slate-500 hover:bg-[#29B6B6]/10 hover:text-[#373D48]'
              }`}
            >
              {icon && <NavIcon name={icon} />}
              {label}
            </Link>
          ))}
          <Link
            href="/admin"
            className="p-2 rounded-xl text-slate-500 hover:bg-[#29B6B6]/10 hover:text-[#29B6B6] transition-colors"
            title="Admin"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </Link>
          {headerActions}
        </nav>
      </header>

      <div className="flex-1 pt-16">
        {children}
      </div>

      <footer className="py-3 text-center text-xs text-slate-500 border-t border-[#29B6B6]/10 bg-white/50">
        Desarrollado para creadores de contenido, chatbots y VTubers. Creado por{' '}
        <a href="https://github.com/bemtorres" target="_blank" rel="noopener noreferrer" className="text-[#29B6B6] hover:underline font-semibold">
          bemtorres
        </a>
      </footer>
    </div>
  );
}
