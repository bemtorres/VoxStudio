import { NextResponse } from 'next/server';
import { getApiUsageLog } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'json';
    const limit = Math.min(parseInt(searchParams.get('limit') || '1000'), 5000);

    const log = getApiUsageLog(limit, 0) as Array<{
      id: number;
      type: string;
      model: string;
      characters_used: number;
      cost_usd: number;
      character_id: number | null;
      character_name: string | null;
      reference_id: string | null;
      created_at: string;
    }>;

    if (format === 'csv') {
      const headers = ['id', 'tipo', 'modelo', 'caracteres', 'costo_usd', 'personaje', 'fecha'];
      const rows = log.map((r) => [
        r.id,
        r.type,
        r.model,
        r.characters_used,
        r.cost_usd.toFixed(6),
        r.character_name || '',
        r.created_at,
      ]);
      const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': 'attachment; filename="voxstudio-uso-api.csv"',
        },
      });
    }

    const totalCost = log.reduce((s, r) => s + r.cost_usd, 0);
    const totalChars = log.reduce((s, r) => s + r.characters_used, 0);

    return NextResponse.json({
      total_cost_usd: totalCost,
      total_characters: totalChars,
      total_records: log.length,
      records: log,
    });
  } catch (error) {
    console.error('Admin report error:', error);
    return NextResponse.json({ error: 'Error al generar reporte' }, { status: 500 });
  }
}
