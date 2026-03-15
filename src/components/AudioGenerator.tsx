'use client';

import { useState } from 'react';
import { formatCostUsd } from '@/lib/format';

interface AudioGeneratorProps {
  voiceId: string;
  characterName: string;
}

export default function AudioGenerator({ voiceId, characterName }: AudioGeneratorProps) {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [usage, setUsage] = useState<{ characters: number; estimatedCostUsd: number } | null>(null);

  const generateAudio = async () => {
    if (!text.trim() || !voiceId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const res = await fetch('/api/voices/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voice_id: voiceId, text }),
      });
      
      const data = await res.json();
      
      if (data.audio) {
        const audioBlob = Uint8Array.from(atob(data.audio), c => c.charCodeAt(0));
        const blob = new Blob([audioBlob], { type: 'audio/mp3' });
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        setUsage(data.usage ? { characters: data.usage.characters, estimatedCostUsd: data.usage.estimatedCostUsd } : null);
      } else if (data.error) {
        setError(data.error);
      }
    } catch {
      setError('Error al generar audio');
    }
    
    setLoading(false);
  };

  if (!voiceId) {
    return (
      <div className="p-12 text-center bg-surface/30 rounded-3xl border border-dashed border-border group transition-all hover:bg-surface/50">
        <div className="w-16 h-16 mx-auto mb-4 bg-surface rounded-2xl flex items-center justify-center text-text-secondary opacity-50 group-hover:scale-110 transition-transform">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
          </svg>
        </div>
        <h4 className="text-lg font-bold text-text-primary">Generador de Audio</h4>
        <p className="text-sm text-text-secondary mt-1 max-w-xs mx-auto">
          Primero selecciona una voz en la sección superior para que {characterName || 'el personaje'} pueda hablar.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-top-4 duration-500">
      <div>
        <h3 className="text-2xl font-black text-text-primary tracking-tight">Vocalizador</h3>
        <p className="text-sm text-text-secondary mt-1">Transforma texto en audio con la voz seleccionada.</p>
      </div>

      <div className="bg-surface-elevated/30 rounded-3xl border border-border p-8 space-y-6 shadow-premium">
        <div>
          <label className="block text-[11px] font-bold text-text-secondary mb-3 uppercase tracking-widest opacity-80">
            Contenido del Mensaje
          </label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={`¿Qué quieres que ${characterName || 'el personaje'} diga hoy?`}
            rows={4}
            className="w-full px-5 py-4 bg-surface-elevated border border-border rounded-2xl text-text-primary text-base focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-zinc-700 resize-none shadow-inner"
          />
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-4">
          <button
            onClick={generateAudio}
            disabled={loading || !text.trim()}
            className="w-full sm:flex-1 py-4 px-8 gradient-primary hover:opacity-90 disabled:bg-surface-elevated disabled:from-zinc-800 disabled:to-zinc-800 disabled:text-zinc-600 text-white rounded-2xl text-base font-bold transition-all shadow-xl shadow-primary/20 transform active:scale-[0.98] flex items-center justify-center gap-3"
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                Sintetizando...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Generar Audio
              </>
            )}
          </button>

          {audioUrl && (
            <a
              href={audioUrl}
              download={`${characterName || 'voz'}.mp3`}
              className="w-full sm:w-auto p-4 bg-surface border border-border text-text-primary rounded-2xl hover:bg-surface-elevated transition-colors shadow-lg flex items-center justify-center"
              title="Descargar MP3"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            </a>
          )}
        </div>

        {error && (
          <div className="p-4 bg-accent-red/10 border border-accent-red/20 rounded-2xl flex items-center gap-3">
            <svg className="w-5 h-5 text-accent-red" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-accent-red text-sm font-medium">{error}</p>
          </div>
        )}

        {audioUrl && (
          <div className="pt-6 animate-in slide-in-from-bottom-2 duration-500 space-y-3">
            <div className="p-4 bg-surface rounded-2xl border border-border shadow-inner">
              <audio controls className="w-full h-10 accent-primary" src={audioUrl}>
                Tu navegador no soporta audio
              </audio>
            </div>
            {usage && (
              <p className="text-xs text-text-secondary">
                {usage.characters} caracteres procesados · Coste estimado: {formatCostUsd(usage.estimatedCostUsd)} USD
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

