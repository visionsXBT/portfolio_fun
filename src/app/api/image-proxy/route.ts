import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const imageUrl = request.nextUrl.searchParams.get('url');

  if (!imageUrl) {
    return new NextResponse('Missing image URL', { status: 400 });
  }

  try {
    console.log('🖼️ Image proxy fetching:', imageUrl);
    const response = await fetch(imageUrl, {
      headers: {
        // Add any necessary headers for the upstream request
        'User-Agent': 'Mozilla/5.0 (compatible; onPort/1.0)',
      },
      redirect: 'follow', // Follow redirects
    });

    if (!response.ok) {
      console.error(`❌ Image proxy failed to fetch ${imageUrl}: ${response.status} ${response.statusText}`);
      return new NextResponse(`Failed to fetch image: ${response.statusText}`, { status: response.status });
    }

    const contentType = response.headers.get('content-type');
    const arrayBuffer = await response.arrayBuffer();

    console.log('✅ Image proxy success:', imageUrl, contentType);

    const headers = new Headers();
    if (contentType) {
      headers.set('Content-Type', contentType);
    }
    headers.set('Cache-Control', 'public, max-age=3600, immutable'); // Cache for 1 hour
    headers.set('Access-Control-Allow-Origin', '*'); // Allow CORS for the client

    return new NextResponse(Buffer.from(arrayBuffer), { headers });

  } catch (error) {
    console.error('❌ Image proxy error:', error);
    return new NextResponse(`Image proxy error: ${(error as Error).message}`, { status: 500 });
  }
}
