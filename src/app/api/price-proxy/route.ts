import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const ids = searchParams.get('ids');
  const vsCurrencies = searchParams.get('vs_currencies') || 'usd';
  const include24hrChange = searchParams.get('include_24hr_change') || 'true';

  if (!ids) {
    return new NextResponse('Missing ids parameter', { status: 400 });
  }

  try {
    console.log('💰 Price proxy fetching:', { ids, vsCurrencies, include24hrChange });
    
    const coinGeckoUrl = `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=${vsCurrencies}&include_24hr_change=${include24hrChange}`;
    
    const response = await fetch(coinGeckoUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; onPort/1.0)',
        'Accept': 'application/json',
      },
      cache: 'no-cache',
    });

    if (!response.ok) {
      console.error(`❌ Price proxy failed to fetch ${coinGeckoUrl}: ${response.status} ${response.statusText}`);
      return new NextResponse(`Failed to fetch price data: ${response.statusText}`, { status: response.status });
    }

    const data = await response.json();
    console.log('✅ Price proxy success:', coinGeckoUrl, JSON.stringify(data));

    const headers = new Headers();
    headers.set('Content-Type', 'application/json');
    // Cache for 30 seconds for better performance
    headers.set('Cache-Control', 'public, max-age=30, must-revalidate');
    headers.set('Access-Control-Allow-Origin', '*');
    headers.set('Access-Control-Allow-Methods', 'GET');
    headers.set('Access-Control-Allow-Headers', 'Content-Type');

    return new NextResponse(JSON.stringify(data), { headers });

  } catch (error) {
    console.error('❌ Price proxy error:', error);
    return new NextResponse(`Price proxy error: ${(error as Error).message}`, { status: 500 });
  }
}
