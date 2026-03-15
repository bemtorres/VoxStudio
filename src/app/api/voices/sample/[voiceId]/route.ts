import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { openrouterVoices, VOICE_SAMPLE_TEXT } from '@/lib/voices';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const VALID_IDS = openrouterVoices.map((v) => v.id);

/** Directorio donde se guardan las muestras (public para servir estático después). */
const SAMPLE_DIR = path.join(process.cwd(), 'public', 'audios', 'voice-samples');

function getSamplePath(voiceId: string): string {
  return path.join(SAMPLE_DIR, `${voiceId}.mp3`);
}

async function generateAndSaveSample(voiceId: string): Promise<Buffer> {
  if (!OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY no configurada');
  }
  const voice = VALID_IDS.includes(voiceId) ? voiceId : 'alloy';

  const res = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini-tts',
      voice,
      input: VOICE_SAMPLE_TEXT,
      instructions: 'Speak in Spanish. Clear, neutral tone for a voice sample.',
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(err.slice(0, 200));
  }

  const buffer = Buffer.from(await res.arrayBuffer());
  if (!fs.existsSync(SAMPLE_DIR)) {
    fs.mkdirSync(SAMPLE_DIR, { recursive: true });
  }
  fs.writeFileSync(getSamplePath(voiceId), buffer);
  return buffer;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ voiceId: string }> }
) {
  try {
    const { voiceId } = await params;
    const id = (voiceId || '').toLowerCase();
    if (!VALID_IDS.includes(id)) {
      return NextResponse.json({ error: 'Voz no válida' }, { status: 400 });
    }

    const filePath = getSamplePath(id);
    let buffer: Buffer;

    if (fs.existsSync(filePath)) {
      buffer = fs.readFileSync(filePath);
    } else {
      buffer = await generateAndSaveSample(id);
    }

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'public, max-age=86400',
      },
    });
  } catch (err) {
    console.error('Error serving voice sample:', err);
    const message = err instanceof Error ? err.message : 'Error al generar muestra';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
