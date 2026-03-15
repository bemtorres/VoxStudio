import { NextResponse } from 'next/server';
import { deleteAudio, getAudioById, moveAudioToFolder } from '@/lib/db';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const audio = getAudioById(id);
    if (!audio) {
      return NextResponse.json({ error: 'Audio no encontrado' }, { status: 404 });
    }
    return NextResponse.json({ ...(audio as Record<string, unknown>), url: `/${(audio as { file_path?: string }).file_path}` });
  } catch {
    return NextResponse.json({ error: 'Error al obtener audio' }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    if (body.folder_id !== undefined) {
      const updated = moveAudioToFolder(id, body.folder_id === null ? null : parseInt(String(body.folder_id), 10));
      return NextResponse.json({ ...(updated as Record<string, unknown>), url: `/${(updated as { file_path?: string }).file_path}` });
    }
    return NextResponse.json({ error: 'folder_id es requerido para mover' }, { status: 400 });
  } catch (err) {
    console.error('Error moving audio:', err);
    return NextResponse.json({ error: 'Error al mover audio' }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    deleteAudio(id);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Error al eliminar audio' }, { status: 500 });
  }
}
