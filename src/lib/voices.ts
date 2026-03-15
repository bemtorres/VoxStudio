import { Voice } from '@/types';

// Voces de gpt-4o-mini-tts (soporta instructions para personalización)
// https://platform.openai.com/docs/models/gpt-4o-mini-tts
export const openrouterVoices: Voice[] = [
  { id: 'alloy', name: 'Alloy', provider: 'openai', gender: 'neutral', language: 'en', is_free: false, price_per_1k_chars: 0.01 },
  { id: 'ash', name: 'Ash', provider: 'openai', gender: 'neutral', language: 'en', is_free: false, price_per_1k_chars: 0.01 },
  { id: 'ballad', name: 'Ballad', provider: 'openai', gender: 'neutral', language: 'en', is_free: false, price_per_1k_chars: 0.01 },
  { id: 'cedar', name: 'Cedar', provider: 'openai', gender: 'male', language: 'en', is_free: false, price_per_1k_chars: 0.01 },
  { id: 'coral', name: 'Coral', provider: 'openai', gender: 'female', language: 'en', is_free: false, price_per_1k_chars: 0.01 },
  { id: 'echo', name: 'Echo', provider: 'openai', gender: 'male', language: 'en', is_free: false, price_per_1k_chars: 0.01 },
  { id: 'fable', name: 'Fable', provider: 'openai', gender: 'neutral', language: 'en', is_free: false, price_per_1k_chars: 0.01 },
  { id: 'marin', name: 'Marin', provider: 'openai', gender: 'female', language: 'en', is_free: false, price_per_1k_chars: 0.01 },
  { id: 'nova', name: 'Nova', provider: 'openai', gender: 'female', language: 'en', is_free: false, price_per_1k_chars: 0.01 },
  { id: 'onyx', name: 'Onyx', provider: 'openai', gender: 'male', language: 'en', is_free: false, price_per_1k_chars: 0.01 },
  { id: 'sage', name: 'Sage', provider: 'openai', gender: 'neutral', language: 'en', is_free: false, price_per_1k_chars: 0.01 },
  { id: 'shimmer', name: 'Shimmer', provider: 'openai', gender: 'female', language: 'en', is_free: false, price_per_1k_chars: 0.01 },
  { id: 'verse', name: 'Verse', provider: 'openai', gender: 'neutral', language: 'en', is_free: false, price_per_1k_chars: 0.01 },
];

export function getVoiceName(voiceId: string): string {
  const voice = openrouterVoices.find(v => v.id === voiceId);
  return voice?.name ?? voiceId;
}

export function filterVoices(filter: { is_free?: boolean; gender?: string; language?: string }) {
  return openrouterVoices.filter(voice => {
    if (filter.is_free !== undefined && voice.is_free !== filter.is_free) return false;
    if (filter.gender && voice.gender !== filter.gender) return false;
    if (filter.language && voice.language !== filter.language && voice.language !== 'multi') return false;
    return true;
  });
}
