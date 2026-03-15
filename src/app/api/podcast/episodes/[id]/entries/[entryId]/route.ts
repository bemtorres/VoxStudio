import { NextResponse } from 'next/server';
import { updatePodcastEntry, deletePodcastEntry } from '@/lib/db';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string; entryId: string }> }
) {
  try {
    const { entryId } = await params;
    const body = await request.json().catch(() => ({}));
    const entry = updatePodcastEntry(parseInt(entryId, 10), {
      character_id: body.character_id,
      text: body.text,
      position: body.position,
      audio_file_path: body.audio_file_path,
      voice_id: body.voice_id,
      voice_name: body.voice_name,
      language: body.language,
      qualities: body.qualities,
      synthesized_text: body.synthesized_text,
    });
    return NextResponse.json(entry);
  } catch (err) {
    console.error('Error updating podcast entry:', err);
    return NextResponse.json({ error: 'Error al actualizar entrada' }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; entryId: string }> }
) {
  try {
    const { entryId } = await params;
    deletePodcastEntry(parseInt(entryId, 10));
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Error deleting podcast entry:', err);
    return NextResponse.json({ error: 'Error al eliminar entrada' }, { status: 500 });
  }
}
