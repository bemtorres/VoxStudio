/**
 * Mapeador de etiquetas [gestos] para TTS (OpenAI gpt-4o-mini-tts).
 * Las etiquetas tipo [suspenso], [mágica] no son compatibles si el modelo las lee;
 * aquí se quitan del texto y se pasan como instructions.
 *
 * Etiquetas compatibles (no se leen en voz, solo afectan el tono):
 * suspenso, mágica, entusiasmado, serio, firme, risa, irónico, sorpresa, reflexivo,
 * emoción, pausa dramática, susurro, enfático, triste, nervioso, tierno, sarcástico.
 * [gestos] / [gesto] se eliminan sin añadir instrucción.
 */

/** Instrucciones por etiqueta (inglés, para la API de OpenAI). */
const GESTURE_INSTRUCTIONS: Record<string, string> = {
  suspenso:
    'Speak in a lower register, slightly breathless, as if sharing a secret. Increase pauses.',
  mágica:
    'Soft, airy delivery. Use a light, whimsical tone with a musical lilt at the end of sentences.',
  magica:
    'Soft, airy delivery. Use a light, whimsical tone with a musical lilt at the end of sentences.',
  entusiasmado:
    'High energy, fast-paced, with a bright and smiling vocal timbre. Exaggerate the ups and downs.',
  serio:
    'Flat intonation, authoritative and steady. Minimize pitch variation to sound formal.',
  firme:
    'Flat intonation, authoritative and steady. Minimize pitch variation to sound formal.',
  risa:
    "Add a slight chuckle or a 'smiling' tone to the delivery. Sound lighthearted and casual.",
  irónico:
    "Add a slight chuckle or a 'smiling' tone to the delivery. Sound lighthearted and casual.",
  ironico:
    "Add a slight chuckle or a 'smiling' tone to the delivery. Sound lighthearted and casual.",
  sorpresa:
    'Sound surprised, with a slight rise in pitch and emphasis. Brief pause before the line.',
  reflexivo:
    'Thoughtful, slower pace, with pauses as if considering. Softer tone.',
  emoción:
    'Emotional, warm delivery with variation in tone. Slightly slower where emphasis is needed.',
  emocion:
    'Emotional, warm delivery with variation in tone. Slightly slower where emphasis is needed.',
  'pausa dramática':
    'Increase pauses. Dramatic delivery. Use silence for effect.',
  'pausa dramatica':
    'Increase pauses. Dramatic delivery. Use silence for effect.',
  susurro:
    'Whispering, very soft and intimate. Lower volume, breathy.',
  enfático:
    'Strong emphasis on key words. Clear, deliberate delivery.',
  enfatico:
    'Strong emphasis on key words. Clear, deliberate delivery.',
  triste:
    'Melancholic, slower pace. Softer and slightly lower register.',
  nervioso:
    'Slightly faster, with small hesitations. Uneasy tone.',
  tierno:
    'Warm, gentle, affectionate tone. Soft and caring.',
  sarcástico:
    'Dry, slightly mocking tone. Understated emphasis.',
  sarcastico:
    'Dry, slightly mocking tone. Understated emphasis.',
  // Genérico: no añadimos instrucción extra para no sobrecargar
  gestos: '',
  gesto: '',
};

const BRACKET_REGEX = /\[([^\]]+)\]/g;

function normalizeTag(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\u0301/g, '') // quitar acentos para matching
    .replace(/á/g, 'a')
    .replace(/é/g, 'e')
    .replace(/í/g, 'i')
    .replace(/ó/g, 'o')
    .replace(/ú/g, 'u');
}

export interface ParseGestureResult {
  /** Texto sin etiquetas [...] para enviar como input al TTS. */
  cleanText: string;
  /** Instrucciones en inglés para el campo instructions (vacío si no hubo tags conocidos). */
  gestureInstructions: string;
  /** Etiquetas que se encontraron (para debug o UI). */
  tagsFound: string[];
}

/**
 * Parsea el texto, quita etiquetas [xxx] y genera instrucciones de gesticulación.
 * Si hay varias etiquetas, se concatenan sus instrucciones.
 */
export function parseGestureTags(text: string): ParseGestureResult {
  const tagsFound: string[] = [];
  let match: RegExpExecArray | null;
  const seen = new Set<string>();

  BRACKET_REGEX.lastIndex = 0;
  while ((match = BRACKET_REGEX.exec(text)) !== null) {
    const raw = match[1].trim();
    const key = normalizeTag(raw);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    tagsFound.push(raw);
  }

  const instructions: string[] = [];
  for (const key of seen) {
    const normalized = key.replace(/\s+/g, ' ').trim();
    const withSpaces = normalized;
    const noSpaces = normalized.replace(/\s/g, '');
    const instr =
      GESTURE_INSTRUCTIONS[withSpaces] ??
      GESTURE_INSTRUCTIONS[noSpaces] ??
      GESTURE_INSTRUCTIONS[normalized];
    if (instr) instructions.push(instr);
  }

  const cleanText = text.replace(BRACKET_REGEX, '').replace(/\s{2,}/g, ' ').trim();
  const gestureInstructions = instructions.join(' ');

  return {
    cleanText: cleanText || text.trim(),
    gestureInstructions,
    tagsFound,
  };
}
