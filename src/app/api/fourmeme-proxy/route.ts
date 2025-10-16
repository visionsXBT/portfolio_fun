import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query, variables } = body;

    if (!query) {
      return new NextResponse('Missing GraphQL query', { status: 400 });
    }

    console.log('🔍 Four.meme proxy fetching:', { query: query.substring(0, 100) + '...' });
    console.log('🔑 Bitquery API Key available:', !!process.env.BITQUERY_API_KEY);
    
    const fourMemeUrl = 'https://asia.streaming.bitquery.io/graphql';
    
    const response = await fetch(fourMemeUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        // Try different API key header formats
        ...(process.env.BITQUERY_API_KEY && { 'X-API-KEY': process.env.BITQUERY_API_KEY }),
        ...(process.env.BITQUERY_API_KEY && { 'Authorization': `Bearer ${process.env.BITQUERY_API_KEY}` }),
        ...(process.env.BITQUERY_API_KEY && { 'X-Api-Key': process.env.BITQUERY_API_KEY }),
      },
      body: JSON.stringify({
        query,
        variables: variables || {}
      }),
      cache: 'no-cache',
    });

    if (!response.ok) {
      console.error(`❌ Four.meme proxy failed: ${response.status} ${response.statusText}`);
      return new NextResponse(`Failed to fetch Four.meme data: ${response.statusText}`, { status: response.status });
    }

    const data = await response.json();
    console.log('✅ Four.meme proxy success:', JSON.stringify(data, null, 2));

    const headers = new Headers();
    headers.set('Content-Type', 'application/json');
    // Cache for 30 seconds for better performance
    headers.set('Cache-Control', 'public, max-age=30, must-revalidate');
    headers.set('Access-Control-Allow-Origin', '*');
    headers.set('Access-Control-Allow-Methods', 'POST');
    headers.set('Access-Control-Allow-Headers', 'Content-Type');

    return new NextResponse(JSON.stringify(data), { headers });

  } catch (error) {
    console.error('❌ Four.meme proxy error:', error);
    return new NextResponse(`Four.meme proxy error: ${(error as Error).message}`, { status: 500 });
  }
}
