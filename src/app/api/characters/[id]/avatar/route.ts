import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import { getCharacterById, updateCharacter } from '@/lib/db';

const MAX_SIZE = 2 * 1024 * 1024; // 2 MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const EXT_MAP: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const characterId = parseInt(id);
    if (isNaN(characterId)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    }

    const character = getCharacterById(characterId);
    if (!character) {
      return NextResponse.json({ error: 'Personaje no encontrado' }, { status: 404 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'No se envió ninguna imagen' }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: 'Formato no permitido. Usa JPEG, PNG o WebP.' }, { status: 400 });
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'La imagen no puede superar 2 MB' }, { status: 400 });
    }

    const ext = EXT_MAP[file.type] || 'jpg';
    const avatarPath = `characters/${characterId}/avatar.${ext}`;
    const fullPath = path.join(process.cwd(), 'public', avatarPath);
    const dir = path.dirname(fullPath);

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Eliminar avatar anterior si existe
    const oldChar = character as { avatar_path?: string };
    if (oldChar.avatar_path) {
      try {
        const oldFull = path.join(process.cwd(), 'public', oldChar.avatar_path);
        if (fs.existsSync(oldFull)) fs.unlinkSync(oldFull);
      } catch {
        // ignorar
      }
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(fullPath, buffer);

    const updated = updateCharacter(characterId, { avatar_path: avatarPath });

    return NextResponse.json({
      avatar_path: avatarPath,
      character: updated,
    });
  } catch (error) {
    console.error('Avatar upload error:', error);
    return NextResponse.json({ error: 'Error al subir la imagen' }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const characterId = parseInt(id);
    if (isNaN(characterId)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    }

    const character = getCharacterById(characterId) as { avatar_path?: string } | undefined;
    if (!character) {
      return NextResponse.json({ error: 'Personaje no encontrado' }, { status: 404 });
    }

    if (character.avatar_path) {
      try {
        const fullPath = path.join(process.cwd(), 'public', character.avatar_path);
        if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
      } catch {
        // ignorar
      }
      const charDir = path.join(process.cwd(), 'public', 'characters', String(characterId));
      if (fs.existsSync(charDir)) {
        try {
          fs.rmdirSync(charDir);
        } catch {
          // ignorar
        }
      }
    }

    updateCharacter(characterId, { avatar_path: '' });
    return NextResponse.json({ success: true, avatar_path: '' });
  } catch (error) {
    console.error('Avatar delete error:', error);
    return NextResponse.json({ error: 'Error al eliminar la imagen' }, { status: 500 });
  }
}
