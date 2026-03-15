import { NextResponse } from 'next/server';
import { logApiUsage } from '@/lib/db';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
// gpt-4o-mini: $0.15/1M input, $0.60/1M output (approx)
const INPUT_PRICE = 0.15 / 1_000_000;
const OUTPUT_PRICE = 0.60 / 1_000_000;

const SYSTEM_PROMPT = `Eres un experto en dirección de voz para text-to-speech. Genera instrucciones estructuradas que controlen el tono, emoción, ritmo y personalidad de una voz sintética.

Formato de salida (en inglés, para compatibilidad con la API):
Voice Affect: [descripción del acento/afecto general]
Tone: [tono de voz - cómo suena]
Pacing: [ritmo - rápido, lento, pausado]
Emotion: [emoción predominante]
Pronunciation: [cómo articular ciertas palabras]
Pauses: [cuándo y cómo hacer pausas]

Genera SOLO el texto de las instrucciones, sin explicaciones adicionales. Cada sección en una línea. Sé específico y evocador.`;

export async function POST(request: Request) {
  try {
    const { personality, background, description, name } = await request.json();

    if (!OPENAI_API_KEY) {
      return NextResponse.json({
        error: 'Configura OPENAI_API_KEY en .env para generar instrucciones.',
      }, { status: 500 });
    }

    const characterSummary = [
      name && `Nombre: ${name}`,
      personality && `Personalidad: ${personality}`,
      background && `Trasfondo: ${background}`,
      description && `Descripción física: ${description}`,
    ].filter(Boolean).join('\n');

    if (!characterSummary.trim()) {
      return NextResponse.json({
        error: 'Añade al menos personalidad, trasfondo o descripción del personaje.',
      }, { status: 400 });
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          {
            role: 'user',
            content: `Genera instrucciones de voz para este personaje:\n\n${characterSummary}`,
          },
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      return NextResponse.json({ error: err || 'Error al generar' }, { status: response.status });
    }

    const data = await response.json();
    const instructions = data.choices?.[0]?.message?.content?.trim();

    if (!instructions) {
      return NextResponse.json({ error: 'No se generaron instrucciones' }, { status: 500 });
    }

    const usage = data.usage;
    const promptTokens = usage?.prompt_tokens ?? 0;
    const completionTokens = usage?.completion_tokens ?? 0;
    const costUsd = (promptTokens * INPUT_PRICE) + (completionTokens * OUTPUT_PRICE);

    logApiUsage({
      type: 'instructions',
      model: 'gpt-4o-mini',
      characters_used: promptTokens + completionTokens,
      cost_usd: costUsd,
      details: JSON.stringify({ prompt_tokens: promptTokens, completion_tokens: completionTokens }),
    });

    return NextResponse.json({ instructions });
  } catch {
    return NextResponse.json({ error: 'Error al generar instrucciones' }, { status: 500 });
  }
}
