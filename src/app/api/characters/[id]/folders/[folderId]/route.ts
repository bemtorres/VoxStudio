import { NextResponse } from 'next/server';
import { getAudioFolderById, updateAudioFolder, deleteAudioFolder, getAudiosByFolderId } from '@/lib/db';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; folderId: string }> }
) {
  try {
    const { id, folderId } = await params;
    const folder = getAudioFolderById(parseInt(folderId, 10)) as { character_id?: number } | undefined;
    if (!folder || folder.character_id !== parseInt(id, 10)) {
      return NextResponse.json({ error: 'Carpeta no encontrada' }, { status: 404 });
    }
    const audios = getAudiosByFolderId(parseInt(folderId, 10));
    return NextResponse.json({ ...folder, audios });
  } catch (err) {
    console.error('Error getting folder:', err);
    return NextResponse.json({ error: 'Error al obtener carpeta' }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string; folderId: string }> }
) {
  try {
    const { id, folderId } = await params;
    const folder = getAudioFolderById(parseInt(folderId, 10)) as { character_id?: number } | undefined;
    if (!folder || folder.character_id !== parseInt(id, 10)) {
      return NextResponse.json({ error: 'Carpeta no encontrada' }, { status: 404 });
    }
    const body = await request.json().catch(() => ({}));
    const { name } = body;
    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'name es obligatorio' }, { status: 400 });
    }
    const updated = updateAudioFolder(parseInt(folderId, 10), name.trim());
    return NextResponse.json(updated);
  } catch (err) {
    console.error('Error updating folder:', err);
    return NextResponse.json({ error: 'Error al actualizar carpeta' }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; folderId: string }> }
) {
  try {
    const { id, folderId } = await params;
    const folder = getAudioFolderById(parseInt(folderId, 10)) as { character_id?: number } | undefined;
    if (!folder || folder.character_id !== parseInt(id, 10)) {
      return NextResponse.json({ error: 'Carpeta no encontrada' }, { status: 404 });
    }
    deleteAudioFolder(parseInt(folderId, 10));
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Error deleting folder:', err);
    return NextResponse.json({ error: 'Error al eliminar carpeta' }, { status: 500 });
  }
}
