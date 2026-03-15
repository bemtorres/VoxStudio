'use client';

import { useState, useEffect } from 'react';
import VoiceSelector from './VoiceSelector';
import { formatCostUsd } from '@/lib/format';
import { buildVoiceInstructions, addLanguageToInstructions } from '@/lib/voiceInstructions';
import { getVoiceName } from '@/lib/voices';

export interface AudioUsage {
  characters: number;
  model: string;
  estimatedCostUsd: number;
}

interface CharacterForInstructions {
  id?: number;
  personality?: string;
  background?: string;
  description?: string;
  voice_instructions?: string;
  voice_id?: string;
}

interface CreateAudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  characterName: string;
  character?: CharacterForInstructions | null;
  folderId?: number | null;
  onSuccess: (audio: {
    id: string;
    text: string;
    voiceId: string;
    voiceName?: string;
    url: string;
    usage?: AudioUsage;
    language?: string;
    qualities?: string;
  }) => void;
}

export default function CreateAudioModal({ isOpen, onClose, characterName, character, folderId, onSuccess }: CreateAudioModalProps) {
  const [voiceId, setVoiceId] = useState('');
  const [text, setText] = useState('');
  const [language, setLanguage] = useState<string>('es');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<'voice' | 'generate'>('voice');
  const [filter, setFilter] = useState<{ is_free: string }>({ is_free: '' });

  useEffect(() => {
    if (isOpen && character?.voice_id) {
      setVoiceId(character.voice_id);
    } else if (isOpen && !character?.voice_id) {
      setVoiceId('alloy');
    }
  }, [isOpen, character?.voice_id]);

  const handleGenerate = async () => {
    if (!text.trim() || !voiceId) return;
    setLoading(true);
    setError(null);
    let instructions = character ? buildVoiceInstructions(character) : '';
    instructions = addLanguageToInstructions(instructions, language);
    try {
      const res = await fetch('/api/voices/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          voice_id: voiceId,
          text: text.trim(),
          language,
          ...(instructions && { instructions }),
        }),
      });
      const data = await res.json();
      if (data.audio && character?.id) {
        const saveRes = await fetch('/api/audios', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            character_id: character.id,
            folder_id: folderId ?? undefined,
            audio: data.audio,
            text: text.trim(),
            voice_id: voiceId,
            voice_name: getVoiceName(voiceId),
            language,
            qualities: character?.voice_instructions || undefined,
            usage: data.usage,
          }),
        });
        const saved = await saveRes.json();
        if (!saveRes.ok) {
          setError(saved.error || 'Error al guardar audio');
        } else if (saved.id) {
          onSuccess({
            id: saved.id,
            text: saved.text,
            voiceId: saved.voice_id,
            voiceName: saved.voice_name,
            url: saved.url || `/${saved.file_path}`,
            usage: saved.characters_used ? { characters: saved.characters_used, model: 'gpt-4o-mini-tts', estimatedCostUsd: saved.cost_usd } : undefined,
            language: saved.language,
            qualities: saved.qualities || undefined,
          });
          setText('');
          setError(null);
          onClose();
        } else {
          setError(saved.error || 'Error al guardar audio');
        }
      } else if (data.audio && !character?.id) {
        setError('No se pudo guardar: personaje no seleccionado');
      } else if (data.error) {
        setError(data.error);
      }
    } catch {
      setError('Error al generar audio');
    }
    setLoading(false);
  };

  const handleClose = () => {
    setStep('voice');
    setText('');
    setError(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={handleClose} />
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-3xl bg-white shadow-2xl border-2 border-[#29B6B6]/20 flex flex-col">
        <div className="px-6 py-4 bg-gradient-to-r from-[#6B2D8C]/10 via-[#3B59AB]/10 to-[#29B6B6]/10 border-b border-[#29B6B6]/20 flex items-center justify-between shrink-0">
          <h3 className="text-lg font-extrabold text-[#373D48]">Crear nuevo audio</h3>
          <button
            onClick={handleClose}
            className="p-2 rounded-xl text-slate-500 hover:bg-[#29B6B6]/10 hover:text-slate-700 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {step === 'voice' ? (
            <>
              <p className="text-sm text-slate-600">Selecciona la voz que usarás para este audio:</p>
              <a
                href="https://openai.fm/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-[#29B6B6]/40 bg-[#29B6B6]/10 text-[#29B6B6] text-sm font-semibold hover:bg-[#29B6B6]/20 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                </svg>
                Escuchar muestras en OpenAI.fm
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
              <div className="flex flex-wrap gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1 uppercase tracking-wider">Precio</label>
                  <select
                    value={filter.is_free}
                    onChange={(e) => setFilter(f => ({ ...f, is_free: e.target.value }))}
                    className="px-3 py-2 rounded-xl border border-[#29B6B6]/30 bg-white text-slate-700 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#29B6B6]/30"
                  >
                    <option value="">Todos</option>
                    <option value="true">Gratis</option>
                    <option value="false">De pago</option>
                  </select>
                </div>
              </div>
              <div className="max-h-[320px] overflow-y-auto -mx-2 px-2">
                <VoiceSelector
                  selectedVoiceId={voiceId}
                  onSelectVoice={setVoiceId}
                  compact
                  externalFilter={{ is_free: filter.is_free }}
                />
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-[#29B6B6]/20">
                <button
                  onClick={handleClose}
                  className="px-5 py-2.5 text-slate-600 font-semibold rounded-xl hover:bg-slate-100 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => voiceId && setStep('generate')}
                  disabled={!voiceId}
                  className="px-6 py-2.5 bg-gradient-to-r from-pink-400 to-rose-400 text-white font-bold rounded-xl shadow-lg shadow-pink-200/50 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
                >
                  Siguiente
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2 text-sm text-slate-500 mb-2">
                <button
                  onClick={() => setStep('voice')}
                  className="hover:text-[#29B6B6] font-medium"
                >
                  ← Cambiar voz
                </button>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-2">Idioma (language)</label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="w-full max-w-[200px] px-4 py-3 rounded-xl border border-pink-100 bg-pink-50/30 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-pink-200 focus:border-pink-200"
                >
                  <option value="es">Español (es)</option>
                  <option value="en">English (en)</option>
                  <option value="fr">Français (fr)</option>
                  <option value="de">Deutsch (de)</option>
                  <option value="it">Italiano (it)</option>
                  <option value="pt">Português (pt)</option>
                  <option value="ja">日本語 (ja)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-2">Texto a convertir</label>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder={`¿Qué quieres que ${characterName || 'el personaje'} diga?`}
                  rows={4}
                  className="w-full px-4 py-3 rounded-xl border border-[#29B6B6]/30 bg-[#29B6B6]/5 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-[#29B6B6]/30 focus:border-[#29B6B6] resize-none placeholder:text-slate-400"
                />
                {text.trim().length > 0 && (
                  <p className="mt-2 text-xs text-slate-500">
                    Estimado: {text.trim().length} caracteres · ~{formatCostUsd((text.trim().length / 1000) * 0.01)} USD
                  </p>
                )}
                {character && (character.personality || character.background || character.description) && (
                  <p className="mt-2 text-xs text-emerald-600">
                    ✓ La personalidad del personaje se aplicará a la voz
                  </p>
                )}
              </div>
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-red-600 text-sm">
                  <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {error}
                </div>
              )}
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setStep('voice')}
                  className="px-5 py-2.5 text-slate-600 font-semibold rounded-xl hover:bg-slate-100 transition-colors"
                >
                  Atrás
                </button>
                <button
                  onClick={handleGenerate}
                  disabled={loading || !text.trim()}
                  className="px-6 py-2.5 bg-[#29B6B6] text-white font-bold rounded-xl shadow-lg shadow-[#29B6B6]/30 hover:bg-[#34d1d1] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Generando...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Generar audio
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
