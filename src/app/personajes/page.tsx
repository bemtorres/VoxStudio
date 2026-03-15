'use client';

import { useState, useEffect, useCallback } from 'react';
import { Character } from '@/types';
import DeleteCharacterModal from '@/components/DeleteCharacterModal';
import AudioPlayerBar, { type NowPlaying } from '@/components/AudioPlayerBar';
import PersonajesSection from '@/components/PersonajesSection';
import AppLayout from '@/components/AppLayout';

export default function PersonajesPage() {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateFromProfile, setShowCreateFromProfile] = useState(false);
  const [currentPlaying, setCurrentPlaying] = useState<NowPlaying | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; name: string } | null>(null);

  const loadCharacters = useCallback(async () => {
    try {
      const res = await fetch('/api/characters');
      const data = await res.json();
      setCharacters(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to load characters:', error);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadCharacters();
  }, [loadCharacters]);

  const handleDeleteClick = (char: Character) => {
    setDeleteTarget({ id: char.id, name: char.name || 'Sin nombre' });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      await fetch(`/api/characters/${deleteTarget.id}`, { method: 'DELETE' });
      setCharacters(prev => prev.filter(c => c.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (error) {
      console.error('Failed to delete character:', error);
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="text-slate-500 font-semibold animate-pulse">Cargando personajes...</div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout
      headerActions={
        <>
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
            onClick={async () => {
              try {
                const res = await fetch('/api/characters', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ name: 'Nuevo Personaje', age: '', gender: '' }),
                });
                const newChar = await res.json();
                setCharacters(prev => [newChar, ...prev]);
              } catch (e) {
                console.error(e);
              }
            }}
            className="px-3 py-2 rounded-xl text-sm font-semibold bg-[#3B59AB]/15 text-[#3B59AB] hover:bg-[#3B59AB]/25 transition-all flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span className="hidden sm:inline">Nuevo</span>
          </button>
        </>
      }
    >
      <div className="flex min-h-[calc(100vh-8rem)]">
        <PersonajesSection
          characters={characters}
          onCharactersChange={setCharacters}
          currentPlaying={currentPlaying}
          onPlay={setCurrentPlaying}
          showCreateFromProfile={showCreateFromProfile}
          onCloseCreateFromProfile={() => setShowCreateFromProfile(false)}
          onDeleteClick={handleDeleteClick}
        />
      </div>

      <AudioPlayerBar current={currentPlaying} onClose={() => setCurrentPlaying(null)} />

      <DeleteCharacterModal
        isOpen={!!deleteTarget}
        characterName={deleteTarget?.name ?? ''}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
      />
    </AppLayout>
  );
}
