import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const dbPath = path.join(process.cwd(), 'voces.db');
const db = new Database(dbPath);

db.exec(`
  CREATE TABLE IF NOT EXISTS audio_folders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    character_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS audios (
    id TEXT PRIMARY KEY,
    character_id INTEGER NOT NULL,
    folder_id INTEGER,
    text TEXT NOT NULL,
    voice_id TEXT DEFAULT '',
    voice_name TEXT DEFAULT '',
    file_path TEXT NOT NULL,
    language TEXT DEFAULT '',
    qualities TEXT DEFAULT '',
    characters_used INTEGER DEFAULT 0,
    cost_usd REAL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE,
    FOREIGN KEY (folder_id) REFERENCES audio_folders(id) ON DELETE SET NULL
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
  info = db.prepare("PRAGMA table_info(audios)").all() as { name: string }[];
  if (!info.some(c => c.name === 'folder_id')) {
    db.exec('ALTER TABLE audios ADD COLUMN folder_id INTEGER REFERENCES audio_folders(id) ON DELETE SET NULL');
  }
} catch {
  // ignorar si ya existe
}

db.exec(`
  CREATE TABLE IF NOT EXISTS podcast_episodes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL DEFAULT 'Nuevo episodio',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS podcast_cast (
    episode_id INTEGER NOT NULL,
    character_id INTEGER NOT NULL,
    PRIMARY KEY (episode_id, character_id),
    FOREIGN KEY (episode_id) REFERENCES podcast_episodes(id) ON DELETE CASCADE,
    FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS podcast_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    episode_id INTEGER NOT NULL,
    character_id INTEGER NOT NULL,
    text TEXT NOT NULL,
    position INTEGER NOT NULL DEFAULT 0,
    audio_file_path TEXT,
    voice_id TEXT DEFAULT '',
    voice_name TEXT DEFAULT '',
    language TEXT DEFAULT 'es',
    qualities TEXT DEFAULT '',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (episode_id) REFERENCES podcast_episodes(id) ON DELETE CASCADE,
    FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE
  )
`);

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
  type: 'tts' | 'instructions' | 'dialogue';
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
  const audios = getAudiosByCharacterId(id) as { file_path?: string }[];
  for (const a of audios) {
    try {
      const fullPath = path.join(process.cwd(), 'public', a.file_path ?? '');
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
  folder_id?: number | null;
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
    INSERT INTO audios (id, character_id, folder_id, text, voice_id, voice_name, file_path, language, qualities, characters_used, cost_usd)
    VALUES (@id, @character_id, @folder_id, @text, @voice_id, @voice_name, @file_path, @language, @qualities, @characters_used, @cost_usd)
  `);
  stmt.run({
    id: data.id,
    character_id: data.character_id,
    folder_id: data.folder_id ?? null,
    text: data.text,
    voice_id: data.voice_id || '',
    voice_name: data.voice_name || '',
    file_path: data.file_path,
    language: data.language || '',
    qualities: data.qualities || '',
    characters_used: data.characters_used ?? 0,
    cost_usd: data.cost_usd ?? 0,
  });
  touchAudioFolder(data.folder_id);
  return getAudioById(data.id);
}

