'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Character } from '@/types';
import CharacterForm from '@/components/CharacterForm';
import CreateAudioModal, { type AudioUsage } from '@/components/CreateAudioModal';
import DeleteCharacterModal from '@/components/DeleteCharacterModal';
import AudioPlayerBar, { type NowPlaying } from '@/components/AudioPlayerBar';
import { formatCostUsd } from '@/lib/format';
import { getLanguageName } from '@/lib/voiceInstructions';

export default function Home() {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreateFromProfile, setShowCreateFromProfile] = useState(false);
  const [createProfile, setCreateProfile] = useState({ name: '', age: '', gender: '' });
  const [characterTab, setCharacterTab] = useState<'audios' | 'editar'>('audios');
  type AudioItem = {
  id: string;
  text: string;
  voice_id: string;
  url: string;
  usage?: AudioUsage;
  voiceName?: string;
  language?: string;
  qualities?: string;
  characters_used?: number;
  cost_usd?: number;
};
  const [audios, setAudios] = useState<AudioItem[]>([]);
  const [audiosLoading, setAudiosLoading] = useState(false);
  const [selectedAudioId, setSelectedAudioId] = useState<string | null>(null);
  const [showCreateAudioModal, setShowCreateAudioModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; name: string } | null>(null);
  const [currentPlaying, setCurrentPlaying] = useState<NowPlaying | null>(null);
  const [section, setSection] = useState<'personajes' | 'podcast'>('personajes');

  const loadCharacters = useCallback(async () => {
    try {
      const res = await fetch('/api/characters');
      const data = await res.json();
      setCharacters(data);
    } catch (error) {
      console.error('Failed to load characters:', error);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadCharacters();
  }, [loadCharacters]);

  useEffect(() => {
    setSelectedAudioId(null);
  }, [selectedId, characterTab]);

  const loadAudios = useCallback(async (characterId: number) => {
    setAudiosLoading(true);
    try {
      const res = await fetch(`/api/audios?character_id=${characterId}`);
      const data = await res.json();
      setAudios(Array.isArray(data) ? data.map((a: Record<string, unknown>) => ({
        id: a.id,
        text: a.text,
        voice_id: a.voice_id,
        url: a.url || `/${a.file_path}`,
        voiceName: a.voice_name,
        language: a.language,
        qualities: a.qualities,
        characters_used: a.characters_used,
        cost_usd: a.cost_usd,
        usage: a.characters_used != null ? { characters: a.characters_used as number, model: 'gpt-4o-mini-tts', estimatedCostUsd: (a.cost_usd as number) ?? 0 } : undefined,
      })) : []);
    } catch {
      setAudios([]);
    }
    setAudiosLoading(false);
  }, []);

  useEffect(() => {
    if (selectedId != null && characterTab === 'audios') {
      loadAudios(selectedId);
    } else {
      setAudios([]);
    }
  }, [selectedId, characterTab, loadAudios]);

  const handleCreate = async (initialData?: { name?: string; age?: string; gender?: string }) => {
    try {
      const res = await fetch('/api/characters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: initialData?.name || 'Nuevo Personaje',
          age: initialData?.age || '',
          gender: initialData?.gender || '',
        }),
      });
      const newChar = await res.json();
      setCharacters(prev => [newChar, ...prev]);
      setSelectedId(newChar.id);
      setShowCreateFromProfile(false);
      setCreateProfile({ name: '', age: '', gender: '' });
    } catch (error) {
      console.error('Failed to create character:', error);
    }
  };

  const handleCreateFromProfile = () => {
    handleCreate({
      name: createProfile.name || 'Personaje',
      age: createProfile.age,
      gender: createProfile.gender,
    });
  };

  const handleUpdate = async (id: number, data: Partial<Character>) => {
    try {
      await fetch(`/api/characters/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      setCharacters(prev => prev.map(c => c.id === id ? { ...c, ...data } : c));
    } catch (error) {
      console.error('Failed to update character:', error);
    }
  };

  const handleDeleteClick = (char: Character) => {
    setDeleteTarget({ id: char.id, name: char.name || 'Sin nombre' });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      await fetch(`/api/characters/${deleteTarget.id}`, { method: 'DELETE' });
      setCharacters(prev => prev.filter(c => c.id !== deleteTarget.id));
      if (selectedId === deleteTarget.id) setSelectedId(null);
      setDeleteTarget(null);
    } catch (error) {
      console.error('Failed to delete character:', error);
    }
  };

  const selectedCharacter = characters.find(c => c.id === selectedId) || null;
  const selectedAudio = selectedCharacter && selectedAudioId
    ? audios.find(a => a.id === selectedAudioId)
    : null;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-slate-500 font-semibold animate-pulse">Cargando personajes...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Barra superior fija */}
      <header className="fixed top-0 left-0 right-0 z-50 h-16 px-4 md:px-6 flex items-center justify-between bg-white/95 backdrop-blur-md border-b border-[#29B6B6]/20">
        <Link href="/" className="flex items-center gap-3 shrink-0">
          <img src="/VoxStudioLogo.png" alt="VoxStudio" className="w-9 h-9 object-contain" />
          <span className="text-lg font-extrabold text-[#373D48] hidden sm:inline"><span className="text-[#373D48]">Vox</span><span className="text-[#29B6B6]">Studio</span></span>
        </Link>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowCreateFromProfile(true)}
            className={`px-3 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 ${
              showCreateFromProfile ? 'bg-[#29B6B6]/20 text-[#29B6B6]' : 'bg-[#29B6B6]/10 text-[#29B6B6] hover:bg-[#29B6B6]/20'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
            <span className="hidden sm:inline">Desde perfil</span>
          </button>
          <button
            type="button"
            onClick={() => handleCreate()}
            className="px-3 py-2 rounded-xl text-sm font-semibold bg-[#3B59AB]/15 text-[#3B59AB] hover:bg-[#3B59AB]/25 transition-all flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span className="hidden sm:inline">Nuevo</span>
          </button>
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
        </div>
      </header>

      <div className="flex-1 flex min-h-0 pt-16">
        {/* Panel 1: Navegación principal (Personajes, Podcast) */}
        <nav className="w-[72px] shrink-0 flex flex-col items-center py-4 gap-3 border-r border-[#29B6B6]/20 bg-white/80">
          <button
            type="button"
            onClick={() => setSection('personajes')}
            className={`w-14 h-14 rounded-xl flex flex-col items-center justify-center gap-1 transition-all ${
              section === 'personajes'
                ? 'bg-[#29B6B6]/20 text-[#29B6B6] shadow-md'
                : 'text-slate-500 hover:bg-[#29B6B6]/10 hover:text-[#373D48]'
            }`}
            title="Personajes"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span className="text-[9px] font-semibold leading-tight text-center px-0.5">Personajes</span>
          </button>
          <button
            type="button"
            disabled
            className="w-14 h-14 rounded-xl flex flex-col items-center justify-center gap-1 text-slate-300 cursor-not-allowed"
            title="Podcast (próximamente)"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 013-3V4a3 3 0 00-3 3v1a3 3 0 013 3z" />
            </svg>
            <span className="text-[9px] font-semibold leading-tight text-center px-0.5">Podcast</span>
          </button>
        </nav>

        {/* Panel 2: Listado de personajes */}
        {section === 'personajes' && (
        <aside className="w-[280px] md:w-[320px] shrink-0 flex flex-col border-r border-[#29B6B6]/20 bg-white/60">
          <div className="p-4 border-b border-[#29B6B6]/20">
            <h2 className="text-sm font-bold text-slate-700">Personajes</h2>
            <p className="text-xs text-slate-500 mt-0.5">Selecciona uno</p>
          </div>
          <div className="flex-1 overflow-y-auto p-3 min-h-0 max-h-[calc(100vh-8rem)]">
            <div className="grid grid-cols-1 gap-2">
            {characters.length === 0 ? (
              <div className="py-8 text-center text-slate-500 text-sm">
                <p>No hay personajes</p>
                <p className="text-xs mt-1">Usa los botones de arriba para crear</p>
              </div>
            ) : (
            characters.map((char) => (
              <div
                key={char.id}
                role="button"
                tabIndex={0}
                onClick={() => {
                  setSelectedId(char.id);
                  setShowCreateFromProfile(false);
                  setCharacterTab('audios');
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    setSelectedId(char.id);
                    setShowCreateFromProfile(false);
                    setCharacterTab('audios');
                  }
                }}
                className={`relative rounded-2xl bg-white/90 border-2 p-3 flex items-center gap-3 text-left overflow-hidden transition-all duration-200 hover:shadow-lg group cursor-pointer ${
                  selectedId === char.id
                    ? 'border-[#29B6B6] admin-card-selected shadow-md'
                    : 'border-transparent hover:border-[#29B6B6]/30 shadow-sm'
                }`}
              >
                {(char as { avatar_path?: string }).avatar_path ? (
                  <img
                    src={`/${(char as { avatar_path: string }).avatar_path}`}
                    alt={char.name || ''}
                    className="w-11 h-11 rounded-xl object-cover shrink-0"
                  />
                ) : (
                  <div className="w-11 h-11 rounded-xl gradient-primary flex items-center justify-center text-lg font-black text-white shrink-0">
                    {char.name ? char.name.charAt(0).toUpperCase() : '?'}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <span className="font-bold text-slate-700 text-sm block truncate">{char.name || 'Sin nombre'}</span>
                  <span className="text-xs text-slate-400">{char.gender || '—'} • {char.age || '—'}</span>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteClick(char);
                  }}
                  className="absolute top-2 right-2 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-100 text-red-500 transition-all"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            ))
            )}
            </div>
          </div>
        </aside>
        )}

        {/* Panel 3: Lista de audios (workspace) */}
        <main className="flex-1 min-w-0 flex flex-col overflow-hidden">
          <div className={`flex-1 overflow-y-auto p-6 md:p-8 ${currentPlaying ? 'pb-28' : ''}`}>
            <div className="rounded-[2rem] bg-white/90 border-2 border-[#29B6B6]/20 shadow-xl overflow-hidden min-h-[480px]">
              {/* Podcast: próximamente */}
              {section === 'podcast' && (
                <div className="p-12 flex flex-col items-center justify-center min-h-[420px] text-center">
                  <div className="w-24 h-24 rounded-3xl bg-slate-100 flex items-center justify-center mb-6">
                    <svg className="w-12 h-12 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 013-3V4a3 3 0 00-3 3v1a3 3 0 013 3z" />
                    </svg>
                  </div>
                  <h2 className="text-xl font-extrabold text-slate-800">Podcast</h2>
                  <p className="mt-2 text-sm text-slate-500 max-w-xs">
                    Proyecto en desarrollo. Próximamente podrás crear y gestionar podcasts aquí.
                  </p>
                </div>
              )}

              {/* Personajes: Crear desde perfil (formulario rápido) */}
              {section === 'personajes' && showCreateFromProfile && !selectedCharacter && (
                <div className="p-8">
                  <div className="px-6 py-4 -mx-8 -mt-8 mb-6 bg-gradient-to-r from-[#6B2D8C]/10 via-[#3B59AB]/10 to-[#29B6B6]/10 border-b border-[#29B6B6]/20">
                    <h2 className="text-xl font-extrabold text-slate-800">Crear desde perfil</h2>
                    <p className="text-xs text-slate-500 mt-0.5">Define los datos básicos y empieza a personalizar</p>
                  </div>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleCreateFromProfile();
                    }}
                    className="space-y-5"
                  >
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">Nombre</label>
                      <input
                        type="text"
                        value={createProfile.name}
                        onChange={(e) => setCreateProfile(p => ({ ...p, name: e.target.value }))}
                        placeholder="Ej: María, Carlos..."
                        className="w-full px-4 py-3 rounded-xl border border-[#29B6B6]/30 bg-[#29B6B6]/5 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-[#29B6B6]/30 focus:border-[#29B6B6]"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Edad</label>
                        <input
                          type="text"
                          value={createProfile.age}
                          onChange={(e) => setCreateProfile(p => ({ ...p, age: e.target.value }))}
                          placeholder="Ej: 24 años"
                          className="w-full px-4 py-3 rounded-xl border border-[#29B6B6]/30 bg-[#29B6B6]/5 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-[#29B6B6]/30"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Género</label>
                        <select
                          value={createProfile.gender}
                          onChange={(e) => setCreateProfile(p => ({ ...p, gender: e.target.value }))}
                          className="w-full px-4 py-3 rounded-xl border border-[#29B6B6]/30 bg-[#29B6B6]/5 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-[#29B6B6]/30"
                        >
                          <option value="">Seleccionar...</option>
                          <option value="male">Masculino</option>
                          <option value="female">Femenino</option>
                          <option value="non-binary">No binario</option>
                          <option value="other">Otro</option>
                        </select>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <button
                        type="submit"
                        className="flex-1 py-3 bg-[#29B6B6] text-white font-bold rounded-xl shadow-lg shadow-[#29B6B6]/30 hover:bg-[#34d1d1] transition-colors"
                      >
                        Crear personaje
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowCreateFromProfile(false)}
                        className="px-6 py-3 bg-slate-100 text-slate-600 font-semibold rounded-xl hover:bg-slate-200 transition-colors"
                      >
                        Cancelar
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Personajes: Sin selección */}
              {section === 'personajes' && !showCreateFromProfile && !selectedCharacter && (
                <div className="p-12 flex flex-col items-center justify-center min-h-[420px] text-center">
                  <div className="w-24 h-24 rounded-3xl gradient-primary flex items-center justify-center mb-6 opacity-90">
                    <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <h2 className="text-xl font-extrabold text-slate-800">Selecciona un personaje</h2>
                  <p className="mt-2 text-sm text-slate-500 max-w-xs">
                    Elige uno de la cuadrícula, crea uno desde perfil o añade uno nuevo para empezar a darle voz.
                  </p>
                </div>
              )}

              {/* Personajes: Personaje seleccionado - workspace */}
              {section === 'personajes' && selectedCharacter && (
                <div className="flex flex-col h-full min-h-[480px]">
                  <div className="px-6 py-4 bg-gradient-to-r from-[#6B2D8C]/10 via-[#3B59AB]/10 to-[#29B6B6]/10 border-b border-[#29B6B6]/20 shrink-0">
                    <p className="text-xs text-slate-500 mb-1">Personajes &gt; {selectedCharacter.name || 'Sin nombre'}</p>
                    <h2 className="text-xl font-extrabold text-slate-800">{selectedCharacter.name || 'Sin nombre'}</h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {selectedCharacter.gender || '—'} • {selectedCharacter.age || '—'} • Personaliza y asigna voz
                    </p>
                    {/* Tabs internos */}
                    <nav className="flex gap-1 mt-4">
                      <button
                        onClick={() => setCharacterTab('audios')}
                        className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
                          characterTab === 'audios'
                            ? 'bg-[#29B6B6]/25 text-[#29B6B6] shadow-sm'
                            : 'text-slate-500 hover:bg-[#29B6B6]/10 hover:text-[#373D48]'
                        }`}
                      >
                        Audios
                      </button>
                      <button
                        onClick={() => setCharacterTab('editar')}
                        className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
                          characterTab === 'editar'
                            ? 'bg-[#29B6B6]/25 text-[#29B6B6] shadow-sm'
                            : 'text-slate-500 hover:bg-[#29B6B6]/10 hover:text-[#373D48]'
                        }`}
                      >
                        Editar personaje
                      </button>
                    </nav>
                  </div>

                  <div className="flex-1 overflow-y-auto p-6">
                    {characterTab === 'audios' && (
                      <div className="space-y-6">
                        <div className="flex items-center justify-between">
                          <h3 className="text-lg font-bold text-slate-800">Audios</h3>
                          <button
                            onClick={() => setShowCreateAudioModal(true)}
                            className="px-4 py-2.5 bg-[#29B6B6] text-white text-sm font-bold rounded-xl shadow-lg shadow-[#29B6B6]/30 hover:bg-[#34d1d1] transition-colors flex items-center gap-2"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            Crear nuevo
                          </button>
                        </div>

                        {audiosLoading ? (
                          <div className="py-12 text-center text-slate-500">Cargando audios...</div>
                        ) : audios.length === 0 ? (
                          <div className="py-16 text-center bg-[#29B6B6]/5 rounded-2xl border-2 border-dashed border-[#29B6B6]/30">
                            <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-[#29B6B6]/20 flex items-center justify-center">
                              <svg className="w-7 h-7 text-[#29B6B6]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                              </svg>
                            </div>
                            <p className="text-slate-600 font-medium">No hay audios aún</p>
                            <p className="text-sm text-slate-500 mt-1">Crea uno nuevo seleccionando la voz en un modal</p>
                            <button
                              onClick={() => setShowCreateAudioModal(true)}
                              className="mt-4 px-5 py-2.5 bg-[#29B6B6]/20 text-[#29B6B6] rounded-xl text-sm font-semibold hover:bg-[#29B6B6]/30 transition-colors"
                            >
                              Crear primer audio
                            </button>
                          </div>
                        ) : (
                          <div className="relative">
                            <div className="space-y-3 overflow-y-auto">
                              {audios.map((audio) => (
                                <div
                                  key={audio.id}
                                  onClick={() => setSelectedAudioId(audio.id)}
                                  className={`flex items-center gap-4 p-4 rounded-2xl border shadow-sm transition-all cursor-pointer ${
                                    selectedAudioId === audio.id
                                      ? 'bg-[#29B6B6]/10 border-[#29B6B6] ring-2 ring-[#29B6B6]/30'
                                      : 'bg-white border-[#29B6B6]/20 hover:shadow-md hover:border-[#29B6B6]/40'
                                  }`}
                                >
                                  <div className="w-10 h-10 rounded-xl bg-[#29B6B6]/20 flex items-center justify-center shrink-0">
                                    <svg className="w-5 h-5 text-[#29B6B6]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                                    </svg>
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-slate-800 truncate">{audio.text}</p>
                                    <p className="text-xs text-slate-500">
                                      {audio.characters_used ?? audio.usage?.characters
                                        ? `${audio.characters_used ?? audio.usage?.characters} caracteres`
                                        : 'Audio generado'}
                                    </p>
                                  </div>
                                  <div className="flex items-center gap-2 shrink-0">
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setCurrentPlaying({
                                          url: audio.url,
                                          text: audio.text,
                                          characterName: selectedCharacter?.name,
                                        });
                                      }}
                                      className={`p-2.5 rounded-xl transition-colors ${
                                        currentPlaying?.url === audio.url
                                          ? 'bg-[#29B6B6] text-white'
                                          : 'bg-[#29B6B6]/10 text-[#29B6B6] hover:bg-[#29B6B6]/20'
                                      }`}
                                      title="Reproducir en barra inferior"
                                    >
                                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M8 5v14l11-7z" />
                                      </svg>
                                    </button>
                                    <a
                                      href={audio.url}
                                      download={`${selectedCharacter.name || 'audio'}-${audio.id.slice(0, 8)}.mp3`}
                                      className="p-2 rounded-lg bg-[#29B6B6]/10 text-[#29B6B6] hover:bg-[#29B6B6]/20 transition-colors"
                                      title="Descargar"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                      </svg>
                                    </a>
                                  </div>
                                </div>
                              ))}
                            </div>

                            {/* Drawer de detalle: se desliza desde la derecha */}
                            {selectedAudioId && selectedAudio && (
                              <>
                                <div
                                  className="drawer-backdrop fixed inset-0 bg-black/20 z-30"
                                  onClick={() => setSelectedAudioId(null)}
                                  aria-hidden="true"
                                />
                                <div
                                  className="drawer-panel fixed right-0 w-full max-w-md bg-white shadow-2xl border-l border-[#29B6B6]/20 z-40 flex flex-col overflow-hidden"
                                  style={{
                                    top: '4rem',
                                    bottom: currentPlaying ? '5rem' : 0,
                                  }}
                                >
                                  <div className="px-4 py-3 bg-gradient-to-r from-[#6B2D8C]/10 via-[#3B59AB]/10 to-[#29B6B6]/10 border-b border-[#29B6B6]/20 flex items-center justify-between shrink-0">
                                    <span className="font-bold text-slate-800">Detalle del audio</span>
                                    <button
                                      onClick={() => setSelectedAudioId(null)}
                                      className="p-1.5 rounded-lg text-slate-500 hover:bg-[#29B6B6]/10 hover:text-slate-700"
                                    >
                                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                      </svg>
                                    </button>
                                  </div>
                                  <div className="flex-1 overflow-y-auto p-4 space-y-4">
                                    <div>
                                      <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Texto</label>
                                      <p className="text-sm text-slate-800 whitespace-pre-wrap">{selectedAudio.text}</p>
                                    </div>
                                    <div>
                                      <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Idioma</label>
                                      <p className="text-sm text-slate-800">{selectedAudio.language ? getLanguageName(selectedAudio.language) : '—'}</p>
                                    </div>
                                    <div>
                                      <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Voz</label>
                                      <p className="text-sm text-slate-800">{selectedAudio.voiceName || selectedAudio.voice_id || '—'}</p>
                                    </div>
                                    {selectedAudio.qualities && (
                                      <div>
                                        <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Cualidades / Vibe</label>
                                        <p className="text-xs text-slate-600 whitespace-pre-wrap bg-slate-50 p-3 rounded-xl border border-slate-100">{selectedAudio.qualities}</p>
                                      </div>
                                    )}
                                    {(selectedAudio.usage || selectedAudio.characters_used != null) && (
                                      <div>
                                        <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase">Uso</label>
                                        <p className="text-sm text-slate-600">
                                          {selectedAudio.characters_used ?? selectedAudio.usage?.characters ?? 0} caracteres
                                          {(selectedAudio.cost_usd != null || selectedAudio.usage?.estimatedCostUsd != null) && ` · ${formatCostUsd(selectedAudio.cost_usd ?? selectedAudio.usage?.estimatedCostUsd ?? 0)} USD`}
                                        </p>
                                      </div>
                                    )}
                                    <div className="pt-2">
                                      <button
                                        type="button"
                                        onClick={() => setCurrentPlaying({
                                          url: selectedAudio.url,
                                          text: selectedAudio.text,
                                          characterName: selectedCharacter?.name,
                                        })}
                                        className={`w-full py-3 px-4 rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors ${
                                          currentPlaying?.url === selectedAudio.url
                                            ? 'bg-[#29B6B6] text-white'
                                            : 'bg-[#29B6B6]/10 text-[#29B6B6] hover:bg-[#29B6B6]/20'
                                        }`}
                                      >
                                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                          <path d="M8 5v14l11-7z" />
                                        </svg>
                                        {currentPlaying?.url === selectedAudio.url ? 'Reproduciendo' : 'Reproducir en barra inferior'}
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {characterTab === 'editar' && (
                      <CharacterForm
                        character={selectedCharacter}
                        onUpdate={handleUpdate}
                      />
                    )}
                  </div>
                </div>
              )}

              {/* Modal crear audio */}
              <CreateAudioModal
                isOpen={showCreateAudioModal}
                onClose={() => setShowCreateAudioModal(false)}
                characterName={selectedCharacter?.name ?? ''}
                character={selectedCharacter ?? null}
                onSuccess={() => {
                  if (selectedCharacter) loadAudios(selectedCharacter.id);
                }}
              />
            </div>
          </div>
        </main>
      </div>

      {/* Reproductor global fijo abajo */}
      <AudioPlayerBar
        current={currentPlaying}
        onClose={() => setCurrentPlaying(null)}
      />

      {/* Modal eliminar personaje */}
      <DeleteCharacterModal
        isOpen={!!deleteTarget}
        characterName={deleteTarget?.name ?? ''}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
