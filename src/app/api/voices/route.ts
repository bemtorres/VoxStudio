import { NextResponse } from 'next/server';
import { openrouterVoices, filterVoices } from '@/lib/voices';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const is_free = searchParams.get('is_free');
    const gender = searchParams.get('gender');
    const language = searchParams.get('language');

    const filter: Record<string, unknown> = {};
    if (is_free !== null && is_free !== '') filter.is_free = is_free === 'true';
    if (gender) filter.gender = gender;
    if (language) filter.language = language;

    const voices = Object.keys(filter).length > 0 ? filterVoices(filter) : openrouterVoices;
    return NextResponse.json(voices);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch voices' }, { status: 500 });
  }
}
