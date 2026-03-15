import { NextResponse } from 'next/server';
import { getPodcastEpisodeById, updatePodcastEpisode, deletePodcastEpisode } from '@/lib/db';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const episode = getPodcastEpisodeById(parseInt(id, 10));
    if (!episode) {
      return NextResponse.json({ error: 'Episodio no encontrado' }, { status: 404 });
    }
    return NextResponse.json(episode);
  } catch (err) {
    console.error('Error getting podcast episode:', err);
    return NextResponse.json({ error: 'Error al obtener episodio' }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const { title } = body;
    const episode = updatePodcastEpisode(parseInt(id, 10), { title });
    return NextResponse.json(episode);
  } catch (err) {
    console.error('Error updating podcast episode:', err);
    return NextResponse.json({ error: 'Error al actualizar episodio' }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    deletePodcastEpisode(parseInt(id, 10));
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Error deleting podcast episode:', err);
    return NextResponse.json({ error: 'Error al eliminar episodio' }, { status: 500 });
  }
}
