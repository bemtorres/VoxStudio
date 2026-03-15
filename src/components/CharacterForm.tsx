'use client';

import { Character } from '@/types';
import { useState, useEffect, useCallback, useRef } from 'react';
import { PREDEFINED_VIBES } from '@/lib/vibes';

interface CharacterFormProps {
  character: Character | null;
  onUpdate: (id: number, data: Partial<Character>) => void;
}

export default function CharacterForm({ character, onUpdate }: CharacterFormProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    name: '',
    age: '',
    gender: '',
    personality: '',
    background: '',
    description: '',
    tags: '',
    voice_instructions: '',
  });
  const [selectedVibeId, setSelectedVibeId] = useState<string | null>(null);
  const [generatingInstructions, setGeneratingInstructions] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  useEffect(() => {
    if (character) {
      setFormData({
        name: character.name || '',
        age: character.age || '',
        gender: character.gender || '',
        personality: character.personality || '',
        background: character.background || '',
        description: character.description || '',
        tags: character.tags || '',
        voice_instructions: character.voice_instructions || '',
      });
      const matchingVibe = PREDEFINED_VIBES.find(v => v.instructions === (character.voice_instructions || ''));
      const hasCustomGenerated = (character.voice_instructions || '').trim() && !matchingVibe;
      setSelectedVibeId(matchingVibe?.id ?? (hasCustomGenerated ? 'generated' : null));
    }
  }, [character?.id]);

  const handleChange = useCallback((field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (character) {
      onUpdate(character.id, { [field]: value });
    }
    if (field === 'voice_instructions') {
      const matchingVibe = PREDEFINED_VIBES.find(v => v.instructions === value);
      setSelectedVibeId(matchingVibe?.id ?? (value.trim() ? 'generated' : null));
    }
  }, [character, onUpdate]);

  const handleSelectVibe = useCallback((vibeId: string) => {
    if (!character) return;
    if (vibeId === 'none') {
      setSelectedVibeId(null);
      setFormData(prev => ({ ...prev, voice_instructions: '' }));
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
      setFormData(prev => ({ ...prev, voice_instructions: vibe.instructions }));
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
          name: formData.name,
          personality: formData.personality,
          background: formData.background,
          description: formData.description,
        }),
      });
      const data = await res.json();
      if (data.instructions) {
        setSelectedVibeId('generated');
        setFormData(prev => ({ ...prev, voice_instructions: data.instructions }));
        onUpdate(character.id, { voice_instructions: data.instructions });
      } else if (data.error) {
        alert(data.error);
      }
    } catch {
      alert('Error al generar instrucciones');
    }
    setGeneratingInstructions(false);
  }, [character, formData.name, formData.personality, formData.background, formData.description, onUpdate]);

  const handleAvatarClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleAvatarChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!character) return;
    const file = e.target.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      alert('Formato no permitido. Usa JPEG, PNG o WebP.');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      alert('La imagen no puede superar 2 MB.');
      return;
    }
    setUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(`/api/characters/${character.id}/avatar`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (data.avatar_path) {
        onUpdate(character.id, { avatar_path: data.avatar_path });
      } else if (data.error) {
        alert(data.error);
      }
    } catch {
      alert('Error al subir la imagen');
    }
    setUploadingAvatar(false);
    e.target.value = '';
  }, [character, onUpdate]);

  const handleRemoveAvatar = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!character?.avatar_path) return;
    if (!confirm('¿Quitar la imagen del personaje?')) return;
    setUploadingAvatar(true);
    try {
      const res = await fetch(`/api/characters/${character.id}/avatar`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok) {
        onUpdate(character.id, { avatar_path: '' });
      } else if (data.error) {
        alert(data.error);
      }
    } catch {
      alert('Error al eliminar la imagen');
    }
    setUploadingAvatar(false);
  }, [character, onUpdate]);

  if (!character) {
    return (
      <div className="h-[60vh] flex items-center justify-center text-text-secondary">
         {/* ... skip rendering as it is handled by page.tsx now ... */}
      </div>
    );
  }

  const inputClass = "w-full px-4 py-2.5 bg-surface-elevated border border-border rounded-xl text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-zinc-600";
  const labelClass = "block text-[11px] font-bold text-text-secondary mb-2 uppercase tracking-widest opacity-80";

  const avatarUrl = character.avatar_path ? `/${character.avatar_path}` : null;

  return (
    <div className="space-y-10">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleAvatarChange}
        className="hidden"
      />
      <div className="flex flex-col md:flex-row items-start md:items-center gap-8">
        <div className="relative group/avatar shrink-0">
          <button
            type="button"
            onClick={handleAvatarClick}
            disabled={uploadingAvatar}
            className="relative w-32 h-32 rounded-3xl overflow-hidden flex items-center justify-center shadow-2xl transition-all hover:ring-4 hover:ring-[#29B6B6]/30 focus:outline-none focus:ring-4 focus:ring-[#29B6B6]/40 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {avatarUrl ? (
              <img src={avatarUrl} alt={formData.name || 'Avatar'} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full gradient-primary flex items-center justify-center text-5xl font-bold text-white">
                {formData.name ? formData.name.charAt(0).toUpperCase() : '?'}
              </div>
            )}
            <div className="absolute inset-0 bg-black/0 group-hover/avatar:bg-black/30 transition-colors flex items-center justify-center">
              <div className="opacity-0 group-hover/avatar:opacity-100 transition-opacity bg-white/90 p-3 rounded-xl shadow-lg">
                {uploadingAvatar ? (
                  <span className="w-6 h-6 border-2 border-[#29B6B6]/30 border-t-[#29B6B6] rounded-full animate-spin block" />
                ) : (
                  <svg className="w-6 h-6 text-[#29B6B6]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  </svg>
                )}
              </div>
            </div>
          </button>
          {avatarUrl && (
            <button
              type="button"
              onClick={handleRemoveAvatar}
              disabled={uploadingAvatar}
              className="absolute -bottom-1 -right-1 p-2 rounded-xl bg-red-100 text-red-600 hover:bg-red-200 transition-colors shadow-lg text-xs font-semibold"
              title="Quitar imagen"
            >
              Quitar
            </button>
          )}
        </div>

        <div className="flex-1 w-full space-y-2">
          <label className={labelClass}>Identidad del Personaje</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => handleChange('name', e.target.value)}
            placeholder="Introduce un nombre..."
            className="w-full bg-transparent border-none p-0 text-4xl font-black text-text-primary focus:ring-0 placeholder:text-zinc-800"
          />
          <div className="h-px w-full bg-linear-to-r from-primary/50 to-transparent"></div>
          <p className="text-xs text-text-secondary mt-1">Haz clic en el avatar para subir una imagen (JPEG, PNG o WebP, máx. 2 MB)</p>
        </div>
      </div>

      <div className="border-t border-border/50 pt-8">
        <h3 className="text-sm font-bold text-text-primary mb-6 flex items-center gap-2">
          <span className="w-1 h-5 rounded-full bg-[#29B6B6]" />
          Datos básicos
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Edad</label>
              <input
                type="text"
                value={formData.age}
                onChange={(e) => handleChange('age', e.target.value)}
                placeholder="Ej: 24 años"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Género</label>
              <select
                value={formData.gender}
                onChange={(e) => handleChange('gender', e.target.value)}
                className={inputClass}
              >
                <option value="">Seleccionar...</option>
                <option value="male">Masculino</option>
                <option value="female">Femenino</option>
                <option value="non-binary">No binario</option>
                <option value="other">Otro</option>
              </select>
            </div>
          </div>

          <div>
            <label className={labelClass}>Personalidad</label>
            <textarea
              value={formData.personality}
              onChange={(e) => handleChange('personality', e.target.value)}
              placeholder="¿Cómo se comporta este personaje? Para personalizar la voz, usa formato: Accent/Affect: ..., Tone: ..., Pacing: ..., Emotion: ..."
              rows={3}
              className={`${inputClass} resize-none`}
            />
            <p className="mt-1 text-[10px] text-text-secondary opacity-60">
              Se usa para dar tono y estilo a la voz generada (gpt-4o-mini-tts).
            </p>
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <label className={labelClass}>Trasfondo / Historia</label>
            <textarea
              value={formData.background}
              onChange={(e) => handleChange('background', e.target.value)}
              placeholder="Explica su origen y motivaciones..."
              rows={6}
              className={`${inputClass} resize-none`}
            />
          </div>
        </div>
        </div>
      </div>

      <div className="border-t border-border/50 pt-8">
        <h3 className="text-sm font-bold text-text-primary mb-6 flex items-center gap-2">
          <span className="w-1 h-5 rounded-full bg-[#29B6B6]" />
          Apariencia y etiquetas
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <label className={labelClass}>Descripción Física</label>
          <textarea
            value={formData.description}
            onChange={(e) => handleChange('description', e.target.value)}
            placeholder="Rasgos distintivos, vestimenta..."
            rows={3}
            className={`${inputClass} resize-none`}
          />
        </div>
        <div>
          <label className={labelClass}>Etiquetas / Tags</label>
          <input
            type="text"
            value={formData.tags}
            onChange={(e) => handleChange('tags', e.target.value)}
            placeholder="ia, creativo, amigable..."
            className={inputClass}
          />
          <p className="mt-2 text-[10px] text-text-secondary opacity-50 italic">* Separa las etiquetas con comas</p>
        </div>
        </div>
      </div>

      <div className="border-t border-border/50 pt-8">
        <h3 className="text-sm font-bold text-text-primary mb-2 flex items-center gap-2">
          <span className="w-1 h-5 rounded-full bg-[#29B6B6]" />
          Vibe de la voz
        </h3>
      <div className="space-y-4 mt-4">
        <p className="text-[11px] text-text-secondary opacity-70">
          Elige un estilo predefinido o genera uno personalizado desde las características del personaje.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          <button
            type="button"
            onClick={() => handleSelectVibe('none')}
            className={`p-4 rounded-2xl border-2 text-left transition-all text-sm font-semibold flex flex-col relative ${
              selectedVibeId === null && !formData.voice_instructions
                ? 'border-primary bg-primary/20 text-primary ring-2 ring-primary/30 shadow-lg shadow-primary/10'
                : 'border-border bg-surface-elevated hover:border-primary/50 text-text-primary'
            }`}
          >
            {selectedVibeId === null && !formData.voice_instructions && (
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
          {formData.voice_instructions && !PREDEFINED_VIBES.some(v => v.instructions === formData.voice_instructions) && (
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
            disabled={generatingInstructions || (!formData.personality && !formData.background && !formData.description)}
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
        {formData.voice_instructions && (
          <div className="mt-2">
            <label className="block text-[10px] font-bold text-text-secondary mb-1 opacity-80">Instrucciones actuales</label>
            <textarea
              value={formData.voice_instructions}
              onChange={(e) => handleChange('voice_instructions', e.target.value)}
              placeholder="Voice Affect: ... Tone: ..."
              rows={5}
              className={`${inputClass} resize-none text-xs`}
            />
          </div>
        )}
      </div>
      </div>
    </div>
  );
}

