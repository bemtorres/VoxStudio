import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getCharacterById, getPodcastEntryById, updatePodcastEntry, logApiUsage } from '@/lib/db';
import { buildVoiceInstructions, addLanguageToInstructions } from '@/lib/voiceInstructions';
import { getVoiceName } from '@/lib/voices';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const VALID_VOICES = ['alloy', 'ash', 'ballad', 'cedar', 'coral', 'echo', 'fable', 'marin', 'nova', 'onyx', 'sage', 'shimmer', 'verse'];

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string; entryId: string }> }
) {
  try {
    const { id, entryId } = await params;
    const episodeId = parseInt(id, 10);
    const entryIdNum = parseInt(entryId, 10);

    if (!OPENAI_API_KEY) {
      return NextResponse.json({ error: 'Configura OPENAI_API_KEY en .env' }, { status: 500 });
    }

    const entry = getPodcastEntryById(entryIdNum);
    if (!entry || (entry.episode_id as number) !== episodeId) {
      return NextResponse.json({ error: 'Entrada no encontrada' }, { status: 404 });
    }

    const character = getCharacterById(entry.character_id as number) as Record<string, unknown> | undefined;
    const voiceId = (entry.voice_id as string) || (character?.voice_id as string) || 'alloy';
    const voice = VALID_VOICES.includes(voiceId) ? voiceId : 'alloy';
    const text = String(entry.text || '').trim();
    if (!text) {
      return NextResponse.json({ error: 'Texto vacío' }, { status: 400 });
    }

    let instructions = character ? buildVoiceInstructions(character) : '';
    instructions = addLanguageToInstructions(instructions, (entry.language as string) || 'es');
    if (entry.qualities) instructions = `${instructions}\n${entry.qualities}`.trim();

    const body: Record<string, unknown> = {
      model: 'gpt-4o-mini-tts',
      voice,
      input: text,
    };
    if (instructions.trim()) body.instructions = instructions.trim();

    const response = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errText = await response.text();
      return NextResponse.json({ error: errText.slice(0, 200) }, { status: response.status });
    }

    const audioBuffer = await response.arrayBuffer();
    const dir = path.join(process.cwd(), 'public', 'audios', 'podcast', String(episodeId));
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const filePath = `audios/podcast/${episodeId}/${entryId}.mp3`;
    const fullPath = path.join(process.cwd(), 'public', filePath);
    fs.writeFileSync(fullPath, Buffer.from(audioBuffer));

    const charactersUsed = text.length;
    const costUsd = (charactersUsed / 1000) * 0.01;
    logApiUsage({ type: 'tts', model: 'gpt-4o-mini-tts', characters_used: charactersUsed, cost_usd: costUsd, character_id: entry.character_id as number, reference_id: `podcast-${entryId}` });

    updatePodcastEntry(entryIdNum, {
      audio_file_path: filePath,
      voice_id: voice,
      voice_name: getVoiceName(voice),
    });

    return NextResponse.json({
      url: `/${filePath}`,
      file_path: filePath,
      usage: { characters: charactersUsed, cost_usd: costUsd },
    });
  } catch (err) {
    console.error('Error synthesizing podcast entry:', err);
    return NextResponse.json({ error: 'Error al sintetizar' }, { status: 500 });
  }
}
