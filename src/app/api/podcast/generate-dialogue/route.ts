import { NextResponse } from 'next/server';
import { logApiUsage, getPodcastCast, createPodcastEntry } from '@/lib/db';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const INPUT_PRICE = 0.15 / 1_000_000;
const OUTPUT_PRICE = 0.60 / 1_000_000;

const STYLES = {
  curioso: 'Curioso e intrigante: despierta la curiosidad del oyente, plantea preguntas interesantes, tono explorador.',
  'preguntas-respuestas': 'Preguntas y respuestas: formato entrevista o FAQ, uno pregunta y otro responde de forma clara.',
  energetico: 'Enérgico y dinámico: ritmo rápido, entusiasmo, tono motivador y activo.',
  noticias: 'Estilo noticias: formal, informativo, como un noticiero o reportaje profesional.',
  conversacional: 'Conversacional: charla natural entre amigos, tono relajado y cercano.',
  educativo: 'Educativo: explica conceptos de forma didáctica, ejemplos claros.',
} as const;

export async function POST(request: Request) {
  try {
    if (!OPENAI_API_KEY) {
      return NextResponse.json({ error: 'Configura OPENAI_API_KEY en .env' }, { status: 500 });
    }

    const body = await request.json().catch(() => ({}));
    const { episode_id, theme, style, duration_minutes } = body;

    if (!episode_id || !theme?.trim()) {
      return NextResponse.json(
        { error: 'episode_id y theme son obligatorios' },
        { status: 400 }
      );
    }

    const episodeId = parseInt(String(episode_id), 10);
    const duration = Math.max(1, Math.min(60, parseInt(String(duration_minutes || 5), 10) || 5));
    const styleKey = (style && STYLES[style as keyof typeof STYLES]) ? style : 'conversacional';
    const styleDesc = STYLES[styleKey as keyof typeof STYLES] || STYLES.conversacional;

    const cast = getPodcastCast(episodeId) as { id: number; name: string; personality?: string; background?: string; description?: string; age?: string; gender?: string }[];
    if (cast.length === 0) {
      return NextResponse.json(
        { error: 'Añade al menos un personaje al cast del episodio' },
        { status: 400 }
      );
    }
    const characters = cast;

    const charsDesc = characters
      .map(
        (c) =>
          `- ${c!.name}: ${[c!.personality, c!.background, c!.description, c!.age && `Edad: ${c!.age}`, c!.gender && `Género: ${c!.gender}`]
            .filter(Boolean)
            .join('. ')}`
      )
      .join('\n');

    const wordsTarget = Math.round((duration * 150 * 0.9)); // ~150 palabras/min en español, un poco menos para expresiones

    const systemPrompt = `Eres un guionista experto en podcasts. Genera un diálogo en español para un podcast.

REGLAS:
1. Responde SOLO con líneas en formato JSON array. Cada elemento: {"character_name": "Nombre", "text": "Texto que dice"}
2. Usa SOLO los nombres de personajes proporcionados.
3. Incluye expresiones dentro del texto usando corchetes: [risa], [suspenso], [pausa dramática], [emoción], [sorpresa], [reflexivo], [entusiasmado], [serio], etc. para dar vida al diálogo.
4. Alterna entre personajes de forma natural.
5. El diálogo debe tener aproximadamente ${wordsTarget} palabras en total.
6. Cada línea de texto: 1-4 oraciones. No hagas monólogos muy largos.
7. No incluyas narrador ni acotaciones fuera del texto. Las expresiones van dentro del texto del personaje.`;

    const userPrompt = `Tema: ${theme.trim()}
Estilo: ${styleDesc}

Personajes y sus descripciones:
${charsDesc}

Genera el diálogo completo en formato JSON.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.8,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      return NextResponse.json({ error: err || 'Error al generar' }, { status: response.status });
    }

    const data = await response.json();
    let content = data.choices?.[0]?.message?.content?.trim();
    if (!content) {
      return NextResponse.json({ error: 'No se generó contenido' }, { status: 500 });
    }

    // Extraer JSON si viene envuelto en markdown
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (jsonMatch) content = jsonMatch[0];

    let lines: { character_name: string; text: string }[];
    try {
      lines = JSON.parse(content);
    } catch {
      return NextResponse.json({ error: 'Formato de respuesta inválido' }, { status: 500 });
    }

    if (!Array.isArray(lines) || lines.length === 0) {
      return NextResponse.json({ error: 'No se generaron líneas' }, { status: 500 });
    }

    const nameToId = Object.fromEntries(characters.map((c) => [c!.name?.toLowerCase().trim(), c!.id]));
    const created: { id: number }[] = [];

    for (const line of lines) {
      const name = String(line.character_name || '').trim();
      const text = String(line.text || '').trim();
      if (!text) continue;

      const charId = nameToId[name.toLowerCase()] ?? characters[0]?.id;
      if (!charId) continue;

      const entry = createPodcastEntry({
        episode_id: episodeId,
        character_id: charId,
        text,
      }) as { id: number };
      created.push(entry);
    }

    const usage = data.usage;
    const promptTokens = usage?.prompt_tokens ?? 0;
    const completionTokens = usage?.completion_tokens ?? 0;
    const costUsd = promptTokens * INPUT_PRICE + completionTokens * OUTPUT_PRICE;

    logApiUsage({
      type: 'dialogue',
      model: 'gpt-4o-mini',
      characters_used: promptTokens + completionTokens,
      cost_usd: costUsd,
      reference_id: `episode_${episodeId}`,
      details: JSON.stringify({ prompt_tokens: promptTokens, completion_tokens: completionTokens, lines: created.length }),
    });

    return NextResponse.json({ entries: created.length, created });
  } catch (err) {
    console.error('Error generating dialogue:', err);
    return NextResponse.json({ error: 'Error al generar diálogo' }, { status: 500 });
  }
}
