import Link from 'next/link';

export default function InicioPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-[#e8f4f4] to-[#f0f9ff] text-[#373D48]">
      <header className="h-16 px-4 md:px-6 flex items-center justify-between border-b border-[#29B6B6]/20 bg-white/80">
        <Link href="/" className="flex items-center gap-3">
          <img src="/VoxStudioLogo.png" alt="VoxStudio" className="w-9 h-9 object-contain" />
          <span className="text-lg font-extrabold"><span className="text-[#373D48]">Vox</span><span className="text-[#29B6B6]">Studio</span></span>
        </Link>
        <nav className="flex items-center gap-4">
          <Link href="/login" className="text-sm font-semibold text-[#29B6B6] hover:underline">
            Iniciar sesión
          </Link>
          <Link
            href="/personajes"
            className="px-4 py-2 rounded-xl text-sm font-semibold bg-[#29B6B6] text-white hover:bg-[#34d1d1] transition-colors"
          >
            Empezar
          </Link>
        </nav>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-16 md:py-24">
        <div className="text-center mb-16">
          <img src="/VoxStudio.png" alt="VoxStudio" className="w-64 mx-auto mb-8" />
          <h1 className="text-4xl md:text-5xl font-extrabold text-[#373D48] mb-4">
            Crea personajes con voces de IA
          </h1>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto">
            VoxStudio es una plataforma para creadores de contenido, chatbots y VTubers. 
            Diseña identidades únicas, define personalidad y convierte texto en audio realista.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <Link href="/personajes" className="p-6 rounded-2xl bg-white/90 border border-[#29B6B6]/20 shadow-lg hover:border-[#29B6B6]/40 hover:shadow-xl transition-all">
            <div className="w-12 h-12 rounded-xl bg-[#29B6B6]/20 flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-[#29B6B6]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <h2 className="text-lg font-bold text-slate-800 mb-2">Personajes</h2>
            <p className="text-sm text-slate-600">
              Crea y gestiona personajes con voces personalizadas. Carpetas de audios, instrucciones de tono y emoción.
            </p>
          </Link>
          <Link href="/podcast" className="p-6 rounded-2xl bg-white/90 border border-[#29B6B6]/20 shadow-lg hover:border-[#29B6B6]/40 hover:shadow-xl transition-all">
            <div className="w-12 h-12 rounded-xl bg-[#6B2D8C]/20 flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-[#6B2D8C]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 013-3V4a3 3 0 00-3 3v1a3 3 0 013 3z" />
              </svg>
            </div>
            <h2 className="text-lg font-bold text-slate-800 mb-2">Podcast</h2>
            <p className="text-sm text-slate-600">
              Crea episodios con diálogos entre personajes. Sintetiza voces, usa audios existentes y exporta.
            </p>
          </Link>
          <div className="p-6 rounded-2xl bg-white/90 border border-[#29B6B6]/20 shadow-lg">
            <div className="w-12 h-12 rounded-xl bg-[#3B59AB]/20 flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-[#3B59AB]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
              </svg>
            </div>
            <h2 className="text-lg font-bold text-slate-800 mb-2">Voces IA</h2>
            <p className="text-sm text-slate-600">
              OpenAI TTS con múltiples voces. Instrucciones para tono, emoción y ritmo personalizados.
            </p>
          </div>
        </div>

        <div className="text-center">
          <Link
            href="/login"
            className="inline-block px-8 py-4 rounded-2xl text-lg font-bold bg-[#29B6B6] text-white hover:bg-[#34d1d1] transition-colors shadow-lg shadow-[#29B6B6]/30"
          >
            Iniciar sesión
          </Link>
          <p className="mt-4 text-sm text-slate-500">
            ¿No tienes cuenta? <Link href="/personajes" className="text-[#29B6B6] font-semibold hover:underline">Empieza gratis</Link>
          </p>
        </div>
      </main>

      <footer className="py-6 text-center text-xs text-slate-500 border-t border-[#29B6B6]/10 bg-white/50 mt-16">
        Desarrollado para creadores de contenido, chatbots y VTubers. Creado por{' '}
        <a href="https://github.com/bemtorres" target="_blank" rel="noopener noreferrer" className="text-[#29B6B6] hover:underline font-semibold">
          bemtorres
        </a>
      </footer>
    </div>
  );
}
