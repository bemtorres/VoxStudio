'use client';

import { useState, useEffect, useCallback } from 'react';

type Folder = { id: number; name: string; audio_count: number; updated_at?: string };
type AudioItem = {
  id: string;
  text: string;
  voice_id: string;
  url: string;
  characters_used?: number;
  usage?: { characters: number };
  folder_id?: number | null;
};

const FOLDER_COLORS = [
  'from-emerald-500/30 to-teal-500/30',
  'from-violet-500/30 to-purple-500/30',
  'from-amber-500/30 to-orange-500/30',
  'from-blue-500/30 to-cyan-500/30',
  'from-rose-500/30 to-pink-500/30',
  'from-indigo-500/30 to-blue-500/30',
];

function formatAgo(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return 'Hoy';
    if (diffDays === 1) return 'Ayer';
    if (diffDays < 7) return `${diffDays}d`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} sem`;
    return `${Math.floor(diffDays / 30)} mes`;
  } catch {
    return '';
  }
}

interface AudioFoldersViewProps {
  characterId: number;
  characterName: string;
  onPlay: (item: { url: string; text: string; characterName?: string }) => void;
  currentPlayingUrl?: string | null;
  onCreateAudio: (folderId?: number | null) => void;
}

export default function AudioFoldersView({
  characterId,
  characterName,
  onPlay,
  currentPlayingUrl,
  onCreateAudio,
}: AudioFoldersViewProps) {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<number | null | 'uncategorized'>('uncategorized');
  const [audios, setAudios] = useState<AudioItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [moveTarget, setMoveTarget] = useState<{ audioId: string; text: string } | null>(null);

  const loadFolders = useCallback(async () => {
    try {
      const res = await fetch(`/api/characters/${characterId}/folders`);
      const data = await res.json();
      setFolders(Array.isArray(data) ? data : []);
    } catch {
      setFolders([]);
    }
  }, [characterId]);

  const loadAudios = useCallback(async (folderId: number | null | 'uncategorized') => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ character_id: String(characterId) });
      if (folderId === 'uncategorized' || folderId === null) {
        params.set('folder_id', 'none'); // audios sin carpeta
      } else if (typeof folderId === 'number') {
        params.set('folder_id', String(folderId));
      }
      const res = await fetch(`/api/audios?${params}`);
      const data = await res.json();
      const list = Array.isArray(data) ? data : [];
      setAudios(list.map((a: Record<string, unknown>) => ({
        id: String(a.id ?? ''),
        text: String(a.text ?? ''),
        voice_id: String(a.voice_id ?? ''),
        url: a.url ? String(a.url) : `/${a.file_path ?? ''}`,
        characters_used: a.characters_used as number | undefined,
        usage: a.usage as { characters: number } | undefined,
        folder_id: a.folder_id as number | undefined,
      })));
    } catch {
      setAudios([]);
    }
    setLoading(false);
  }, [characterId]);

  useEffect(() => {
    loadFolders();
  }, [loadFolders]);

  useEffect(() => {
    if (selectedFolderId === 'uncategorized') {
      loadAudios(null);
    } else if (selectedFolderId !== null) {
      loadAudios(selectedFolderId);
    }
  }, [selectedFolderId, loadAudios]);

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    try {
      await fetch(`/api/characters/${characterId}/folders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newFolderName.trim() }),
      });
      setNewFolderName('');
      setShowNewFolder(false);
      loadFolders();
    } catch {
      // ignore
    }
  };

  const handleMoveToFolder = async (audioId: string, folderId: number | null) => {
    try {
      await fetch(`/api/audios/${audioId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folder_id: folderId }),
      });
      setMoveTarget(null);
      loadAudios(selectedFolderId);
      loadFolders();
    } catch {
      // ignore
    }
  };

  const handleDeleteFolder = async (folderId: number) => {
    if (!confirm('¿Eliminar carpeta? Los audios quedarán sin carpeta.')) return;
    try {
      await fetch(`/api/characters/${characterId}/folders/${folderId}`, { method: 'DELETE' });
      if (selectedFolderId === folderId) setSelectedFolderId('uncategorized');
      loadFolders();
      loadAudios('uncategorized');
    } catch {
      // ignore
    }
  };

  const viewMode = selectedFolderId === null ? 'folders' : 'audios';

  return (
    <div className="flex gap-4 h-full min-h-0">
      {/* Lista de carpetas (estilo imagen) */}
      <div className="w-56 shrink-0 flex flex-col border-r border-[#29B6B6]/20 pr-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-slate-700">Carpetas</h3>
          <button
            onClick={() => setShowNewFolder(true)}
            className="p-1.5 rounded-lg text-[#29B6B6] hover:bg-[#29B6B6]/10"
            title="Nueva carpeta"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>
        {showNewFolder && (
          <div className="mb-3 flex gap-2">
            <input
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="Nombre"
              className="flex-1 px-2 py-1.5 rounded-lg border border-[#29B6B6]/30 text-sm"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
            />
            <button onClick={handleCreateFolder} className="px-2 py-1.5 bg-[#29B6B6] text-white rounded-lg text-sm font-semibold">Crear</button>
            <button onClick={() => { setShowNewFolder(false); setNewFolderName(''); }} className="px-2 py-1.5 text-slate-500 text-sm">×</button>
          </div>
        )}
        <div className="space-y-1 overflow-y-auto min-h-0">
          <button
            onClick={() => setSelectedFolderId('uncategorized')}
            className={`w-full flex items-center gap-3 p-2.5 rounded-xl text-left transition-colors ${
              selectedFolderId === 'uncategorized' ? 'bg-slate-200/80' : 'hover:bg-slate-100'
            }`}
          >
            <div className="w-10 h-10 rounded-lg bg-slate-200 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-800 truncate">Sin carpeta</p>
              <p className="text-xs text-slate-500">Audios sin organizar</p>
            </div>
          </button>
          {folders.map((f, i) => (
            <div
              key={f.id}
              role="button"
              tabIndex={0}
              onClick={() => setSelectedFolderId(f.id)}
              onKeyDown={(e) => e.key === 'Enter' && setSelectedFolderId(f.id)}
              className={`w-full flex items-center gap-3 p-2.5 rounded-xl text-left transition-colors group cursor-pointer ${
                selectedFolderId === f.id ? 'bg-[#29B6B6]/15 border border-[#29B6B6]/30' : 'hover:bg-slate-100'
              }`}
            >
              <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${FOLDER_COLORS[i % FOLDER_COLORS.length]} flex items-center justify-center shrink-0`}>
                <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012 2v6M5 11v6" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-800 truncate">{f.name}</p>
                <p className="text-xs text-slate-500">{f.audio_count} audios{f.updated_at ? ` · ${formatAgo(f.updated_at)}` : ''}</p>
              </div>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); handleDeleteFolder(f.id); }}
                className="p-1 opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500"
                title="Eliminar carpeta"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Audios de la carpeta seleccionada */}
      <div className="flex-1 min-w-0 flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-slate-800">
            {selectedFolderId === 'uncategorized' ? 'Audios sin carpeta' : folders.find(f => f.id === selectedFolderId)?.name ?? 'Audios'}
          </h3>
          <button
            onClick={() => onCreateAudio(selectedFolderId === 'uncategorized' ? null : (typeof selectedFolderId === 'number' ? selectedFolderId : undefined))}
            className="px-4 py-2.5 bg-[#29B6B6] text-white text-sm font-bold rounded-xl shadow-lg shadow-[#29B6B6]/30 hover:bg-[#34d1d1] flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Crear nuevo
          </button>
        </div>
        {loading ? (
          <div className="py-12 text-center text-slate-500">Cargando...</div>
        ) : audios.length === 0 ? (
          <div className="py-16 text-center bg-[#29B6B6]/5 rounded-2xl border-2 border-dashed border-[#29B6B6]/30">
            <p className="text-slate-600 font-medium">No hay audios en esta carpeta</p>
            <p className="text-sm text-slate-500 mt-1">Crea uno nuevo o mueve audios desde otra carpeta</p>
            <button
              onClick={() => onCreateAudio(selectedFolderId === 'uncategorized' ? null : (typeof selectedFolderId === 'number' ? selectedFolderId : undefined))}
              className="mt-4 px-5 py-2.5 bg-[#29B6B6]/20 text-[#29B6B6] rounded-xl text-sm font-semibold hover:bg-[#29B6B6]/30"
            >
              Crear audio
            </button>
          </div>
        ) : (
          <div className="space-y-3 overflow-y-auto">
            {audios.map((audio) => (
              <div
                key={audio.id}
                className="flex items-center gap-4 p-4 rounded-2xl border border-[#29B6B6]/20 bg-white shadow-sm"
              >
                <div className="w-10 h-10 rounded-xl bg-[#29B6B6]/20 flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5 text-[#29B6B6]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{audio.text}</p>
                  <p className="text-xs text-slate-500">
                    {audio.characters_used ?? audio.usage?.characters ? `${audio.characters_used ?? audio.usage?.characters} caracteres` : 'Audio'}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => onPlay({ url: audio.url, text: audio.text, characterName })}
                    className={`p-2.5 rounded-xl transition-colors ${
                      currentPlayingUrl === audio.url ? 'bg-[#29B6B6] text-white' : 'bg-[#29B6B6]/10 text-[#29B6B6] hover:bg-[#29B6B6]/20'
                    }`}
                    title="Reproducir"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </button>
                  <div className="relative">
                    <button
                      onClick={() => setMoveTarget(moveTarget?.audioId === audio.id ? null : { audioId: audio.id, text: audio.text })}
                      className="p-2 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200"
                      title="Mover a carpeta"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                      </svg>
                    </button>
                    {moveTarget?.audioId === audio.id && (
                      <div className="absolute right-0 top-full mt-1 py-2 bg-white rounded-xl shadow-lg border border-slate-200 z-10 min-w-[160px]">
                        <button
                          onClick={() => handleMoveToFolder(audio.id, null)}
                          className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50"
                        >
                          Sin carpeta
                        </button>
                        {folders.map(f => (
                          <button
                            key={f.id}
                            onClick={() => handleMoveToFolder(audio.id, f.id)}
                            className="w-full px-4 py-2 text-left text-sm hover:bg-slate-50"
                          >
                            {f.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <a
                    href={audio.url}
                    download={`${characterName}-${audio.id.slice(0, 8)}.mp3`}
                    className="p-2 rounded-lg bg-[#29B6B6]/10 text-[#29B6B6] hover:bg-[#29B6B6]/20"
                    title="Descargar"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
