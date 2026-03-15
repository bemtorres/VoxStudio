import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import { createAudio, getAudiosByCharacterId, logApiUsage } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const characterId = searchParams.get('character_id');
    const folderId = searchParams.get('folder_id');
    if (!characterId) {
      return NextResponse.json({ error: 'character_id es obligatorio' }, { status: 400 });
    }
    const fid = folderId === 'none' ? null : (folderId ? parseInt(folderId, 10) : undefined);
    const audios = getAudiosByCharacterId(parseInt(characterId), fid);
    return NextResponse.json(audios);
  } catch {
    return NextResponse.json({ error: 'Error al obtener audios' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      character_id,
      folder_id,
      audio: audioBase64,
      text,
      voice_id,
      voice_name,
      language,
      qualities,
      usage,
    } = body;

    if (!character_id || !audioBase64 || !text) {
      return NextResponse.json({ error: 'character_id, audio y text son obligatorios' }, { status: 400 });
    }

    const id = crypto.randomUUID?.() ?? `audio-${Date.now()}`;
    const filePath = `audios/${character_id}/${id}.mp3`;
    const fullPath = path.join(process.cwd(), 'public', filePath);
    const dir = path.dirname(fullPath);

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const buffer = Buffer.from(audioBase64, 'base64');
    fs.writeFileSync(fullPath, buffer);

    const chars = usage?.characters ?? text.length;
    const cost = usage?.estimatedCostUsd ?? (chars / 1000) * 0.01;

    const audio = createAudio({
      id,
      character_id,
      folder_id: folder_id ?? null,
      text,
      voice_id,
      voice_name,
      file_path: filePath,
      language,
      qualities,
      characters_used: chars,
      cost_usd: cost,
    });

    logApiUsage({
      type: 'tts',
      model: 'gpt-4o-mini-tts',
      characters_used: chars,
      cost_usd: cost,
      character_id,
      reference_id: id,
    });

    return NextResponse.json({
      ...(audio as Record<string, unknown>),
      url: `/${filePath}`,
    }, { status: 201 });
  } catch (err) {
    console.error('Error creating audio:', err);
    return NextResponse.json({ error: 'Error al guardar audio' }, { status: 500 });
  }
}
