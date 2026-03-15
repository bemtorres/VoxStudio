'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import SoundWavesHero from '@/components/SoundWavesHero';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    // Placeholder: por ahora redirige sin validar (sin backend de auth)
    await new Promise(r => setTimeout(r, 500));
    router.push('/personajes');
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-[#e8f4f4] to-[#f0f9ff] text-[#373D48] flex flex-col relative">
      <SoundWavesHero compact />
      <header className="relative z-10 h-16 px-4 md:px-6 flex items-center justify-between border-b border-[#29B6B6]/20 bg-white/80">
        <Link href="/" className="flex items-center gap-3">
          <img src="/VoxStudioLogo.png" alt="VoxStudio" className="w-9 h-9 object-contain" />
          <span className="text-lg font-extrabold"><span className="text-[#373D48]">Vox</span><span className="text-[#29B6B6]">Studio</span></span>
        </Link>
        <Link href="/" className="text-sm font-semibold text-slate-600 hover:text-[#29B6B6]">
          Volver al inicio
        </Link>
      </header>

      <main className="relative z-10 flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="bg-white/90 rounded-2xl border-2 border-[#29B6B6]/20 shadow-xl p-8">
            <h1 className="text-2xl font-extrabold text-slate-800 mb-2">Iniciar sesión</h1>
            <p className="text-sm text-slate-500 mb-6">
              Accede a tu cuenta de VoxStudio para gestionar personajes y podcasts.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-600 mb-1">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@email.com"
                  className="w-full px-4 py-3 rounded-xl border border-[#29B6B6]/30 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#29B6B6]/30 focus:border-[#29B6B6]"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-600 mb-1">Contraseña</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 rounded-xl border border-[#29B6B6]/30 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#29B6B6]/30 focus:border-[#29B6B6]"
                />
              </div>
              {error && (
                <p className="text-sm text-red-500">{error}</p>
              )}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl font-bold bg-[#29B6B6] text-white hover:bg-[#34d1d1] disabled:opacity-70 transition-colors"
              >
                {loading ? 'Entrando...' : 'Entrar'}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-slate-500">
              Por ahora el login es de demostración. Al hacer clic en &quot;Entrar&quot; irás a Personajes.
            </p>
          </div>

          <p className="mt-6 text-center text-sm text-slate-500">
            <Link href="/" className="text-[#29B6B6] font-semibold hover:underline">← Volver al inicio</Link>
          </p>
        </div>
      </main>
    </div>
  );
}
