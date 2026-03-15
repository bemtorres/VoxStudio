import { NextResponse } from 'next/server';
import { getApiUsageSummary, getApiUsageLog } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const mode = searchParams.get('mode') || 'summary';
    const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 500);
    const offset = parseInt(searchParams.get('offset') || '0');

    if (mode === 'log') {
      const log = getApiUsageLog(limit, offset);
      return NextResponse.json(log);
    }

    const summary = getApiUsageSummary();
    return NextResponse.json(summary);
  } catch (error) {
    console.error('Admin usage error:', error);
    return NextResponse.json({ error: 'Error al obtener uso' }, { status: 500 });
  }
}
