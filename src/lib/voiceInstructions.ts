const LANGUAGE_NAMES_API: Record<string, string> = {
  en: 'English', es: 'Spanish', fr: 'French', de: 'German', it: 'Italian', pt: 'Portuguese', ja: 'Japanese',
};

export const LANGUAGE_NAMES: Record<string, string> = {
  en: 'English', es: 'Español', fr: 'Français', de: 'Deutsch', it: 'Italiano', pt: 'Português', ja: '日本語',
};

export function getLanguageName(code: string): string {
  return LANGUAGE_NAMES[code] || code;
}

/**
 * Añade la instrucción de idioma a las instructions existentes.
 */
export function addLanguageToInstructions(instructions: string, language: string): string {
  if (!language || language === 'auto') return instructions;
  const langName = LANGUAGE_NAMES_API[language] || language;
  const langLine = `Language: ${langName}. Speak in ${langName}.`;
  return instructions ? `${langLine} ${instructions}` : langLine;
}

/**
 * Construye instructions para gpt-4o-mini-tts a partir de los datos del personaje.
 * Prioridad: voice_instructions > personalidad con formato estructurado > combinación de campos.
 */
export function buildVoiceInstructions(character: {
  personality?: string;
  background?: string;
  description?: string;
  voice_instructions?: string;
}): string {
  const vi = (character.voice_instructions || '').trim();
  if (vi) return vi;

  const parts: string[] = [];
  const p = (character.personality || '').trim();
  const b = (character.background || '').trim();
  const d = (character.description || '').trim();

  // Si la personalidad ya tiene formato estructurado (Accent/Affect:, Tone:, etc.), usarla directamente
  const hasStructuredFormat =
    /^(Accent|Tone|Pacing|Emotion|Pronunciation|Personality|Voice Affect)\s*[\/:]/im.test(p) ||
    /^(Affect|Ritmo|Emoción)\s*[\/:]/im.test(p);

  if (hasStructuredFormat && p) {
    return p;
  }

  if (p) parts.push(`Personality and how to speak: ${p}`);
  if (b) parts.push(`Background and context: ${b}`);
  if (d) parts.push(`Vocal style and traits: ${d}`);

  return parts.join('. ');
}
