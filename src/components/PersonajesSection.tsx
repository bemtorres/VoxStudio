'use client';

import { useState, useEffect, useCallback } from 'react';
import { Character } from '@/types';
import CharacterForm from './CharacterForm';
import CreateAudioModal from './CreateAudioModal';
import AudioFoldersView from './AudioFoldersView';
import type { NowPlaying } from './AudioPlayerBar';

interface PersonajesSectionProps {
  characters: Character[];
  onCharactersChange: (chars: Character[]) => void;
  currentPlaying: NowPlaying | null;
  onPlay: (item: NowPlaying) => void;
  showCreateFromProfile?: boolean;
  onCloseCreateFromProfile?: () => void;
  onDeleteClick?: (char: Character) => void;
}

export default function PersonajesSection({
  characters,
  onCharactersChange,
  currentPlaying,
  onPlay,
  showCreateFromProfile: showCreateFromProfileProp,
  onCloseCreateFromProfile,
  onDeleteClick,
}: PersonajesSectionProps) {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [showCreateFromProfileLocal, setShowCreateFromProfileLocal] = useState(false);
  const showCreateFromProfile = showCreateFromProfileProp ?? showCreateFromProfileLocal;
  const setShowCreateFromProfile = (v: boolean) => {
    setShowCreateFromProfileLocal(v);
    if (!v) onCloseCreateFromProfile?.();
  };
  const [createProfile, setCreateProfile] = useState({ name: '', age: '', gender: '' });
  const [characterTab, setCharacterTab] = useState<'audios' | 'editar'>('audios');
  const [showCreateAudioModal, setShowCreateAudioModal] = useState(false);
  const [createAudioFolderId, setCreateAudioFolderId] = useState<number | null | undefined>(undefined);
  const [loadAudiosTrigger, setLoadAudiosTrigger] = useState(0);

  const selectedCharacter = characters.find(c => c.id === selectedId) || null;

  useEffect(() => {
    if (selectedId && !characters.some(c => c.id === selectedId)) {
      setSelectedId(null);
    }
  }, [characters, selectedId]);

  const handleCreate = useCallback(async (initialData?: { name?: string; age?: string; gender?: string }) => {
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
      onCharactersChange([newChar, ...characters]);
      setSelectedId(newChar.id);
      setShowCreateFromProfile(false);
      setCreateProfile({ name: '', age: '', gender: '' });
    } catch (error) {
      console.error('Failed to create character:', error);
    }
  }, [characters, onCharactersChange]);

  const handleCreateFromProfile = () => {
    handleCreate({
      name: createProfile.name || 'Personaje',
      age: createProfile.age,
      gender: createProfile.gender,
    });
  };

  const handleUpdate = useCallback(async (id: number, data: Partial<Character>) => {
    try {
      await fetch(`/api/characters/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      onCharactersChange(characters.map(c => c.id === id ? { ...c, ...data } : c));
    } catch (error) {
      console.error('Failed to update character:', error);
    }
  }, [characters, onCharactersChange]);


  const handleAudioCreated = useCallback(() => {
    setLoadAudiosTrigger(prev => prev + 1);
  }, []);

  return (
    <>
      {/* Aside: Listado de personajes */}
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
                      onDeleteClick?.(char);
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

      {/* Main: Workspace */}
      <main className="flex-1 min-w-0 flex flex-col overflow-hidden">
        <div className={`flex-1 overflow-y-auto p-6 md:p-8 ${currentPlaying ? 'pb-28' : ''}`}>
          <div className="rounded-[2rem] bg-white/90 border-2 border-[#29B6B6]/20 shadow-xl overflow-hidden min-h-[480px]">
            {/* Crear desde perfil */}
            {showCreateFromProfile && !selectedCharacter && (
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

            {/* Sin selección */}
            {!showCreateFromProfile && !selectedCharacter && (
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

            {/* Personaje seleccionado */}
            {selectedCharacter && (
              <div className="flex flex-col h-full min-h-[480px]">
                <div className="sticky top-0 z-10 px-6 py-4 bg-gradient-to-r from-[#6B2D8C]/10 via-[#3B59AB]/10 to-[#29B6B6]/10 border-b border-[#29B6B6]/20 shrink-0 backdrop-blur-sm bg-white/95">
                  <p className="text-xs text-slate-500 mb-1">Personajes &gt; {selectedCharacter.name || 'Sin nombre'}</p>
                  <h2 className="text-xl font-extrabold text-slate-800">{selectedCharacter.name || 'Sin nombre'}</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {selectedCharacter.gender || '—'} • {selectedCharacter.age || '—'} • Personaliza y asigna voz
                  </p>
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

                <div className="flex-1 overflow-y-auto p-6 min-h-0">
                  {characterTab === 'audios' && (
                    <div className="h-full min-h-[400px]">
                      <AudioFoldersView
                        key={loadAudiosTrigger}
                        characterId={selectedCharacter.id}
                        characterName={selectedCharacter.name || 'Sin nombre'}
                        onPlay={onPlay}
                        currentPlayingUrl={currentPlaying?.url}
                        onCreateAudio={(folderId) => {
                          setCreateAudioFolderId(folderId);
                          setShowCreateAudioModal(true);
                        }}
                      />
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
          </div>

          <CreateAudioModal
            isOpen={showCreateAudioModal}
            onClose={() => { setShowCreateAudioModal(false); setCreateAudioFolderId(undefined); }}
            characterName={selectedCharacter?.name ?? ''}
            character={selectedCharacter ?? null}
            folderId={createAudioFolderId}
            onSuccess={handleAudioCreated}
          />
        </div>
      </main>
    </>
  );
}
