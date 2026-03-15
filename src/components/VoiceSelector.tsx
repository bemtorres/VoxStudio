'use client';

import { Voice } from '@/types';
import { useState, useEffect, useCallback, useRef } from 'react';

interface VoiceSelectorProps {
  selectedVoiceId: string;
  onSelectVoice: (voiceId: string) => void;
  compact?: boolean;
  /** Filtros externos (para uso en modal) */
  externalFilter?: { is_free?: string };
}

export default function VoiceSelector({ selectedVoiceId, onSelectVoice, compact, externalFilter }: VoiceSelectorProps) {
  const [voices, setVoices] = useState<Voice[]>([]);
  const [loading, setLoading] = useState(true);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [loadingSampleId, setLoadingSampleId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [filter, setFilter] = useState({
    is_free: externalFilter?.is_free ?? '',
    gender: '',
    language: '',
  });

  const loadVoices = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      const f = externalFilter
        ? { ...filter, is_free: externalFilter.is_free ?? filter.is_free }
        : filter;
      if (f.is_free) params.set('is_free', f.is_free);
      if (f.gender) params.set('gender', f.gender);
      if (f.language) params.set('language', f.language);

      const res = await fetch(`/api/voices?${params}`);
      const data = await res.json();
      setVoices(data);
    } catch (error) {
      console.error('Failed to load voices:', error);
    }
    setLoading(false);
  }, [filter, externalFilter]);

  useEffect(() => {
    let isMounted = true;
    if (isMounted) {
      loadVoices();
    }
    return () => { isMounted = false; };
  }, [loadVoices]);

  const playSample = useCallback(async (voiceId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (playingId === voiceId) {
      audioRef.current?.pause();
      setPlayingId(null);
      return;
    }
    if (audioRef.current) {
      audioRef.current.pause();
    }
    setLoadingSampleId(voiceId);
    try {
      const audio = new Audio(`/api/voices/sample/${voiceId}`);
      audioRef.current = audio;
      audio.onended = () => {
        setPlayingId(null);
        setLoadingSampleId(null);
      };
      audio.onerror = () => {
        setPlayingId(null);
        setLoadingSampleId(null);
      };
      await audio.play();
      setPlayingId(voiceId);
    } catch {
      setPlayingId(null);
      setLoadingSampleId(null);
    } finally {
      setLoadingSampleId(null);
    }
  }, [playingId]);

  return (
    <div className={compact ? 'space-y-4' : 'space-y-8'}>
      {!compact && (
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h3 className="text-2xl font-black text-text-primary tracking-tight">Voz del Personaje</h3>
            <p className="text-sm text-text-secondary mt-1">Selecciona el tono y la personalidad auditiva.</p>
          </div>
          
          <div className="flex flex-wrap gap-3">
          <select
            value={filter.is_free}
            onChange={(e) => setFilter(f => ({ ...f, is_free: e.target.value }))}
            className="px-4 py-2 bg-surface-elevated border border-border rounded-xl text-text-primary text-xs font-semibold focus:outline-none focus:border-primary transition-all"
          >
            <option value="">Todos los Precios</option>
            <option value="true">Gratis</option>
            <option value="false">Premium</option>
          </select>
          
          <select
            value={filter.gender}
            onChange={(e) => setFilter(f => ({ ...f, gender: e.target.value }))}
            className="px-4 py-2 bg-surface-elevated border border-border rounded-xl text-text-primary text-xs font-semibold focus:outline-none focus:border-primary transition-all"
          >
            <option value="">Géneros</option>
            <option value="male">Masculino</option>
            <option value="female">Femenino</option>
            <option value="neutral">Neutro</option>
          </select>

          <select
            value={filter.language}
            onChange={(e) => setFilter(f => ({ ...f, language: e.target.value }))}
            className="px-4 py-2 bg-surface-elevated border border-border rounded-xl text-text-primary text-xs font-semibold focus:outline-none focus:border-primary transition-all"
          >
            <option value="">Idiomas</option>
            <option value="en">Inglés</option>
            <option value="multi">Multilingüe</option>
          </select>
        </div>
      </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-surface/30 rounded-3xl border border-dashed border-border">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-text-secondary text-sm font-medium">Buscando voces...</p>
        </div>
      ) : (
        <div className={`grid gap-2 ${compact ? 'grid-cols-4 sm:grid-cols-5' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4'}`}>
          {voices.map((voice) => (
            <div
              key={voice.id}
              role="button"
              tabIndex={0}
              onClick={() => onSelectVoice(voice.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelectVoice(voice.id);
                }
              }}
              className={`group relative text-left rounded-xl border transition-all duration-300 cursor-pointer ${
                compact ? 'p-2.5' : 'p-5 rounded-2xl'
              } ${
                selectedVoiceId === voice.id
                  ? 'bg-primary border-primary shadow-lg shadow-primary/20'
                  : 'bg-surface-elevated/50 border-border hover:border-primary/50 hover:bg-surface-elevated'
              }`}
            >
              <div className={`flex items-center gap-2 ${compact ? '' : 'mb-3'}`}>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    playSample(voice.id, e);
                  }}
                  title="Reproducir muestra de voz"
                  className={`shrink-0 rounded-lg ${compact ? 'p-1.5' : 'p-2'} ${selectedVoiceId === voice.id ? 'bg-white/20 hover:bg-white/30' : 'bg-primary/10 text-primary hover:bg-primary/20'} focus:outline-none focus:ring-2 focus:ring-primary/50`}
                >
                  {loadingSampleId === voice.id ? (
                    <svg className={`${compact ? 'w-3.5 h-3.5' : 'w-5 h-5'} animate-spin`} fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  ) : playingId === voice.id ? (
                    <svg className={compact ? 'w-3.5 h-3.5' : 'w-5 h-5'} fill="currentColor" viewBox="0 0 24 24" title="Pausar">
                      <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                    </svg>
                  ) : (
                    <svg className={compact ? 'w-3.5 h-3.5' : 'w-5 h-5'} fill="currentColor" viewBox="0 0 24 24" title="Escuchar muestra">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  )}
                </button>
                <div className="min-w-0 flex-1">
                  <div className={`font-bold truncate ${compact ? 'text-xs' : 'text-sm'} ${selectedVoiceId === voice.id ? 'text-white' : 'text-text-primary'}`}>
                    {voice.name}
                  </div>
                  <div className={`truncate ${compact ? 'text-[10px]' : 'text-[11px]'} font-medium opacity-70 ${selectedVoiceId === voice.id ? 'text-white' : 'text-text-secondary'}`}>
                    {voice.gender}
                  </div>
                </div>
              </div>

              {selectedVoiceId === voice.id && !compact && (
                <div className="absolute top-2 right-2">
                  <div className="w-2 h-2 bg-white rounded-full animate-ping"></div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      
      {voices.length === 0 && !loading && (
        <div className="text-center py-12 bg-surface/20 rounded-3xl border border-dashed border-border/50">
          <p className="text-text-secondary text-sm">No se encontraron voces con estos filtros.</p>
        </div>
      )}
    </div>
  );
}