function touchAudioFolder(folderId: number | null | undefined) {
  if (folderId) db.prepare('UPDATE audio_folders SET updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(folderId);
}

export function getAudioFoldersByCharacterId(characterId: number) {
  return db.prepare(`
    SELECT f.*, COUNT(a.id) as audio_count
    FROM audio_folders f
    LEFT JOIN audios a ON a.folder_id = f.id
    WHERE f.character_id = ?
    GROUP BY f.id
    ORDER BY f.updated_at DESC
  `).all(characterId) as (Record<string, unknown> & { audio_count: number })[];
}

export function getAudioFolderById(id: number) {
  return db.prepare('SELECT * FROM audio_folders WHERE id = ?').get(id);
}

export function createAudioFolder(characterId: number, name: string) {
  const stmt = db.prepare('INSERT INTO audio_folders (character_id, name) VALUES (?, ?)');
  const result = stmt.run(characterId, name);
  return getAudioFolderById(result.lastInsertRowid as number);
}

export function updateAudioFolder(id: number, name: string) {
  db.prepare('UPDATE audio_folders SET name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(name, id);
  return getAudioFolderById(id);
}

export function deleteAudioFolder(id: number) {
  db.prepare('UPDATE audios SET folder_id = NULL WHERE folder_id = ?').run(id);
  return db.prepare('DELETE FROM audio_folders WHERE id = ?').run(id);
}

export function moveAudioToFolder(audioId: string, folderId: number | null) {
  const audio = getAudioById(audioId) as { folder_id?: number } | undefined;
  db.prepare('UPDATE audios SET folder_id = ? WHERE id = ?').run(folderId, audioId);
  if (audio?.folder_id) touchAudioFolder(audio.folder_id);
  if (folderId) touchAudioFolder(folderId);
  return getAudioById(audioId);
}

export function getAudiosByCharacterId(characterId: number, folderId?: number | null) {
  if (folderId === null) {
    return db.prepare('SELECT * FROM audios WHERE character_id = ? AND (folder_id IS NULL OR folder_id = 0) ORDER BY created_at DESC').all(characterId);
  }
  if (typeof folderId === 'number') {
    return db.prepare('SELECT * FROM audios WHERE character_id = ? AND folder_id = ? ORDER BY created_at DESC').all(characterId, folderId);
  }
  return db.prepare('SELECT * FROM audios WHERE character_id = ? ORDER BY created_at DESC').all(characterId);
}

export function getAudiosByFolderId(folderId: number) {
  return db.prepare('SELECT * FROM audios WHERE folder_id = ? ORDER BY created_at DESC').all(folderId);
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

// Podcast
export function getAllPodcastEpisodes() {
  return db.prepare('SELECT * FROM podcast_episodes ORDER BY updated_at DESC').all();
}

export function getPodcastEpisodeById(id: number) {
  return db.prepare('SELECT * FROM podcast_episodes WHERE id = ?').get(id);
}

export function createPodcastEpisode(title?: string) {
  const stmt = db.prepare('INSERT INTO podcast_episodes (title) VALUES (?)');
  const result = stmt.run(title || 'Nuevo episodio');
  return getPodcastEpisodeById(result.lastInsertRowid as number);
}

export function updatePodcastEpisode(id: number, data: { title?: string }) {
  db.prepare('UPDATE podcast_episodes SET title = COALESCE(?, title), updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(data.title ?? null, id);
  return getPodcastEpisodeById(id);
}

export function deletePodcastEpisode(id: number) {
  const podcastDir = path.join(process.cwd(), 'public', 'audios', 'podcast', String(id));
  if (fs.existsSync(podcastDir)) {
    try {
      fs.rmSync(podcastDir, { recursive: true });
    } catch {
      // ignorar
    }
  }
  db.prepare('DELETE FROM podcast_cast WHERE episode_id = ?').run(id);
  db.prepare('DELETE FROM podcast_entries WHERE episode_id = ?').run(id);
  return db.prepare('DELETE FROM podcast_episodes WHERE id = ?').run(id);
}

export function getPodcastCast(episodeId: number) {
  return db.prepare(`
    SELECT c.* FROM characters c
    INNER JOIN podcast_cast pc ON pc.character_id = c.id
    WHERE pc.episode_id = ?
    ORDER BY c.name
  `).all(episodeId);
}

export function addCharacterToPodcastCast(episodeId: number, characterId: number) {
  try {
    db.prepare('INSERT OR IGNORE INTO podcast_cast (episode_id, character_id) VALUES (?, ?)').run(episodeId, characterId);
    return true;
  } catch {
    return false;
  }
}

export function removeCharacterFromPodcastCast(episodeId: number, characterId: number) {
  return db.prepare('DELETE FROM podcast_cast WHERE episode_id = ? AND character_id = ?').run(episodeId, characterId);
}

export function getPodcastEntryById(id: number) {
  return db.prepare(`
    SELECT e.*, c.name as character_name, c.avatar_path as character_avatar_path, c.voice_id as character_voice_id, c.voice_instructions as character_voice_instructions
    FROM podcast_entries e
    INNER JOIN characters c ON c.id = e.character_id
    WHERE e.id = ?
  `).get(id) as Record<string, unknown> | undefined;
}

export function getPodcastEntries(episodeId: number) {
  return db.prepare(`
    SELECT e.*, c.name as character_name, c.avatar_path as character_avatar_path, c.voice_id as character_voice_id, c.voice_instructions as character_voice_instructions
    FROM podcast_entries e
    INNER JOIN characters c ON c.id = e.character_id
    WHERE e.episode_id = ?
    ORDER BY e.position ASC, e.id ASC
  `).all(episodeId);
}

function touchPodcastEpisode(episodeId: number) {
  db.prepare('UPDATE podcast_episodes SET updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(episodeId);
}

export function createPodcastEntry(data: {
  episode_id: number;
  character_id: number;
  text: string;
  position?: number;
  voice_id?: string;
  voice_name?: string;
  language?: string;
  qualities?: string;
}) {
  const maxPos = db.prepare('SELECT COALESCE(MAX(position), -1) + 1 as next FROM podcast_entries WHERE episode_id = ?').get(data.episode_id) as { next: number };
  const position = data.position ?? maxPos.next;
  const stmt = db.prepare(`
    INSERT INTO podcast_entries (episode_id, character_id, text, position, voice_id, voice_name, language, qualities)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const result = stmt.run(
    data.episode_id,
    data.character_id,
    data.text,
    position,
    data.voice_id || '',
    data.voice_name || '',
    data.language || 'es',
    data.qualities || '',
  );
  touchPodcastEpisode(data.episode_id);
  return db.prepare(`
    SELECT e.*, c.name as character_name, c.avatar_path as character_avatar_path, c.voice_id as character_voice_id, c.voice_instructions as character_voice_instructions
    FROM podcast_entries e
    INNER JOIN characters c ON c.id = e.character_id
    WHERE e.id = ?
  `).get(result.lastInsertRowid) as Record<string, unknown>;
}

export function updatePodcastEntry(id: number, data: Partial<{
  character_id: number;
  text: string;
  position: number;
  audio_file_path: string;
  voice_id: string;
  voice_name: string;
  language: string;
  qualities: string;
}>) {
  const keys = Object.keys(data).filter(k => data[k as keyof typeof data] !== undefined) as (keyof typeof data)[];
  if (keys.length > 0) {
    const setClause = keys.map(k => `${k} = ?`).join(', ');
    const values = keys.map(k => data[k]);
    db.prepare(`UPDATE podcast_entries SET ${setClause} WHERE id = ?`).run(...values, id);
    const ep = db.prepare('SELECT episode_id FROM podcast_entries WHERE id = ?').get(id) as { episode_id?: number } | undefined;
    if (ep?.episode_id) touchPodcastEpisode(ep.episode_id);
  }
  return db.prepare(`
    SELECT e.*, c.name as character_name, c.avatar_path as character_avatar_path, c.voice_id as character_voice_id, c.voice_instructions as character_voice_instructions
    FROM podcast_entries e
    INNER JOIN characters c ON c.id = e.character_id
    WHERE e.id = ?
  `).get(id) as Record<string, unknown>;
}

export function deletePodcastEntry(id: number) {
  const entry = db.prepare('SELECT * FROM podcast_entries WHERE id = ?').get(id) as { episode_id?: number; audio_file_path?: string } | undefined;
  if (entry?.audio_file_path) {
    try {
      const fullPath = path.join(process.cwd(), 'public', entry.audio_file_path);
      if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
    } catch {
      // ignorar
    }
  }
  if (entry?.episode_id) touchPodcastEpisode(entry.episode_id);
  return db.prepare('DELETE FROM podcast_entries WHERE id = ?').run(id);
}

export function reorderPodcastEntries(episodeId: number, orderedIds: number[]) {
  const update = db.prepare('UPDATE podcast_entries SET position = ? WHERE id = ? AND episode_id = ?');
  orderedIds.forEach((id, i) => update.run(i, id, episodeId));
  touchPodcastEpisode(episodeId);
}
