import { NextResponse } from 'next/server';
import { getAudioFoldersByCharacterId, createAudioFolder } from '@/lib/db';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const folders = getAudioFoldersByCharacterId(parseInt(id, 10));
    return NextResponse.json(folders);
  } catch (err) {
    console.error('Error listing folders:', err);
    return NextResponse.json({ error: 'Error al listar carpetas' }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const { name } = body;
    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'name es obligatorio' }, { status: 400 });
    }
    const folder = createAudioFolder(parseInt(id, 10), name.trim());
    return NextResponse.json(folder);
  } catch (err) {
    console.error('Error creating folder:', err);
    return NextResponse.json({ error: 'Error al crear carpeta' }, { status: 500 });
  }
}
