export interface Character {
  id: number;
  name: string;
  age: string;
  gender: string;
  personality: string;
  background: string;
  description: string;
  tags: string;
  voice_id: string;
  voice_provider: string;
  voice_instructions: string;
  avatar_path?: string;
  created_at: string;
  updated_at: string;
}

export interface Voice {
  id: string;
  name: string;
  provider: string;
  gender?: string;
  language?: string;
  is_free: boolean;
  price_per_1k_chars?: number;
}

export interface VoiceFilter {
  provider?: string;
  is_free?: boolean;
  gender?: string;
  language?: string;
}
