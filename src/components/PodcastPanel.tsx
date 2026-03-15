'use client';

import { useState, useEffect, useCallback } from 'react';
import { Character } from '@/types';
import AudioPlayerBar, { type NowPlaying } from '@/components/AudioPlayerBar';
import { getLanguageName } from '@/lib/voiceInstructions';
import PodcastTimelineEditor from '@/components/PodcastTimelineEditor';
import { exportEpisodeAsWav } from '@/lib/exportEpisodeAudio';
import { openrouterVoices } from '@/lib/voices';

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
  synthesized_text?: string | null;
  start_time_sec?: number | null;
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
  const [generateSuccessMessage, setGenerateSuccessMessage] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'escaleta' | 'editor'>('escaleta');
  const [showCastModal, setShowCastModal] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [editingEntryId, setEditingEntryId] = useState<number | null>(null);
  const [editEntryText, setEditEntryText] = useState('');

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

  const [savingTimeline, setSavingTimeline] = useState(false);
  const handleSaveTimeline = useCallback(
    async (startTimes: Record<number, number>) => {
      if (!selectedEpisodeId) return;
      setSavingTimeline(true);
      try {
        const res = await fetch(`/api/podcast/episodes/${selectedEpisodeId}/timeline`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            start_times: Object.fromEntries(
              Object.entries(startTimes).map(([k, v]) => [String(k), v])
            ),
          }),
        });
        if (res.ok) await loadEntries(selectedEpisodeId);
      } finally {
        setSavingTimeline(false);
      }
    },
    [selectedEpisodeId, loadEntries]
  );

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

  const handleRenameEpisode = async () => {
    if (!selectedEpisodeId) return;
    const currentTitle = episodes.find(e => e.id === selectedEpisodeId)?.title ?? '';
    const newTitle = window.prompt('Nuevo nombre del episodio', currentTitle);
    if (newTitle == null || newTitle.trim() === '') return;
    try {
      const res = await fetch(`/api/podcast/episodes/${selectedEpisodeId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle.trim() }),
      });
      const updated = await res.json();
      if (updated?.title) {
        setEpisodes(prev => prev.map(e => e.id === selectedEpisodeId ? { ...e, title: updated.title } : e));
      }
    } catch {
      // ignore
    }
  };

  const handleShare = async () => {
    try {
      const url = window.location.href;
      await navigator.clipboard.writeText(url);
      // Opcional: toast o feedback breve
    } catch {
      // ignore
    }
  };

  const handleExport = async () => {
    if (!selectedEpisodeId) return;
    const toExport = entries.filter(e => e.audio_file_path).map(e => ({ position: e.position, audio_file_path: e.audio_file_path! }));
    if (toExport.length === 0) return;
    setExporting(true);
    try {
      const title = episodes.find(e => e.id === selectedEpisodeId)?.title ?? 'episodio';
      await exportEpisodeAsWav(toExport, title);
    } catch (err) {
      console.error(err);
    }
    setExporting(false);
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

  const handleStartEditEntry = (entry: Entry) => {
    setEditingEntryId(entry.id);
    setEditEntryText(entry.text);
  };

  const handleCancelEditEntry = () => {
    setEditingEntryId(null);
    setEditEntryText('');
  };

  const handleSaveEntryText = async () => {
    if (editingEntryId == null || !selectedEpisodeId || editEntryText.trim() === '') return;
    try {
      const res = await fetch(`/api/podcast/episodes/${selectedEpisodeId}/entries/${editingEntryId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: editEntryText.trim() }),
      });
      if (!res.ok) throw new Error();
      const updated = await res.json();
      setEntries(prev => prev.map(e => (e.id === editingEntryId ? { ...e, ...updated } : e)));
      setEditingEntryId(null);
      setEditEntryText('');
    } catch {
      // ignore
    }
  };

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return s < 10 ? `${m}:0${s}` : `${m}:${s}`;
  };

  const estimatedSecondsForText = (text: string) => Math.max(1, Math.round((text?.trim().split(/\s+/).filter(Boolean).length || 0) / 2.5));

  const handleGenerateDialogue = async () => {
    if (!selectedEpisodeId || !generateTheme.trim() || cast.length === 0) return;
    setGenerating(true);
    setGenerateError(null);
    setGenerateSuccessMessage(null);
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
      loadEntries(selectedEpisodeId);
      const et = data.estimated_times as { total_seconds?: number; by_character?: Record<string, number> } | undefined;
      if (et?.by_character && Object.keys(et.by_character).length > 0) {
        const parts = Object.entries(et.by_character)
          .map(([name, sec]) => `${name} ${formatSeconds(sec)}`)
          .join(', ');
        const total = et.total_seconds ?? 0;
        setGenerateSuccessMessage(`${data.entries ?? 0} líneas creadas. Tiempo por personaje: ${parts}. Total ~${formatSeconds(total)}.`);
      } else {
        setGenerateSuccessMessage(`${data.entries ?? 0} líneas creadas.`);
      }
      setShowGenerateModal(false);
      setGenerateTheme('');
      setTimeout(() => setGenerateSuccessMessage(null), 8000);
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
                  className="flex flex-col gap-2 p-2.5 rounded-xl bg-white border border-slate-200 shadow-sm"
                >
                  <div className="flex items-center gap-2">
                    {(char as CastMember).avatar_path ? (
                      <img src={`/${(char as CastMember).avatar_path}`} alt="" className="w-8 h-8 rounded-lg object-cover shrink-0" />
                    ) : (
                      <div className="w-8 h-8 rounded-lg bg-[#6B2D8C]/30 flex items-center justify-center text-white text-xs font-bold shrink-0">
                        {char.name?.charAt(0) || '?'}
                      </div>
                    )}
                    <span className="flex-1 text-sm font-medium text-slate-700 truncate min-w-0">{char.name || 'Sin nombre'}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveFromCast(char.id)}
                      className="p-1 text-slate-400 hover:text-red-500 shrink-0"
                      title="Quitar del cast"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Voz</p>
                  <p className="text-xs text-slate-700">
                    {(() => {
                      const voiceId = (char as Character).voice_id || 'alloy';
                      const v = openrouterVoices.find(x => x.id === voiceId);
                      return v ? `${v.name} (${v.gender})` : voiceId;
                    })()}
                  </p>
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

  const canExport = selectedEpisodeId && entries.some(e => e.audio_file_path);

  const addEntryModal = showAddEntry && selectedEpisodeId && cast.length > 0 && (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50" onClick={() => { setShowAddEntry(false); setNewEntryText(''); setNewEntryCharId(null); setShowAudioPicker(false); }}>
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 border-2 border-[#29B6B6] border-opacity-20 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <h3 className="text-sm font-bold text-slate-700 mb-3">Nueva línea de diálogo</h3>
        <div className="flex gap-2 mb-3">
          <button
            onClick={() => setAddMode('text')}
            className={addMode === 'text' ? 'px-3 py-1.5 rounded-lg text-sm font-semibold bg-[#29B6B6] bg-opacity-20 text-[#29B6B6]' : 'px-3 py-1.5 rounded-lg text-sm font-semibold bg-slate-100 text-slate-600'}
          >
            Escribir texto
          </button>
          <button
            onClick={() => { setAddMode('existing'); loadAudioLibrary(); setShowAudioPicker(true); }}
            className={addMode === 'existing' ? 'px-3 py-1.5 rounded-lg text-sm font-semibold bg-[#29B6B6] bg-opacity-20 text-[#29B6B6]' : 'px-3 py-1.5 rounded-lg text-sm font-semibold bg-slate-100 text-slate-600'}
          >
            Usar audio existente
          </button>
        </div>
        <select
          value={newEntryCharId ?? ''}
          onChange={(e) => setNewEntryCharId(e.target.value ? parseInt(e.target.value, 10) : null)}
          className="w-full mb-3 px-4 py-2 rounded-xl border border-[#29B6B6] border-opacity-30 text-sm"
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
            className="w-full px-4 py-3 rounded-xl border border-[#29B6B6] border-opacity-30 text-sm resize-none mb-3"
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
                          className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-[#29B6B6] hover:bg-opacity-10 text-sm truncate"
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
                          className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-[#29B6B6] hover:bg-opacity-10 text-sm truncate"
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
    </div>
  );

  return (
    <div className="flex flex-col flex-1 min-w-0 min-h-0 bg-white">
      {/* Barra superior: título episodio, Share, Export (estilo referencia) */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-white shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <select
            value={selectedEpisodeId ?? ''}
            onChange={(e) => setSelectedEpisodeId(e.target.value ? parseInt(e.target.value, 10) : null)}
            className="text-lg font-bold text-slate-800 bg-transparent border-none cursor-pointer focus:ring-0 focus:outline-none max-w-[220px] truncate"
            aria-label="Episodio"
          >
            <option value="">Selecciona un episodio</option>
            {episodes.map((ep) => (
              <option key={ep.id} value={ep.id}>{ep.title}</option>
            ))}
          </select>
          <button
            onClick={handleRenameEpisode}
            disabled={!selectedEpisodeId}
            className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-40"
            title="Cambiar nombre"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          </button>
          <button
            onClick={handleCreateEpisode}
            className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700"
            title="Nuevo episodio"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={handleShare}
            className="text-sm font-medium text-slate-600 hover:text-slate-900"
          >
            Compartir
          </button>
          <button
            type="button"
            onClick={handleExport}
            disabled={!canExport || exporting}
            className="px-4 py-2 rounded-lg text-sm font-semibold bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {exporting ? 'Exportando…' : 'Exportar'}
          </button>
        </div>
      </header>

      {/* Dos columnas: Script (izq) | Cast / Voces (der) */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Columna izquierda: guion (párrafos) */}
        <aside className="flex-1 min-w-0 flex flex-col border-r border-slate-200 overflow-hidden bg-slate-50/50">
          <div className="p-3 border-b border-slate-200 shrink-0 flex flex-wrap gap-2">
            <button
              onClick={() => setShowAddEntry(true)}
              disabled={!selectedEpisodeId || cast.length === 0}
              className="px-3 py-2 rounded-lg text-sm font-semibold bg-[#29B6B6] text-white hover:bg-[#34d1d1] disabled:opacity-50 flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Añadir línea
            </button>
            <button
              onClick={handleSynthesizeAll}
              disabled={!selectedEpisodeId || entries.filter(e => !e.audio_file_path).length === 0}
              className="px-3 py-2 rounded-lg text-sm font-semibold bg-[#3B59AB]/20 text-[#3B59AB] hover:bg-[#3B59AB]/30 disabled:opacity-50 flex items-center gap-2"
            >
              Sintetizar todo
            </button>
            <button
              onClick={() => { setShowGenerateModal(true); setGenerateError(null); setGenerateSuccessMessage(null); }}
              disabled={!selectedEpisodeId || cast.length === 0}
              className="px-3 py-2 rounded-lg text-sm font-semibold bg-[#6B2D8C]/20 text-[#6B2D8C] hover:bg-[#6B2D8C]/30 disabled:opacity-50 flex items-center gap-2"
            >
              Generar con IA
            </button>
          </div>
          {generateSuccessMessage && (
            <div className="mx-3 mt-2 px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-200 text-sm text-emerald-800 flex items-center justify-between gap-2">
              <span>{generateSuccessMessage}</span>
              <button type="button" onClick={() => setGenerateSuccessMessage(null)} className="text-emerald-600 hover:text-emerald-800 shrink-0" aria-label="Cerrar">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
          )}
          <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-4">
            {!selectedEpisodeId ? (
              <p className="text-sm text-slate-500 py-8">Crea o selecciona un episodio en la barra superior.</p>
            ) : loading ? (
              <p className="text-sm text-slate-500 py-8">Cargando…</p>
            ) : entries.length === 0 ? (
              <div className="py-12 text-center rounded-xl border-2 border-dashed border-slate-200 bg-white">
                <p className="text-slate-600 font-medium">No hay líneas en el guion</p>
                <p className="text-sm text-slate-500 mt-1">Añade personajes al cast y crea líneas</p>
                <button
                  onClick={() => setShowAddEntry(true)}
                  disabled={cast.length === 0}
                  className="mt-4 px-4 py-2 rounded-xl bg-[#29B6B6]/20 text-[#29B6B6] text-sm font-semibold disabled:opacity-50"
                >
                  Añadir primera línea
                </button>
              </div>
            ) : (
              <div className="space-y-1 pb-4">
                {entries.map((entry, idx) => {
                  const entryUrl = entry.audio_file_path ? `/${entry.audio_file_path}` : '';
                  const isPlaying = !!currentPlaying && !!entryUrl && (currentPlaying.url === entryUrl || currentPlaying.url === entry.audio_file_path);
                  const durationSec = estimatedSecondsForText(entry.text);
                  const hasAudio = !!entry.audio_file_path;
                  const primaryText = (entry.synthesized_text || '').trim();
                  const currentText = entry.text.trim();
                  const isOutOfSync = hasAudio && primaryText !== '' && primaryText !== currentText;
                  const isSynced = hasAudio && !isOutOfSync;
                  const isEditing = editingEntryId === entry.id;
                  return (
                    <div
                      key={entry.id}
                      className={`flex gap-3 py-3 px-2 rounded-lg border-l-4 transition-colors ${
                        isPlaying ? 'border-[#29B6B6] bg-[#29B6B6]/5' : isOutOfSync ? 'border-amber-400 bg-amber-50/80' : 'border-slate-200 bg-white hover:bg-slate-50/80'
                      }`}
                    >
                      {/* Avatar al inicio para ver quién habla */}
                      <div className="shrink-0 flex flex-col items-center gap-0.5">
                        {entry.character_avatar_path ? (
                          <img
                            src={`/${entry.character_avatar_path}`}
                            alt=""
                            className="w-10 h-10 rounded-full object-cover ring-2 ring-slate-200"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-[#29B6B6] bg-opacity-20 flex items-center justify-center text-[#29B6B6] font-bold text-sm ring-2 ring-slate-200">
                            {entry.character_name?.charAt(0) || '?'}
                          </div>
                        )}
                        <span className="text-[10px] font-mono text-slate-400 tabular-nums" title="Tiempo estimado">
                          {formatSeconds(durationSec)}
                        </span>
                      </div>
                      <span className="text-xs font-mono text-slate-400 w-5 shrink-0 self-center">{idx + 1}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-xs font-semibold text-slate-600">{entry.character_name}</p>
                          {isOutOfSync && (
                            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-amber-200 text-amber-800" title="El mensaje actual no coincide con el audio generado (mensaje primario). Regenera el audio para sincronizar.">
                              Desincronizado: texto y audio no coinciden
                            </span>
                          )}
                        </div>
                        {isEditing ? (
                          <div className="mt-1 space-y-2">
                            <textarea
                              value={editEntryText}
                              onChange={(e) => setEditEntryText(e.target.value)}
                              rows={3}
                              className="w-full text-sm text-slate-800 border border-slate-300 rounded-lg p-2 resize-y focus:ring-2 focus:ring-[#29B6B6] focus:border-[#29B6B6]"
                              placeholder="Texto de la línea..."
                            />
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={handleSaveEntryText}
                                className="px-3 py-1.5 rounded-lg bg-[#29B6B6] text-white text-xs font-medium hover:bg-[#25a0a0]"
                              >
                                Guardar
                              </button>
                              <button
                                type="button"
                                onClick={handleCancelEditEntry}
                                className="px-3 py-1.5 rounded-lg bg-slate-200 text-slate-600 text-xs font-medium hover:bg-slate-300"
                              >
                                Cancelar
                              </button>
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm text-slate-800 mt-0.5 whitespace-pre-wrap">{entry.text}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0 self-center">
                        {!isEditing && (
                          <button
                            onClick={() => handleStartEditEntry(entry)}
                            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                            title="Editar texto"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                          </button>
                        )}
                        {hasAudio ? (
                          <>
                            <button
                              onClick={() => onPlay({ url: `/${entry.audio_file_path}`, text: entry.text, characterName: entry.character_name })}
                              className={`p-1.5 rounded-lg ${
                                isSynced
                                  ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                                  : isPlaying
                                    ? 'bg-[#29B6B6] text-white'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                              }`}
                              title={isSynced ? 'Audio sincronizado con el texto. Reproducir.' : 'Reproducir'}
                            >
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M8 5v14l11-7z" />
                              </svg>
                            </button>
                            {isOutOfSync && (
                              <button
                                onClick={() => handleSynthesize(entry.id)}
                                disabled={!!synthesizingId}
                                className="p-1.5 rounded-lg bg-amber-100 text-amber-700 hover:bg-amber-200 disabled:opacity-50"
                                title="Regenerar audio para sincronizar con el texto"
                              >
                                {synthesizingId === entry.id ? (
                                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                  </svg>
                                ) : (
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                  </svg>
                                )}
                              </button>
                            )}
                          </>
                        ) : (
                          <button
                            onClick={() => handleSynthesize(entry.id)}
                            disabled={!!synthesizingId}
                            className="p-1.5 rounded-lg bg-amber-100 text-amber-600 hover:bg-amber-200 disabled:opacity-50"
                            title="Sintetizar"
                          >
                            {synthesizingId === entry.id ? (
                              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                              </svg>
                            ) : (
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                              </svg>
                            )}
                          </button>
                        )}
                        <button
                          onClick={() => handleDuplicateEntry(entry)}
                          className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                          title="Duplicar"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDeleteEntry(entry.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500"
                          title="Eliminar"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
        </aside>

        {/* Columna derecha: Seleccionar voz / Cast (scroll interno) */}
        <aside className="w-[300px] shrink-0 flex flex-col border-l border-slate-200 bg-slate-50/50 overflow-hidden">
          <div className="p-4 border-b border-slate-200 shrink-0">
            <h2 className="text-sm font-bold text-slate-700">Seleccionar voz</h2>
            <p className="text-xs text-slate-500 mt-0.5">Asigna el timbre de voz a cada personaje que habla</p>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-3">
            <CastContent />
          </div>
        </aside>
      </div>

      {/* Timeline abajo (siempre visible cuando hay episodio y cast) */}
      <div className="h-[220px] shrink-0 border-t border-slate-200 flex flex-col min-h-0">
        {selectedEpisodeId && cast.length > 0 ? (
          <PodcastTimelineEditor
            entries={entries}
            cast={cast}
            onPlayEntry={(entry) => {
              if (entry.audio_file_path) {
                onPlay({ url: `/${entry.audio_file_path}`, text: entry.text, characterName: entry.character_name });
              }
            }}
            onSaveTimeline={handleSaveTimeline}
            savingTimeline={savingTimeline}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center bg-slate-100 text-slate-500 text-sm">
            Elige un episodio y añade personajes al cast para ver la línea de tiempo.
          </div>
        )}
      </div>

      {/* Modal cast */}
      {showCastModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setShowCastModal(false)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full max-h-[85vh] flex flex-col border-2 border-[#29B6B6]/20" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-[#29B6B6]/20 shrink-0 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-800">Cast de Personajes</h2>
                <p className="text-xs text-slate-500 mt-0.5">Episodio y personajes</p>
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

      {/* Modal nueva línea (añadir al guion) */}
      {addEntryModal}

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
              {[1, 3, 5, 7].map(m => (
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
