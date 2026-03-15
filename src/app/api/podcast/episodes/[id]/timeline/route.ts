import { NextResponse } from 'next/server';
import { getPodcastEntries, updatePodcastEntry } from '@/lib/db';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const episodeId = parseInt(id, 10);
    if (Number.isNaN(episodeId)) {
      return NextResponse.json({ error: 'ID de episodio inválido' }, { status: 400 });
    }
    const body = await request.json().catch(() => ({}));
    const startTimes = body.start_times as Record<string, number> | undefined;
    if (!startTimes || typeof startTimes !== 'object') {
      return NextResponse.json({ error: 'start_times es obligatorio (objeto id -> segundos)' }, { status: 400 });
    }
    const entries = getPodcastEntries(episodeId) as { id: number }[];
    const entryIds = new Set(entries.map((e) => e.id));
    for (const [entryIdStr, seconds] of Object.entries(startTimes)) {
      const entryId = parseInt(entryIdStr, 10);
      if (!entryIds.has(entryId) || typeof seconds !== 'number') continue;
      updatePodcastEntry(entryId, { start_time_sec: seconds });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Error saving timeline:', err);
    return NextResponse.json({ error: 'Error al guardar la línea de tiempo' }, { status: 500 });
  }
}
