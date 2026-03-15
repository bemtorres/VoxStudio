'use client';

import { useState, useEffect, useCallback } from 'react';
import { Character } from '@/types';
import AudioPlayerBar, { type NowPlaying } from '@/components/AudioPlayerBar';
import PodcastPanel from '@/components/PodcastPanel';
import AppLayout from '@/components/AppLayout';

export default function PodcastPage() {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPlaying, setCurrentPlaying] = useState<NowPlaying | null>(null);
  const [viewMode, setViewMode] = useState<'escaleta' | 'editor'>('escaleta');

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

  if (loading) {
    return (
      <AppLayout>
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="text-slate-500 font-semibold animate-pulse">Cargando...</div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="flex min-h-[calc(100vh-8rem)]">
        <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
          <div className="rounded-[2rem] bg-white/90 border-2 border-[#29B6B6]/20 shadow-xl overflow-hidden min-h-[480px] flex-1 min-w-0 m-4 md:m-6">
            <PodcastPanel
              characters={characters}
              currentPlaying={currentPlaying}
              onPlay={setCurrentPlaying}
              onViewModeChange={setViewMode}
            />
          </div>
        </div>
      </div>

      {viewMode === 'escaleta' && (
        <AudioPlayerBar
          current={currentPlaying}
          onClose={() => setCurrentPlaying(null)}
        />
      )}
    </AppLayout>
  );
}
