'use client';

import { useState, useEffect, useCallback } from 'react';
import { Character } from '@/types';
import AudioPlayerBar, { type NowPlaying } from '@/components/AudioPlayerBar';
import { getLanguageName } from '@/lib/voiceInstructions';
import PodcastTimelineEditor from '@/components/PodcastTimelineEditor';

type Episode = { id: number; title: string };
type CastMember = Character & { avatar_path?: string };
type Entry = {
  id: number;
  character_id: number;
  character_name: string;
  character_avatar_path?: string;
  character_voice_id?: string;
  character_voice_instructions?: string;
  text: string;
  position: number;
  audio_file_path?: string;
  voice_id?: string;
  voice_name?: string;
  language?: string;
  qualities?: string;
};

interface PodcastPanelProps {
  characters: Character[];
  currentPlaying: NowPlaying | null;
  onPlay: (item: NowPlaying) => void;
  onViewModeChange?: (mode: 'escaleta' | 'editor') => void;
}

export default function PodcastPanel({ characters, currentPlaying, onPlay, onViewModeChange }: PodcastPanelProps) {
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [selectedEpisodeId, setSelectedEpisodeId] = useState<number | null>(null);
  const [cast, setCast] = useState<CastMember[]>([]);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(false);
  const [synthesizingId, setSynthesizingId] = useState<number | null>(null);
  const [newEntryText, setNewEntryText] = useState('');
  const [newEntryCharId, setNewEntryCharId] = useState<number | null>(null);
  const [showAddEntry, setShowAddEntry] = useState(false);
  const [addMode, setAddMode] = useState<'text' | 'existing'>('text');
  const [audioLibrary, setAudioLibrary] = useState<Record<number, { folders: Array<{ id: number; name: string; audios: Array<{ id: string; text: string; url: string; file_path?: string }> }>; uncategorized: Array<{ id: string; text: string; url: string; file_path?: string }> }>>({});
  const [showAudioPicker, setShowAudioPicker] = useState(false);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [generateTheme, setGenerateTheme] = useState('');
  const [generateStyle, setGenerateStyle] = useState<string>('conversacional');
  const [generateDuration, setGenerateDuration] = useState(5);
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'escaleta' | 'editor'>('escaleta');
  const [showCastModal, setShowCastModal] = useState(false);

  const loadEpisodes = useCallback(async () => {
    try {
      const res = await fetch('/api/podcast/episodes');
      const data = await res.json();
      setEpisodes(Array.isArray(data) ? data : []);
      if (data?.length && !selectedEpisodeId) {
        setSelectedEpisodeId(data[0].id);
      }
    } catch {
      setEpisodes([]);
    }
  }, [selectedEpisodeId]);

  const loadCast = useCallback(async (epId: number) => {
    try {
      const res = await fetch(`/api/podcast/episodes/${epId}/cast`);
      const data = await res.json();
      setCast(Array.isArray(data) ? data : []);
    } catch {
      setCast([]);
    }
  }, []);

  const loadEntries = useCallback(async (epId: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/podcast/episodes/${epId}/entries`);
      const data = await res.json();
      setEntries(Array.isArray(data) ? data : []);
    } catch {
      setEntries([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadEpisodes();
  }, [loadEpisodes]);

  useEffect(() => {
    if (selectedEpisodeId) {
      loadCast(selectedEpisodeId);
      loadEntries(selectedEpisodeId);
    } else {
      setCast([]);
      setEntries([]);
    }
  }, [selectedEpisodeId, loadCast, loadEntries]);

  const handleCreateEpisode = async () => {
    try {
      const res = await fetch('/api/podcast/episodes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Nuevo episodio' }),
      });
      const ep = await res.json();
      if (ep?.id) {
        setEpisodes(prev => [{ id: ep.id, title: ep.title || 'Nuevo episodio' }, ...prev]);
        setSelectedEpisodeId(ep.id);
      }
    } catch {
      // ignore
    }
  };

  const handleAddToCast = async (charId: number) => {
    if (!selectedEpisodeId) return;
    try {
      await fetch(`/api/podcast/episodes/${selectedEpisodeId}/cast`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ character_id: charId }),
      });
      loadCast(selectedEpisodeId);
    } catch {
      // ignore
    }
  };

  const handleRemoveFromCast = async (charId: number) => {
    if (!selectedEpisodeId) return;
    try {
      await fetch(`/api/podcast/episodes/${selectedEpisodeId}/cast?character_id=${charId}`, { method: 'DELETE' });
      loadCast(selectedEpisodeId);
    } catch {
      // ignore
    }
  };

  const handleAddEntry = async (audioUrl?: string) => {
    if (!selectedEpisodeId || !newEntryCharId) return;
    const text = newEntryText.trim();
    if (!text && !audioUrl) return;
    try {
      const res = await fetch(`/api/podcast/episodes/${selectedEpisodeId}/entries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          character_id: newEntryCharId,
          text: text || '—',
          ...(audioUrl && { audio_url: audioUrl }),
        }),
      });
      const entry = await res.json();
      if (entry?.id) {
        setEntries(prev => [...prev, entry]);
        setNewEntryText('');
        setNewEntryCharId(null);
        setShowAddEntry(false);
        setShowAudioPicker(false);
      }
    } catch {
      // ignore
    }
  };

  const loadAudioLibrary = useCallback(async () => {
    if (!selectedEpisodeId || cast.length === 0) return;
    try {
      const ids = cast.map(c => c.id).join(',');
      const res = await fetch(`/api/podcast/audio-library?character_ids=${ids}`);
      const data = await res.json();
      setAudioLibrary(data || {});
    } catch {
      setAudioLibrary({});
    }
  }, [selectedEpisodeId, cast]);

  const handleSynthesize = async (entryId: number) => {
    if (!selectedEpisodeId) return;
    setSynthesizingId(entryId);
    try {
      const res = await fetch(`/api/podcast/episodes/${selectedEpisodeId}/entries/${entryId}/synthesize`, { method: 'POST' });
      const data = await res.json();
      if (data?.url) {
        loadEntries(selectedEpisodeId);
      }
    } catch {
      // ignore
    }
    setSynthesizingId(null);
  };

  const handleSynthesizeAll = async () => {
    const pending = entries.filter(e => !e.audio_file_path);
    for (const e of pending) {
      await handleSynthesize(e.id);
    }
  };

  const handleDeleteEntry = async (entryId: number) => {
    if (!selectedEpisodeId) return;
    try {
      await fetch(`/api/podcast/episodes/${selectedEpisodeId}/entries/${entryId}`, { method: 'DELETE' });
      setEntries(prev => prev.filter(e => e.id !== entryId));
    } catch {
      // ignore
    }
  };

  const handleDuplicateEntry = async (entry: Entry) => {
    if (!selectedEpisodeId) return;
    try {
      const res = await fetch(`/api/podcast/episodes/${selectedEpisodeId}/entries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          character_id: entry.character_id,
          text: entry.text,
          voice_id: entry.voice_id,
          voice_name: entry.voice_name,
          language: entry.language || 'es',
          qualities: entry.qualities,
        }),
      });
      const newEntry = await res.json();
      if (newEntry?.id) {
        setEntries(prev => [...prev, newEntry]);
      }
    } catch {
      // ignore
    }
  };

  const handleGenerateDialogue = async () => {
    if (!selectedEpisodeId || !generateTheme.trim() || cast.length === 0) return;
    setGenerating(true);
    setGenerateError(null);
    try {
      const res = await fetch('/api/podcast/generate-dialogue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          episode_id: selectedEpisodeId,
          theme: generateTheme.trim(),
          style: generateStyle,
          duration_minutes: generateDuration,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setGenerateError(data?.error || 'Error al generar');
        return;
      }
      setShowGenerateModal(false);
      setGenerateTheme('');
      loadEntries(selectedEpisodeId);
    } catch {
      setGenerateError('Error de conexión');
    }
    setGenerating(false);
  };

  const castIds = new Set(cast.map(c => c.id));
  const availableToAdd = characters.filter(c => !castIds.has(c.id));

  const castEpisodeSummary = selectedEpisodeId
    ? `${episodes.find(e => e.id === selectedEpisodeId)?.title ?? 'Episodio'} · ${cast.length} personaje${cast.length !== 1 ? 's' : ''}`
    : 'Elegir episodio y cast';

  const CastContent = () => (
    <>
      <div className="mb-4">
        <label className="block text-xs font-bold text-slate-500 mb-1">Episodio</label>
        <div className="flex gap-2">
          <select
            value={selectedEpisodeId ?? ''}
            onChange={(e) => setSelectedEpisodeId(e.target.value ? parseInt(e.target.value, 10) : null)}
            className="flex-1 px-3 py-2 rounded-xl border border-[#29B6B6]/30 bg-white text-sm"
          >
            <option value="">Seleccionar...</option>
            {episodes.map(ep => (
              <option key={ep.id} value={ep.id}>{ep.title}</option>
            ))}
          </select>
          <button
            onClick={handleCreateEpisode}
            className="p-2 rounded-xl bg-[#29B6B6]/20 text-[#29B6B6] hover:bg-[#29B6B6]/30"
            title="Nuevo episodio"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>
      </div>
      {selectedEpisodeId ? (
        <>
          <p className="text-xs font-semibold text-slate-600 mb-2">En el cast</p>
          {cast.length === 0 ? (
            <p className="text-xs text-slate-500 py-2">Añade personajes abajo</p>
          ) : (
            <div className="space-y-2 mb-4">
              {cast.map(char => (
                <div
                  key={char.id}
                  className="flex items-center gap-2 p-2 rounded-xl bg-[#6B2D8C]/10 border border-[#6B2D8C]/20"
                >
                  {(char as CastMember).avatar_path ? (
                    <img src={`/${(char as CastMember).avatar_path}`} alt="" className="w-8 h-8 rounded-lg object-cover" />
                  ) : (
                    <div className="w-8 h-8 rounded-lg bg-[#6B2D8C]/30 flex items-center justify-center text-white text-xs font-bold">
                      {char.name?.charAt(0) || '?'}
                    </div>
                  )}
                  <span className="flex-1 text-sm font-medium text-slate-700 truncate">{char.name || 'Sin nombre'}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveFromCast(char.id)}
                    className="p-1 text-slate-400 hover:text-red-500"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
          <p className="text-xs font-semibold text-slate-600 mb-2">Añadir al cast</p>
          {availableToAdd.length === 0 ? (
            <p className="text-xs text-slate-500">Todos los personajes están en el cast</p>
          ) : (
            <div className="space-y-1">
              {availableToAdd.map(char => (
                <button
                  key={char.id}
                  type="button"
                  onClick={() => handleAddToCast(char.id)}
                  className="w-full flex items-center gap-2 p-2 rounded-xl hover:bg-[#29B6B6]/10 text-left transition-colors"
                >
                  {(char as CastMember).avatar_path ? (
                    <img src={`/${(char as CastMember).avatar_path}`} alt="" className="w-8 h-8 rounded-lg object-cover" />
                  ) : (
                    <div className="w-8 h-8 rounded-lg bg-slate-200 flex items-center justify-center text-slate-600 text-xs font-bold">
                      {char.name?.charAt(0) || '?'}
                    </div>
                  )}
                  <span className="text-sm text-slate-700 truncate">{char.name || 'Sin nombre'}</span>
                  <span className="ml-auto text-[#29B6B6] text-xs">+</span>
                </button>
              ))}
            </div>
          )}
        </>
      ) : (
        <p className="text-sm text-slate-500 py-4">Crea o selecciona un episodio</p>
      )}
    </>
  );

  return (
    <div className="flex flex-1 min-w-0 min-h-0">
      {/* Panel izquierdo: solo en modo Escaleta */}
      {viewMode === 'escaleta' && (
        <aside className="w-[260px] md:w-[280px] shrink-0 flex flex-col border-r border-[#29B6B6]/20 bg-white/60">
          <div className="p-4 border-b border-[#29B6B6]/20">
            <h2 className="text-sm font-bold text-slate-700">Cast de Personajes</h2>
            <p className="text-xs text-slate-500 mt-0.5">Personajes disponibles</p>
          </div>
          <div className="flex-1 overflow-y-auto p-3 min-h-0">
            <CastContent />
          </div>
        </aside>
      )}

      {/* Panel central: Timeline de diálogo o Editor */}
      <main className="flex-1 min-w-0 flex flex-col overflow-hidden bg-white/40">
        <div className="p-4 border-b border-[#29B6B6]/20 shrink-0">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h2 className="text-lg font-bold text-slate-800">Timeline de Diálogo</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {viewMode === 'escaleta' ? 'Añade líneas, sintetiza y reproduce' : 'Editor con pistas y audio de fondo'}
              </p>
            </div>
            <div className="flex rounded-xl bg-slate-100 p-0.5">
              <button
                type="button"
                onClick={() => {
                  setViewMode('escaleta');
                  onViewModeChange?.('escaleta');
                }}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${viewMode === 'escaleta' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}
              >
                Escaleta
              </button>
              <button
                type="button"
                onClick={() => {
                  setViewMode('editor');
                  onViewModeChange?.('editor');
                }}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${viewMode === 'editor' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-600 hover:text-slate-800'}`}
              >
                Modo edición
              </button>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 mt-4">
            <button
              onClick={() => setShowAddEntry(true)}
              disabled={!selectedEpisodeId || cast.length === 0}
              className="px-4 py-2 rounded-xl text-sm font-semibold bg-[#29B6B6] text-white hover:bg-[#34d1d1] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Añadir línea
            </button>
            <button
              onClick={handleSynthesizeAll}
              disabled={!selectedEpisodeId || entries.filter(e => !e.audio_file_path).length === 0}
              className="px-4 py-2 rounded-xl text-sm font-semibold bg-[#3B59AB]/20 text-[#3B59AB] hover:bg-[#3B59AB]/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
              </svg>
              Sintetizar todo
            </button>
            <button
              onClick={() => { setShowGenerateModal(true); setGenerateError(null); }}
              disabled={!selectedEpisodeId || cast.length === 0}
              className="px-4 py-2 rounded-xl text-sm font-semibold bg-[#6B2D8C]/20 text-[#6B2D8C] hover:bg-[#6B2D8C]/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              Generar con IA
            </button>
          </div>
        </div>

        {viewMode === 'editor' ? (
          <>
            <div className="px-4 pb-2 shrink-0">
              <button
                type="button"
                onClick={() => setShowCastModal(true)}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200"
              >
                <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                {castEpisodeSummary}
              </button>
            </div>
            <div className="flex-1 min-h-[280px] p-4">
              {selectedEpisodeId && cast.length > 0 ? (
                <PodcastTimelineEditor
                  entries={entries}
                  cast={cast}
                  onPlayEntry={(entry) => {
                    if (entry.audio_file_path) {
                      onPlay({ url: `/${entry.audio_file_path}`, text: entry.text, characterName: entry.character_name });
                    }
                  }}
                />
              ) : (
                <div className="h-full flex flex-col items-center justify-center rounded-xl bg-slate-100 text-slate-500 text-sm gap-3">
                  <p>Elige episodio y personajes para el editor.</p>
                  <button
                    type="button"
                    onClick={() => setShowCastModal(true)}
                    className="px-4 py-2 rounded-xl bg-[#29B6B6]/20 text-[#29B6B6] font-semibold hover:bg-[#29B6B6]/30"
                  >
                    Elegir episodio y cast
                  </button>
                </div>
              )}
            </div>
            {showCastModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setShowCastModal(false)}>
                <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full max-h-[85vh] flex flex-col border-2 border-[#29B6B6]/20" onClick={e => e.stopPropagation()}>
                  <div className="p-4 border-b border-[#29B6B6]/20 shrink-0 flex items-center justify-between">
                    <div>
                      <h2 className="text-base font-bold text-slate-800">Cast de Personajes</h2>
                      <p className="text-xs text-slate-500 mt-0.5">Episodio y personajes del editor</p>
                    </div>
                    <button type="button" onClick={() => setShowCastModal(false)} className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-600">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4 min-h-0">
                    <CastContent />
                  </div>
                  <div className="p-4 border-t border-slate-200 shrink-0">
                    <button type="button" onClick={() => setShowCastModal(false)} className="w-full py-2.5 rounded-xl bg-[#29B6B6] text-white font-semibold hover:bg-[#34d1d1]">
                      Listo
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
        <div className="flex-1 overflow-y-auto p-4">
          {showAddEntry && selectedEpisodeId && cast.length > 0 && (
            <div className="mb-4 p-4 rounded-2xl border-2 border-[#29B6B6]/30 bg-white">
              <h3 className="text-sm font-bold text-slate-700 mb-3">Nueva línea de diálogo</h3>
              <div className="flex gap-2 mb-3">
                <button
                  onClick={() => setAddMode('text')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-semibold ${addMode === 'text' ? 'bg-[#29B6B6]/20 text-[#29B6B6]' : 'bg-slate-100 text-slate-600'}`}
                >
                  Escribir texto
                </button>
                <button
                  onClick={() => { setAddMode('existing'); loadAudioLibrary(); setShowAudioPicker(true); }}
                  className={`px-3 py-1.5 rounded-lg text-sm font-semibold ${addMode === 'existing' ? 'bg-[#29B6B6]/20 text-[#29B6B6]' : 'bg-slate-100 text-slate-600'}`}
                >
                  Usar audio existente
                </button>
              </div>
              <select
                value={newEntryCharId ?? ''}
                onChange={(e) => setNewEntryCharId(e.target.value ? parseInt(e.target.value, 10) : null)}
                className="w-full mb-3 px-4 py-2 rounded-xl border border-[#29B6B6]/30 text-sm"
              >
                <option value="">Selecciona personaje</option>
                {cast.map(c => (
                  <option key={c.id} value={c.id}>{c.name || 'Sin nombre'}</option>
                ))}
              </select>
              {addMode === 'text' && (
                <textarea
                  value={newEntryText}
                  onChange={(e) => setNewEntryText(e.target.value)}
                  placeholder="Escribe el texto que dirá el personaje..."
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl border border-[#29B6B6]/30 text-sm resize-none mb-3"
                />
              )}
              {addMode === 'existing' && showAudioPicker && newEntryCharId && (
                <div className="mb-3 p-3 rounded-xl bg-slate-50 border border-slate-200 max-h-48 overflow-y-auto">
                  <p className="text-xs font-semibold text-slate-500 mb-2">Selecciona carpeta y audio</p>
                  {(() => {
                    const lib = audioLibrary[newEntryCharId];
                    if (!lib) return <p className="text-xs text-slate-500">Cargando...</p>;
                    return (
                      <div className="space-y-2">
                        {lib.uncategorized?.length > 0 && (
                          <div>
                            <p className="text-xs font-medium text-slate-600 mb-1">Sin carpeta</p>
                            {lib.uncategorized.map((a: { id: string; text: string; url: string; file_path?: string }) => (
                              <button
                                key={a.id}
                                onClick={() => handleAddEntry(a.url.startsWith('/') ? a.url : `/${a.url}`)}
                                className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-[#29B6B6]/10 text-sm truncate"
                              >
                                {a.text || 'Audio'}
                              </button>
                            ))}
                          </div>
                        )}
                        {lib.folders?.map((f: { id: number; name: string; audios: Array<{ id: string; text: string; url: string; file_path?: string }> }) => (
                          <div key={f.id}>
                            <p className="text-xs font-medium text-slate-600 mb-1">{f.name}</p>
                            {f.audios?.map((a: { id: string; text: string; url: string; file_path?: string }) => (
                              <button
                                key={a.id}
                                onClick={() => handleAddEntry(a.url.startsWith('/') ? a.url : `/${a.url}`)}
                                className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-[#29B6B6]/10 text-sm truncate"
                              >
                                {a.text || 'Audio'}
                              </button>
                            ))}
                          </div>
                        ))}
                        {(!lib.uncategorized?.length && !lib.folders?.length) && (
                          <p className="text-xs text-slate-500">No hay audios. Crea audios en Personajes primero.</p>
                        )}
                      </div>
                    );
                  })()}
                </div>
              )}
              <div className="flex gap-2 mt-2">
                {addMode === 'text' && (
                  <button
                    onClick={() => handleAddEntry()}
                    disabled={!newEntryText.trim() || !newEntryCharId}
                    className="px-4 py-2 bg-[#29B6B6] text-white rounded-xl text-sm font-semibold disabled:opacity-50"
                  >
                    Añadir
                  </button>
                )}
                <button
                  onClick={() => { setShowAddEntry(false); setNewEntryText(''); setNewEntryCharId(null); setShowAudioPicker(false); }}
                  className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-sm font-semibold"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {loading ? (
            <div className="py-12 text-center text-slate-500">Cargando...</div>
          ) : entries.length === 0 ? (
            <div className="py-16 text-center bg-[#29B6B6]/5 rounded-2xl border-2 border-dashed border-[#29B6B6]/30">
              <p className="text-slate-600 font-medium">No hay líneas de diálogo</p>
              <p className="text-sm text-slate-500 mt-1">Añade personajes al cast y crea líneas</p>
              <button
                onClick={() => setShowAddEntry(true)}
                disabled={!selectedEpisodeId || cast.length === 0}
                className="mt-4 px-5 py-2.5 bg-[#29B6B6]/20 text-[#29B6B6] rounded-xl text-sm font-semibold disabled:opacity-50"
              >
                Añadir primera línea
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {entries.map((entry, idx) => {
                const entryUrl = entry.audio_file_path ? (entry.audio_file_path.startsWith('/') ? entry.audio_file_path : `/${entry.audio_file_path}`) : '';
                const isPlaying = !!currentPlaying && !!entryUrl && (currentPlaying.url === entryUrl || currentPlaying.url === entry.audio_file_path);
                return (
                <div
                  key={entry.id}
                  className={`flex items-start gap-4 p-4 rounded-2xl border shadow-sm transition-colors ${
                    isPlaying ? 'border-[#29B6B6] bg-[#29B6B6]/10 ring-2 ring-[#29B6B6]/30' : 'border-[#29B6B6]/20 bg-white'
                  }`}
                >
                  <span className={`text-xs font-bold w-6 ${isPlaying ? 'text-[#29B6B6]' : 'text-slate-400'}`}>{idx + 1}</span>
                  {entry.character_avatar_path ? (
                    <img src={`/${entry.character_avatar_path}`} alt="" className="w-10 h-10 rounded-xl object-cover shrink-0" />
                  ) : (
                    <div className="w-10 h-10 rounded-xl bg-[#29B6B6]/20 flex items-center justify-center text-[#29B6B6] font-bold shrink-0">
                      {entry.character_name?.charAt(0) || '?'}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-500">{entry.character_name}</p>
                    <p className="text-sm text-slate-800 mt-0.5 whitespace-pre-wrap">{entry.text}</p>
                    {entry.language && (
                      <p className="text-xs text-slate-400 mt-1">{getLanguageName(entry.language)}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {entry.audio_file_path ? (
                      <button
                        onClick={() => onPlay({ url: `/${entry.audio_file_path}`, text: entry.text, characterName: entry.character_name })}
                        className={`p-2 rounded-xl transition-colors ${isPlaying ? 'bg-[#29B6B6] text-white' : 'bg-[#29B6B6]/20 text-[#29B6B6] hover:bg-[#29B6B6]/30'}`}
                        title={isPlaying ? 'Reproduciendo' : 'Reproducir'}
                      >
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      </button>
                    ) : (
                      <button
                        onClick={() => handleSynthesize(entry.id)}
                        disabled={!!synthesizingId}
                        className="p-2 rounded-xl bg-amber-100 text-amber-600 hover:bg-amber-200 disabled:opacity-50"
                        title="Sintetizar"
                      >
                        {synthesizingId === entry.id ? (
                          <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                        ) : (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                        )}
                      </button>
                    )}
                    <button
                      onClick={() => handleDuplicateEntry(entry)}
                      className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                      title="Duplicar"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDeleteEntry(entry.id)}
                      className="p-2 rounded-xl text-slate-400 hover:bg-red-50 hover:text-red-500"
                      title="Eliminar"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              );
              })}
            </div>
          )}
        </div>
        )}
      </main>

      {/* Modal Generar diálogo con IA */}
      {showGenerateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => !generating && setShowGenerateModal(false)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 border-2 border-[#6B2D8C]/20" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-slate-800 mb-1">Generar podcast con IA</h3>
            <p className="text-xs text-slate-500 mb-4">OpenAI creará el diálogo según el tema, estilo y duración. Usa las descripciones de cada personaje.</p>

            <label className="block text-xs font-bold text-slate-600 mb-1">Tema del podcast</label>
            <input
              type="text"
              value={generateTheme}
              onChange={e => setGenerateTheme(e.target.value)}
              placeholder="Ej: Los misterios del espacio, Cómo aprender programación..."
              className="w-full px-4 py-3 rounded-xl border border-[#29B6B6]/30 text-sm mb-4"
            />

            <label className="block text-xs font-bold text-slate-600 mb-1">Estilo</label>
            <select
              value={generateStyle}
              onChange={e => setGenerateStyle(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-[#29B6B6]/30 text-sm mb-4"
            >
              <option value="curioso">Curioso e intrigante</option>
              <option value="preguntas-respuestas">Preguntas y respuestas</option>
              <option value="energetico">Enérgico y dinámico</option>
              <option value="noticias">Estilo noticias</option>
              <option value="conversacional">Conversacional</option>
              <option value="educativo">Educativo</option>
            </select>

            <label className="block text-xs font-bold text-slate-600 mb-1">Duración aproximada (minutos)</label>
            <div className="flex gap-2 mb-4">
              {[3, 5, 10, 15, 20].map(m => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setGenerateDuration(m)}
                  className={`px-3 py-2 rounded-xl text-sm font-semibold transition-colors ${
                    generateDuration === m ? 'bg-[#6B2D8C]/25 text-[#6B2D8C]' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {m} min
                </button>
              ))}
            </div>

            {generateError && (
              <p className="text-sm text-red-600 mb-4">{generateError}</p>
            )}

            <div className="flex gap-2">
              <button
                onClick={handleGenerateDialogue}
                disabled={generating || !generateTheme.trim()}
                className="flex-1 py-3 bg-[#6B2D8C] text-white font-bold rounded-xl hover:bg-[#7B3D9C] disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {generating ? (
                  <>
                    <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Generando...
                  </>
                ) : (
                  'Generar diálogo'
                )}
              </button>
              <button
                onClick={() => setShowGenerateModal(false)}
                disabled={generating}
                className="px-6 py-3 bg-slate-100 text-slate-600 font-semibold rounded-xl hover:bg-slate-200 disabled:opacity-50"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
