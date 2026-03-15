'use client';

import { Character } from '@/types';
import { useState, useEffect, useCallback, useRef } from 'react';

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
  });
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
      });
    }
  }, [character?.id]);

  const handleChange = useCallback((field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (character) {
      onUpdate(character.id, { [field]: value });
    }
  }, [character, onUpdate]);

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

    </div>
  );
}

