import { NextResponse } from 'next/server';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
// gpt-4o-mini-tts: cedar, marin, verse, shimmer, sage, onyx, nova, fable, echo, coral, ballad, ash, alloy
const VALID_VOICES = ['alloy', 'ash', 'ballad', 'cedar', 'coral', 'echo', 'fable', 'marin', 'nova', 'onyx', 'sage', 'shimmer', 'verse'];

export async function POST(request: Request) {
  try {
    const { voice_id, text, instructions } = await request.json();

    if (!voice_id || !text) {
      return NextResponse.json({ error: 'voice_id y text son obligatorios' }, { status: 400 });
    }

    if (!OPENAI_API_KEY) {
      return NextResponse.json({
        error: 'Configura OPENAI_API_KEY en .env para generar audio.',
      }, { status: 500 });
    }

    const voice = VALID_VOICES.includes(voice_id) ? voice_id : 'alloy';

    // gpt-4o-mini-tts soporta instructions para personalizar tono, emoción, acento, etc.
    const body: Record<string, unknown> = {
      model: 'gpt-4o-mini-tts',
      voice,
      input: text,
    };
    if (instructions && typeof instructions === 'string' && instructions.trim()) {
      body.instructions = instructions.trim();
    }

    const response = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      const isHtml = errorText.trim().toLowerCase().startsWith('<!doctype') || errorText.trim().toLowerCase().startsWith('<html');
      const message = isHtml
        ? 'Error del servicio de audio. Comprueba que OPENAI_API_KEY esté configurada correctamente.'
        : (errorText.length > 200 ? errorText.slice(0, 200) + '...' : errorText);
      return NextResponse.json({ error: message }, { status: response.status });
    }

    const audioBuffer = await response.arrayBuffer();
    const base64 = Buffer.from(audioBuffer).toString('base64');

    // gpt-4o-mini-tts: ~$0.01/1K caracteres
    const characters = text.length;
    const pricePer1kChars = 0.01;
    const estimatedCostUsd = (characters / 1000) * pricePer1kChars;

    return NextResponse.json({
      audio: base64,
      usage: {
        characters,
        model: 'gpt-4o-mini-tts',
        estimatedCostUsd,
      },
    });
  } catch {
    return NextResponse.json({ error: 'Error al generar el audio' }, { status: 500 });
  }
}
