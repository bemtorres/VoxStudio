import { NextResponse } from 'next/server';
import { getPodcastCast, addCharacterToPodcastCast, removeCharacterFromPodcastCast } from '@/lib/db';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const cast = getPodcastCast(parseInt(id, 10));
    return NextResponse.json(cast);
  } catch (err) {
    console.error('Error getting podcast cast:', err);
    return NextResponse.json({ error: 'Error al obtener cast' }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const { character_id } = body;
    if (!character_id) {
      return NextResponse.json({ error: 'character_id es obligatorio' }, { status: 400 });
    }
    addCharacterToPodcastCast(parseInt(id, 10), parseInt(String(character_id), 10));
    const cast = getPodcastCast(parseInt(id, 10));
    return NextResponse.json(cast);
  } catch (err) {
    console.error('Error adding to podcast cast:', err);
    return NextResponse.json({ error: 'Error al añadir al cast' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const characterId = searchParams.get('character_id');
    if (!characterId) {
      return NextResponse.json({ error: 'character_id es obligatorio' }, { status: 400 });
    }
    removeCharacterFromPodcastCast(parseInt(id, 10), parseInt(characterId, 10));
    const cast = getPodcastCast(parseInt(id, 10));
    return NextResponse.json(cast);
  } catch (err) {
    console.error('Error removing from podcast cast:', err);
    return NextResponse.json({ error: 'Error al quitar del cast' }, { status: 500 });
  }
}
