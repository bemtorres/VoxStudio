import { NextResponse } from 'next/server';
import { getAllCharacters, createCharacter, getCharacterById, updateCharacter, deleteCharacter } from '@/lib/db';

export async function GET() {
  try {
    const characters = getAllCharacters();
    return NextResponse.json(characters);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch characters' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    if (!data.name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }
    const character = createCharacter(data);
    return NextResponse.json(character, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create character' }, { status: 500 });
  }
}
