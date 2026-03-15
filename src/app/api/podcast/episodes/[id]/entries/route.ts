import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import { getPodcastEntries, createPodcastEntry, reorderPodcastEntries } from '@/lib/db';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const entries = getPodcastEntries(parseInt(id, 10));
    return NextResponse.json(entries);
  } catch (err) {
    console.error('Error getting podcast entries:', err);
    return NextResponse.json({ error: 'Error al obtener entradas' }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const episodeId = parseInt(id, 10);
    const body = await request.json().catch(() => ({}));
    const { character_id, text, position, voice_id, voice_name, language, qualities, audio_url } = body;
    if (!character_id || !text) {
      return NextResponse.json({ error: 'character_id y text son obligatorios' }, { status: 400 });
    }
    const entry = createPodcastEntry({
      episode_id: episodeId,
      character_id: parseInt(String(character_id), 10),
      text: String(text).trim(),
      position,
      voice_id,
      voice_name,
      language: language || 'es',
      qualities,
    }) as { id: number };
    if (audio_url && typeof audio_url === 'string') {
      const srcPath = path.join(process.cwd(), 'public', audio_url.replace(/^\//, ''));
      if (fs.existsSync(srcPath)) {
        const dir = path.join(process.cwd(), 'public', 'audios', 'podcast', String(episodeId));
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        const filePath = `audios/podcast/${episodeId}/${entry.id}.mp3`;
        const destPath = path.join(process.cwd(), 'public', filePath);
        fs.copyFileSync(srcPath, destPath);
        const { updatePodcastEntry } = await import('@/lib/db');
        updatePodcastEntry(entry.id, { audio_file_path: filePath });
        return NextResponse.json({ ...entry, audio_file_path: filePath });
      }
    }
    return NextResponse.json(entry);
  } catch (err) {
    console.error('Error creating podcast entry:', err);
    return NextResponse.json({ error: 'Error al crear entrada' }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const episodeId = parseInt(id, 10);
    const body = await request.json().catch(() => ({}));
    if (Array.isArray(body.order)) {
      reorderPodcastEntries(episodeId, body.order.map((x: number) => parseInt(String(x), 10)));
      const entries = getPodcastEntries(episodeId);
      return NextResponse.json(entries);
    }
    return NextResponse.json({ error: 'order (array de ids) es obligatorio' }, { status: 400 });
  } catch (err) {
    console.error('Error reordering podcast entries:', err);
    return NextResponse.json({ error: 'Error al reordenar entradas' }, { status: 500 });
  }
}
