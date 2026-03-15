import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    openai_configured: !!process.env.OPENAI_API_KEY,
  });
}
