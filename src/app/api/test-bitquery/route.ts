import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  return NextResponse.json({
    hasApiKey: !!process.env.BITQUERY_API_KEY,
    apiKeyLength: process.env.BITQUERY_API_KEY?.length || 0,
    apiKeyPrefix: process.env.BITQUERY_API_KEY?.substring(0, 10) || 'none'
  });
}
