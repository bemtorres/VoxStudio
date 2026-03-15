'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

type Seccion = 'api' | 'gastos' | 'reportes';

const SECCIONES: { id: Seccion; title: string; subtitle: string }[] = [
  { id: 'api', title: 'Configuración API', subtitle: 'Estado de OpenAI y variables de entorno' },
  { id: 'gastos', title: 'Gastos', subtitle: 'Uso y costes de las peticiones a la API' },
  { id: 'reportes', title: 'Reportes', subtitle: 'Historial de uso y exportación' },
];

export default function AdminPage() {
  const [seccion, setSeccion] = useState<Seccion>('api');
  const [apiStatus, setApiStatus] = useState<{ openai_configured: boolean } | null>(null);
  const [usageSummary, setUsageSummary] = useState<{
    total_cost: number;
    total_characters: number;
    total_calls: number;
    byType: Array<{ type: string; model: string; cost: number; chars: number; calls: number }>;
  } | null>(null);
  const [usageLog, setUsageLog] = useState<Array<Record<string, unknown>>>([]);
  const current = SECCIONES.find((s) => s.id === seccion) ?? SECCIONES[0];

  useEffect(() => {
    fetch('/api/admin/status')
      .then((r) => r.json())
      .then(setApiStatus)
      .catch(() => setApiStatus(null));
  }, []);

  useEffect(() => {
    fetch('/api/admin/usage')
      .then((r) => r.json())
      .then(setUsageSummary)
      .catch(() => setUsageSummary(null));
    fetch('/api/admin/usage?mode=log&limit=50')
      .then((r) => r.json())
      .then(setUsageLog)
      .catch(() => setUsageLog([]));
  }, []);

  return (
    <div className="flex min-h-screen">
      {/* Sidebar compacto */}
      <aside className="hidden lg:flex w-20 xl:w-56 flex-col items-center xl:items-start py-8 px-4 border-r border-[#29B6B6]/20 bg-white/60 backdrop-blur-sm">
        <Link href="/" className="flex items-center gap-2 mb-10">
          <img src="/VoxStudioLogo.png" alt="VoxStudio" className="w-10 h-10 object-contain" />
          <span className="text-xl font-extrabold text-[#373D48] hidden xl:inline"><span className="text-[#373D48]">Vox</span><span className="text-[#29B6B6]">Studio</span></span>
        </Link>
        <nav className="flex flex-col gap-1 w-full">
          <Link
            href="/admin"
            className="flex items-center justify-center xl:justify-start gap-3 px-4 py-3 rounded-2xl bg-[#29B6B6]/20 text-[#29B6B6] font-semibold"
          >
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6z" />
            </svg>
            <span className="hidden xl:inline">Selector</span>
          </Link>
          <Link
            href="/"
            className="flex items-center justify-center xl:justify-start gap-3 px-4 py-3 rounded-2xl text-slate-500 hover:bg-[#29B6B6]/10 hover:text-[#29B6B6] transition-colors"
          >
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span className="hidden xl:inline">Editor</span>
          </Link>
        </nav>
        <div className="mt-auto pt-8">
          <div className="flex items-center gap-3 px-3 py-2 rounded-2xl bg-[#29B6B6]/15">
            <img src="https://ui-avatars.com/api/?name=BV&background=C4B5FD&color=fff&size=80" alt="Avatar" className="w-9 h-9 rounded-xl" />
            <div className="hidden xl:block">
              <p className="text-xs font-bold text-slate-700">Admin</p>
              <p className="text-[10px] text-slate-500">VoxStudio</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Contenido principal */}
      <main className="flex-1 p-6 md:p-8 lg:p-10 overflow-auto">
        <header className="mb-8">
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-800">Elige una sección</h1>
          <p className="text-sm text-slate-500 mt-1">Selecciona una tarjeta para ver su contenido</p>
        </header>

        <div className="flex flex-col xl:flex-row gap-8 xl:gap-10">
          {/* Grid de personajes (secciones) */}
          <div className="xl:w-[55%] grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-5 content-start">
            {[
              { id: 'api' as Seccion, icon: 'key', label: 'Config. API', stat: apiStatus?.openai_configured ? 'Configurada' : 'Pendiente', bg: 'bg-[#3B59AB]/20', iconColor: 'text-[#3B59AB]' },
              { id: 'gastos' as Seccion, icon: 'money', label: 'Gastos', stat: usageSummary ? `$${usageSummary.total_cost.toFixed(4)}` : '—', bg: 'bg-[#29B6B6]/20', iconColor: 'text-[#29B6B6]' },
              { id: 'reportes' as Seccion, icon: 'doc', label: 'Reportes', stat: usageSummary ? `${usageSummary.total_calls} peticiones` : '—', bg: 'bg-amber-100', iconColor: 'text-amber-600' },
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setSeccion(item.id)}
                className={`rounded-3xl bg-white/90 border-2 shadow-lg p-5 flex flex-col items-center text-left overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl ${
                  seccion === item.id
                    ? 'border-[#29B6B6] admin-card-selected'
                    : 'border-transparent hover:border-[#29B6B6]/30 shadow-md'
                }`}
              >
                <div className={`w-14 h-14 rounded-2xl ${item.bg} flex items-center justify-center mb-3`}>
                  {item.icon === 'key' && (
                    <svg className={`w-7 h-7 ${item.iconColor}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                    </svg>
                  )}
                  {item.icon === 'money' && (
                    <svg className={`w-7 h-7 ${item.iconColor}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}
                  {item.icon === 'doc' && (
                    <svg className={`w-7 h-7 ${item.iconColor}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  )}
                </div>
                <span className="font-bold text-slate-700 text-sm">{item.label}</span>
                <span className="text-xs text-slate-400 mt-0.5">{item.stat}</span>
              </button>
            ))}
          </div>

          {/* Panel de detalle */}
          <div className="xl:w-[45%] flex-shrink-0">
            <div className="min-h-[420px] rounded-[2rem] bg-white/90 border-2 border-[#29B6B6]/20 shadow-xl overflow-hidden sticky top-6">
              <div className="px-6 py-4 bg-gradient-to-r from-[#6B2D8C]/10 via-[#3B59AB]/10 to-[#29B6B6]/10 border-b border-[#29B6B6]/20">
                <h2 className="text-xl font-extrabold text-slate-800">{current.title}</h2>
                <p className="text-xs text-slate-500 mt-0.5">{current.subtitle}</p>
              </div>

              <div className="p-6 overflow-y-auto max-h-[calc(100vh-280px)]">
                {seccion === 'api' && (
                  <div className="space-y-5">
                    <div className={`flex items-center justify-between p-4 rounded-2xl border ${
                      apiStatus?.openai_configured
                        ? 'bg-emerald-50/80 border-emerald-200'
                        : 'bg-amber-50/80 border-amber-200'
                    }`}>
                      <div>
                        <p className="text-lg font-black text-slate-800">
                          {apiStatus?.openai_configured ? 'OpenAI configurada' : 'OpenAI no configurada'}
                        </p>
                        <p className="text-xs font-semibold text-slate-600 mt-0.5">
                          {apiStatus?.openai_configured
                            ? 'La API key está definida en .env'
                            : 'Añade OPENAI_API_KEY en el archivo .env'}
                        </p>
                      </div>
                      <span className={`px-3 py-1 text-xs font-bold rounded-xl ${
                        apiStatus?.openai_configured
                          ? 'bg-emerald-200/60 text-emerald-700'
                          : 'bg-amber-200/60 text-amber-700'
                      }`}>
                        {apiStatus?.openai_configured ? 'OK' : 'Pendiente'}
                      </span>
                    </div>
                    <div className="rounded-xl bg-slate-50 border border-slate-200 p-4">
                      <p className="text-xs font-bold text-slate-600 mb-2">Configuración en .env</p>
                      <pre className="text-xs text-slate-700 font-mono overflow-x-auto">
{`OPENAI_API_KEY=sk-...
NEXT_PUBLIC_APP_URL=http://localhost:3000`}
                      </pre>
                      <p className="text-xs text-slate-500 mt-2">
                        La clave se usa para TTS (gpt-4o-mini-tts) y generación de instrucciones (gpt-4o-mini).
                      </p>
                    </div>
                    <Link href="/" className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#3B59AB]/20 text-[#3B59AB] rounded-xl text-sm font-bold hover:bg-[#3B59AB]/30 transition-colors">
                      Ir al editor
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                    </Link>
                  </div>
                )}

                {seccion === 'gastos' && (
                  <div className="space-y-5">
                    <div className="flex items-center justify-between p-4 rounded-2xl bg-[#29B6B6]/10 border border-[#29B6B6]/20">
                      <div>
                        <p className="text-2xl font-black text-slate-800">
                          ${usageSummary?.total_cost?.toFixed(4) ?? '0.0000'}
                        </p>
                        <p className="text-xs font-semibold text-[#29B6B6]">Coste total (USD)</p>
                      </div>
                      <span className="px-3 py-1 bg-[#29B6B6]/30 text-[#29B6B6] text-xs font-bold rounded-xl">
                        {usageSummary?.total_calls ?? 0} peticiones
                      </span>
                    </div>
                    <div className="space-y-2">
                      <p className="text-xs font-bold text-slate-600">Por tipo de uso</p>
                      {(usageSummary?.byType ?? []).map((row: { type: string; model: string; cost: number; chars: number; calls: number }) => (
                        <div key={`${row.type}-${row.model}`} className="flex justify-between items-center p-3 rounded-xl bg-slate-50 border border-slate-100">
                          <span className="text-sm font-medium text-slate-700">{row.type} · {row.model}</span>
                          <span className="text-xs text-slate-600">${row.cost.toFixed(4)} · {row.calls} llamadas</span>
                        </div>
                      ))}
                      {(!usageSummary?.byType || usageSummary.byType.length === 0) && (
                        <p className="text-sm text-slate-500 py-4">Aún no hay registros de uso.</p>
                      )}
                    </div>
                    <p className="text-xs text-slate-500">
                      Total caracteres procesados: {(usageSummary?.total_characters ?? 0).toLocaleString()}
                    </p>
                  </div>
                )}

                {seccion === 'reportes' && (
                  <div className="space-y-5">
                    <div className="flex items-center justify-between p-4 rounded-2xl bg-amber-50/80 border border-amber-200">
                      <div>
                        <p className="text-2xl font-black text-slate-800">{usageSummary?.total_calls ?? 0}</p>
                        <p className="text-xs font-semibold text-amber-700">Peticiones registradas</p>
                      </div>
                      <a
                        href="/api/admin/report?format=csv"
                        download="voxstudio-uso-api.csv"
                        className="inline-flex items-center gap-2 px-4 py-2.5 bg-amber-200/60 text-amber-800 rounded-xl text-sm font-bold hover:bg-amber-300/60 transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                        Exportar CSV
                      </a>
                    </div>
                    <p className="text-sm text-slate-600">Historial de todas las peticiones a la API (TTS e instrucciones).</p>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {usageLog.map((row: Record<string, unknown>) => (
                        <div key={String(row.id)} className="flex justify-between items-center gap-2 p-2 rounded-lg bg-slate-50 border border-slate-100 text-xs">
                          <span className="font-medium text-slate-700 truncate">
                            {String(row.type)} · {String(row.character_name || '—')}
                          </span>
                          <span className="text-slate-500 shrink-0">
                            ${Number(row.cost_usd).toFixed(4)} · {new Date(String(row.created_at)).toLocaleString('es')}
                          </span>
                        </div>
                      ))}
                      {usageLog.length === 0 && (
                        <p className="text-sm text-slate-500 py-4">No hay registros aún.</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
