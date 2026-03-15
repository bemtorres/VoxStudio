import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const dbPath = path.join(process.cwd(), 'voces.db');
const db = new Database(dbPath);

db.exec(`
  CREATE TABLE IF NOT EXISTS audios (
    id TEXT PRIMARY KEY,
    character_id INTEGER NOT NULL,
    text TEXT NOT NULL,
    voice_id TEXT DEFAULT '',
    voice_name TEXT DEFAULT '',
    file_path TEXT NOT NULL,
    language TEXT DEFAULT '',
    qualities TEXT DEFAULT '',
    characters_used INTEGER DEFAULT 0,
    cost_usd REAL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS characters (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    age TEXT DEFAULT '',
    gender TEXT DEFAULT '',
    personality TEXT DEFAULT '',
    background TEXT DEFAULT '',
    description TEXT DEFAULT '',
    tags TEXT DEFAULT '',
    voice_id TEXT DEFAULT '',
    voice_provider TEXT DEFAULT 'openrouter',
    voice_instructions TEXT DEFAULT '',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Migración: añadir columnas si no existen (para BDs antiguas)
try {
  let info = db.prepare("PRAGMA table_info(characters)").all() as { name: string }[];
  if (!info.some(c => c.name === 'voice_instructions')) {
    db.exec('ALTER TABLE characters ADD COLUMN voice_instructions TEXT DEFAULT ""');
  }
  info = db.prepare("PRAGMA table_info(characters)").all() as { name: string }[];
  if (!info.some(c => c.name === 'avatar_path')) {
    db.exec('ALTER TABLE characters ADD COLUMN avatar_path TEXT DEFAULT ""');
  }
} catch {
  // ignorar si ya existe
}

db.exec(`
  CREATE TABLE IF NOT EXISTS api_usage (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL,
    model TEXT DEFAULT '',
    characters_used INTEGER DEFAULT 0,
    cost_usd REAL DEFAULT 0,
    character_id INTEGER,
    reference_id TEXT,
    details TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (character_id) REFERENCES characters(id)
  )
`);

export default db;

export function logApiUsage(data: {
  type: 'tts' | 'instructions';
  model: string;
  characters_used?: number;
  cost_usd?: number;
  character_id?: number;
  reference_id?: string;
  details?: string;
}) {
  const stmt = db.prepare(`
    INSERT INTO api_usage (type, model, characters_used, cost_usd, character_id, reference_id, details)
    VALUES (@type, @model, @characters_used, @cost_usd, @character_id, @reference_id, @details)
  `);
  stmt.run({
    type: data.type,
    model: data.model || '',
    characters_used: data.characters_used ?? 0,
    cost_usd: data.cost_usd ?? 0,
    character_id: data.character_id ?? null,
    reference_id: data.reference_id ?? null,
    details: data.details ?? null,
  });
}

export function getApiUsageSummary() {
  const total = db.prepare(`
    SELECT 
      COALESCE(SUM(cost_usd), 0) as total_cost,
      COALESCE(SUM(characters_used), 0) as total_characters,
      COUNT(*) as total_calls
    FROM api_usage
  `).get() as { total_cost: number; total_characters: number; total_calls: number };
  const byType = db.prepare(`
    SELECT type, model, SUM(cost_usd) as cost, SUM(characters_used) as chars, COUNT(*) as calls
    FROM api_usage
    GROUP BY type, model
  `).all();
  return { ...total, byType };
}

export function getApiUsageLog(limit = 100, offset = 0) {
  return db.prepare(`
    SELECT u.*, c.name as character_name
    FROM api_usage u
    LEFT JOIN characters c ON u.character_id = c.id
    ORDER BY u.created_at DESC
    LIMIT ? OFFSET ?
  `).all(limit, offset);
}

export function getAllCharacters() {
  return db.prepare('SELECT * FROM characters ORDER BY updated_at DESC').all();
}

export function getCharacterById(id: number) {
  return db.prepare('SELECT * FROM characters WHERE id = ?').get(id);
}

export function createCharacter(data: {
  name: string;
  age?: string;
  gender?: string;
  personality?: string;
  background?: string;
  description?: string;
  tags?: string;
  voice_id?: string;
  voice_provider?: string;
  voice_instructions?: string;
  avatar_path?: string;
}) {
  const stmt = db.prepare(`
    INSERT INTO characters (name, age, gender, personality, background, description, tags, voice_id, voice_provider, voice_instructions, avatar_path)
    VALUES (@name, @age, @gender, @personality, @background, @description, @tags, @voice_id, @voice_provider, @voice_instructions, @avatar_path)
  `);
  const result = stmt.run({ ...data, age: data.age || '', gender: data.gender || '', personality: data.personality || '', background: data.background || '', description: data.description || '', tags: data.tags || '', voice_id: data.voice_id || '', voice_provider: data.voice_provider || 'openrouter', voice_instructions: data.voice_instructions || '', avatar_path: data.avatar_path || '' });
  return getCharacterById(result.lastInsertRowid as number);
}

export function updateCharacter(id: number, data: Partial<{
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
  avatar_path: string;
}>) {
  const fields = Object.keys(data).map(key => `${key} = @${key}`).join(', ');
  const stmt = db.prepare(`UPDATE characters SET ${fields}, updated_at = CURRENT_TIMESTAMP WHERE id = @id`);
  stmt.run({ ...data, id });
  return getCharacterById(id);
}

export function deleteCharacter(id: number) {
  const audios = getAudiosByCharacterId(id);
  for (const a of audios) {
    try {
      const fullPath = path.join(process.cwd(), 'public', a.file_path);
      if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
    } catch {
      // ignorar si el archivo no existe
    }
  }
  const char = getCharacterById(id) as { avatar_path?: string } | undefined;
  if (char?.avatar_path) {
    try {
      const avatarPath = path.join(process.cwd(), 'public', char.avatar_path);
      if (fs.existsSync(avatarPath)) fs.unlinkSync(avatarPath);
    } catch {
      // ignorar
    }
    const charDir = path.join(process.cwd(), 'public', 'characters', String(id));
    if (fs.existsSync(charDir)) {
      try {
        fs.rmdirSync(charDir);
      } catch {
        // ignorar si no está vacía
      }
    }
  }
  db.prepare('DELETE FROM audios WHERE character_id = ?').run(id);
  return db.prepare('DELETE FROM characters WHERE id = ?').run(id);
}

export function createAudio(data: {
  id: string;
  character_id: number;
  text: string;
  voice_id?: string;
  voice_name?: string;
  file_path: string;
  language?: string;
  qualities?: string;
  characters_used?: number;
  cost_usd?: number;
}) {
  const stmt = db.prepare(`
    INSERT INTO audios (id, character_id, text, voice_id, voice_name, file_path, language, qualities, characters_used, cost_usd)
    VALUES (@id, @character_id, @text, @voice_id, @voice_name, @file_path, @language, @qualities, @characters_used, @cost_usd)
  `);
  stmt.run({
    id: data.id,
    character_id: data.character_id,
    text: data.text,
    voice_id: data.voice_id || '',
    voice_name: data.voice_name || '',
    file_path: data.file_path,
    language: data.language || '',
    qualities: data.qualities || '',
    characters_used: data.characters_used ?? 0,
    cost_usd: data.cost_usd ?? 0,
  });
  return getAudioById(data.id);
}

export function getAudiosByCharacterId(characterId: number) {
  return db.prepare('SELECT * FROM audios WHERE character_id = ? ORDER BY created_at DESC').all(characterId);
}

export function getAudioById(id: string) {
  return db.prepare('SELECT * FROM audios WHERE id = ?').get(id);
}

export function deleteAudio(id: string) {
  const audio = getAudioById(id) as { file_path?: string } | undefined;
  if (audio?.file_path) {
    try {
      const fullPath = path.join(process.cwd(), 'public', audio.file_path);
      if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
    } catch {
      // ignorar
    }
  }
  return db.prepare('DELETE FROM audios WHERE id = ?').run(id);
}
