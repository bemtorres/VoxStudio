import { NextResponse } from 'next/server';
import { getAudioFoldersByCharacterId, getAudiosByCharacterId, getAudiosByFolderId } from '@/lib/db';

/** GET /api/podcast/audio-library?character_ids=1,2,3
 * Devuelve carpetas y audios por personaje para el selector del podcast.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const characterIds = searchParams.get('character_ids');
    if (!characterIds) {
      return NextResponse.json({ error: 'character_ids es obligatorio (ej: 1,2,3)' }, { status: 400 });
    }
    const ids = characterIds.split(',').map(s => parseInt(s.trim(), 10)).filter(Boolean);
    const result: Record<number, { folders: Array<{ id: number; name: string; audio_count: number; audios: unknown[] }>; uncategorized: unknown[] }> = {};

    for (const charId of ids) {
      const folders = getAudioFoldersByCharacterId(charId) as Array<{ id: number; name: string; audio_count: number }>;
      const foldersWithAudios = folders.map(f => {
        const audios = getAudiosByFolderId(f.id) as Array<{ file_path?: string } & Record<string, unknown>>;
        return {
          ...f,
          audios: audios.map(a => ({
            ...(a as Record<string, unknown>),
            url: `/${a.file_path ?? ''}`,
          })),
        };
      });
      const allAudios = getAudiosByCharacterId(charId) as Array<{ folder_id?: number; file_path?: string } & Record<string, unknown>>;
      const uncategorized = allAudios.filter(a => !a.folder_id).map(a => ({
        ...a,
        url: `/${a.file_path ?? ''}`,
      }));
      result[charId] = { folders: foldersWithAudios, uncategorized };
    }
    return NextResponse.json(result);
  } catch (err) {
    console.error('Error getting audio library:', err);
    return NextResponse.json({ error: 'Error al obtener biblioteca' }, { status: 500 });
  }
}
