'use client';

import Link from 'next/link';
import { Character } from '@/types';

interface SidebarProps {
  characters: Character[];
  selectedId: number | null;
  onSelect: (id: number) => void;
  onNew: () => void;
  onDelete: (id: number) => void;
}

export default function Sidebar({ characters, selectedId, onSelect, onNew, onDelete }: SidebarProps) {
  return (
    <aside className="w-[300px] bg-surface/50 backdrop-blur-md border-r border-border flex flex-col h-full overflow-hidden">
      <div className="p-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 gradient-primary rounded-xl flex items-center justify-center text-white font-bold shadow-lg shadow-primary/30">
            V
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-text-primary">VoxStudio</h1>
            <p className="text-[10px] uppercase tracking-widest text-text-secondary font-bold opacity-70">Editor de personajes</p>
          </div>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto px-4 py-2 space-y-1">
        {characters.map((char) => (
          <div
            key={char.id}
            className={`group relative flex items-center gap-4 p-3 rounded-xl cursor-pointer transition-all duration-300 ${
              selectedId === char.id
                ? 'bg-primary text-white shadow-lg shadow-primary/20 scale-[1.02]'
                : 'text-text-secondary hover:bg-surface-elevated hover:text-text-primary'
            }`}
            onClick={() => onSelect(char.id)}
          >
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold transition-colors ${
              selectedId === char.id ? 'bg-white/20' : 'bg-surface-elevated'
            }`}>
              {char.name ? char.name.charAt(0).toUpperCase() : '?'}
            </div>
            
            <div className="flex-1 min-w-0">
              <span className="block truncate text-sm font-medium">{char.name}</span>
              <span className={`text-[10px] block opacity-60 ${selectedId === char.id ? 'text-white' : 'text-text-secondary'}`}>
                {char.gender || 'Sin género'} • {char.age || 'Edad N/A'}
              </span>
            </div>

            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(char.id);
              }}
              className={`opacity-0 group-hover:opacity-100 p-1.5 rounded-lg transition-all ${
                selectedId === char.id 
                  ? 'hover:bg-white/20 text-white' 
                  : 'hover:bg-accent-red hover:text-white text-text-secondary'
              }`}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}
        
        {characters.length === 0 && (
          <div className="px-4 py-12 text-center">
            <div className="w-12 h-12 bg-surface rounded-full flex items-center justify-center mx-auto mb-3 opacity-20">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <p className="text-text-secondary text-xs">No hay personajes creados</p>
          </div>
        )}
      </div>
      
      <div className="p-6 bg-surface/30 border-t border-border space-y-3">
        <button
          onClick={onNew}
          className="w-full py-3 px-4 bg-primary hover:bg-primary-hover text-white rounded-xl text-sm font-semibold transition-all shadow-lg shadow-primary/20 transform active:scale-95 flex items-center justify-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
          </svg>
          Nuevo personaje
        </button>
        <Link
          href="/admin"
          className="w-full py-2.5 px-4 bg-surface-elevated hover:bg-surface text-text-secondary hover:text-text-primary rounded-xl text-xs font-medium transition-all flex items-center justify-center gap-2 border border-border/50"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Panel Admin
        </Link>
      </div>
    </aside>
  );
}
