import { NextResponse } from 'next/server';
import { getAllPodcastEpisodes, createPodcastEpisode } from '@/lib/db';

export async function GET() {
  try {
    const episodes = getAllPodcastEpisodes();
    return NextResponse.json(episodes);
  } catch (err) {
    console.error('Error listing podcast episodes:', err);
    return NextResponse.json({ error: 'Error al listar episodios' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { title } = body;
    const episode = createPodcastEpisode(title);
    return NextResponse.json(episode);
  } catch (err) {
    console.error('Error creating podcast episode:', err);
    return NextResponse.json({ error: 'Error al crear episodio' }, { status: 500 });
  }
}
