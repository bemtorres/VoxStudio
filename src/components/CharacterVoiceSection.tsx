'use client';

import { Character } from '@/types';
import { useState, useEffect, useCallback } from 'react';
import { PREDEFINED_VIBES } from '@/lib/vibes';
import VoiceSelector from '@/components/VoiceSelector';

interface CharacterVoiceSectionProps {
  character: Character | null;
  onUpdate: (id: number, data: Partial<Character>) => void;
}

const inputClass = 'w-full px-4 py-2.5 rounded-xl border border-border bg-surface-elevated text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all';

export default function CharacterVoiceSection({ character, onUpdate }: CharacterVoiceSectionProps) {
  const [voiceId, setVoiceId] = useState('');
  const [voiceInstructions, setVoiceInstructions] = useState('');
  const [selectedVibeId, setSelectedVibeId] = useState<string | null>(null);
  const [generatingInstructions, setGeneratingInstructions] = useState(false);

  useEffect(() => {
    if (character) {
      setVoiceId(character.voice_id || '');
      setVoiceInstructions(character.voice_instructions || '');
      const matchingVibe = PREDEFINED_VIBES.find(v => v.instructions === (character.voice_instructions || ''));
      const hasCustomGenerated = (character.voice_instructions || '').trim() && !matchingVibe;
      setSelectedVibeId(matchingVibe?.id ?? (hasCustomGenerated ? 'generated' : null));
    }
  }, [character?.id, character?.voice_id, character?.voice_instructions]);

  const handleSelectVibe = useCallback((vibeId: string) => {
    if (!character) return;
    if (vibeId === 'none') {
      setSelectedVibeId(null);
      setVoiceInstructions('');
      onUpdate(character.id, { voice_instructions: '' });
      return;
    }
    if (vibeId === 'generated') {
      setSelectedVibeId('generated');
      return;
    }
    const vibe = PREDEFINED_VIBES.find(v => v.id === vibeId);
    if (vibe) {
      setSelectedVibeId(vibeId);
      setVoiceInstructions(vibe.instructions);
      onUpdate(character.id, { voice_instructions: vibe.instructions });
    }
  }, [character, onUpdate]);

  const handleGenerateInstructions = useCallback(async () => {
    if (!character) return;
    setGeneratingInstructions(true);
    try {
      const res = await fetch('/api/voices/generate-instructions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: character.name,
          personality: character.personality,
          background: character.background,
          description: character.description,
        }),
      });
      const data = await res.json();
      if (data.instructions) {
        setSelectedVibeId('generated');
        setVoiceInstructions(data.instructions);
        onUpdate(character.id, { voice_instructions: data.instructions });
      } else if (data.error) {
        alert(data.error);
      }
    } catch {
      alert('Error al generar instrucciones');
    }
    setGeneratingInstructions(false);
  }, [character, onUpdate]);

  if (!character) {
    return (
      <div className="py-12 text-center text-text-secondary text-sm">
        Selecciona un personaje para configurar su voz.
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h3 className="text-sm font-bold text-text-primary mb-1 flex items-center gap-2">
          <span className="w-1 h-5 rounded-full bg-[#29B6B6]" />
          Timbre de voz
        </h3>
        <p className="text-[11px] text-text-secondary opacity-70 mb-3">
          Elige la voz base del personaje. Puedes reproducir una muestra en español antes de elegir.
        </p>
        <VoiceSelector
          selectedVoiceId={voiceId || 'alloy'}
          onSelectVoice={(id) => {
            setVoiceId(id);
            onUpdate(character.id, { voice_id: id });
          }}
          compact
        />
      </div>

      <div className="border-t border-border/50 pt-8">
        <h3 className="text-sm font-bold text-text-primary mb-2 flex items-center gap-2">
          <span className="w-1 h-5 rounded-full bg-[#29B6B6]" />
          Vibe de la voz
        </h3>
        <p className="text-[11px] text-text-secondary opacity-70 mb-4">
          Elige un estilo predefinido o genera uno personalizado desde las características del personaje.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          <button
            type="button"
            onClick={() => handleSelectVibe('none')}
            className={`p-4 rounded-2xl border-2 text-left transition-all text-sm font-semibold flex flex-col relative ${
              selectedVibeId === null && !voiceInstructions
                ? 'border-primary bg-primary/20 text-primary ring-2 ring-primary/30 shadow-lg shadow-primary/10'
                : 'border-border bg-surface-elevated hover:border-primary/50 text-text-primary'
            }`}
          >
            {selectedVibeId === null && !voiceInstructions && (
              <span className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              </span>
            )}
            <span className="flex-1">Ninguno</span>
          </button>
          {PREDEFINED_VIBES.map((vibe) => (
            <button
              key={vibe.id}
              type="button"
              onClick={() => handleSelectVibe(vibe.id)}
              className={`p-4 rounded-2xl border-2 text-left transition-all text-sm font-semibold flex flex-col relative ${
                selectedVibeId === vibe.id
                  ? 'border-primary bg-primary/20 text-primary ring-2 ring-primary/30 shadow-lg shadow-primary/10'
                  : 'border-border bg-surface-elevated hover:border-primary/50 text-text-primary'
              }`}
            >
              {selectedVibeId === vibe.id && (
                <span className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                </span>
              )}
              <span className="flex-1">{vibe.name}</span>
            </button>
          ))}
          {voiceInstructions && !PREDEFINED_VIBES.some(v => v.instructions === voiceInstructions) && (
            <button
              type="button"
              onClick={() => handleSelectVibe('generated')}
              className={`p-4 rounded-2xl border-2 text-left transition-all text-sm font-semibold flex flex-col relative ${
                selectedVibeId === 'generated'
                  ? 'border-emerald-500 bg-emerald-500/20 text-emerald-600 ring-2 ring-emerald-500/30 shadow-lg shadow-emerald-500/10'
                  : 'border-emerald-500/50 bg-surface-elevated hover:border-emerald-500/70 text-text-primary'
              }`}
            >
              {selectedVibeId === 'generated' && (
                <span className="absolute top-2 right-2 w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                </span>
              )}
              <span className="flex-1">Generado</span>
              <span className="text-[10px] opacity-70">IA · Este personaje</span>
            </button>
          )}
          <button
            type="button"
            onClick={handleGenerateInstructions}
            disabled={generatingInstructions || (!character.personality && !character.background && !character.description)}
            className="p-4 rounded-2xl border-2 border-dashed border-border bg-surface/50 hover:bg-surface hover:border-primary/50 transition-all flex flex-col items-center justify-center gap-2 text-text-secondary disabled:opacity-50 disabled:cursor-not-allowed"
            title="Generar con IA desde personalidad, trasfondo y descripción"
          >
            {generatingInstructions ? (
              <span className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            ) : (
              <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            )}
            <span className="text-xs font-medium">Generar con IA</span>
          </button>
        </div>
        <div className="mt-4">
          <div className="flex items-center gap-2 mb-1">
            <label className="text-[10px] font-bold text-text-secondary opacity-80">Instrucciones actuales</label>
            <span
              className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                voiceInstructions.trim()
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-slate-100 text-slate-500'
              }`}
            >
              {voiceInstructions.trim() ? 'Asignadas' : 'Sin asignar'}
            </span>
          </div>
          <textarea
            value={voiceInstructions}
            onChange={(e) => {
              const v = e.target.value;
              setVoiceInstructions(v);
              setSelectedVibeId(PREDEFINED_VIBES.some(x => x.instructions === v) ? PREDEFINED_VIBES.find(x => x.instructions === v)!.id : (v.trim() ? 'generated' : null));
              onUpdate(character.id, { voice_instructions: v });
            }}
            placeholder="Voice Affect: ... Tone: ... (o elige un vibe arriba)"
            rows={5}
            className={`${inputClass} resize-none text-xs`}
          />
        </div>
      </div>
    </div>
  );
}
