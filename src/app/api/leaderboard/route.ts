import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';

export async function GET() {
  try {
    const db = await connectToDatabase();
    if (!db) {
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
    }

    // Get all users with their portfolios
    const users = await db.collection('users').find({}).toArray();
    
    // Flatten all portfolios with user info
    const allPortfolios = [];
    for (const user of users) {
      if (user.portfolios && Array.isArray(user.portfolios)) {
        for (const portfolio of user.portfolios) {
          allPortfolios.push({
            ...portfolio,
            username: user.username || user.name || 'Anonymous',
            userId: user._id?.toString() || user.id,
            profilePicture: user.profilePicture
          });
        }
      }
    }

    // Function to fetch fresh token data from DexScreener
    const fetchTokenData = async (mints: string[]) => {
      if (mints.length === 0) return {};
      
      try {
        const response = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${mints.join(',')}`);
        if (response.ok) {
          const data = await response.json();
          const tokenData: Record<string, { priceChange24h: number; marketCap: number }> = {};
          
          if (data.pairs) {
            for (const pair of data.pairs) {
              const mint = pair.baseToken?.address;
              if (mint) {
                tokenData[mint] = {
                  priceChange24h: pair.priceChange24h?.h24 || 0,
                  marketCap: pair.marketCap || 0
                };
              }
            }
          }
          
          return tokenData;
        }
      } catch (error) {
        console.error('Failed to fetch token data:', error);
      }
      
      return {};
    };

    // Calculate fresh stats for each portfolio
    const portfoliosWithStats = await Promise.all(
      allPortfolios.map(async (portfolio) => {
        const views = portfolio.views || 0;
        const shares = portfolio.shares || 0;
        const tokenCount = portfolio.rows?.length || 0;
        
        let avgChange = 0;
        let avgMarketCap = 0;
        
        // Calculate fresh data if portfolio has tokens
        if (tokenCount > 0 && portfolio.rows) {
          const mints = portfolio.rows.map((row: { mint: string }) => row.mint);
          const tokenData = await fetchTokenData(mints);
          
          // Calculate average change and market cap
          const changes = mints.map(mint => tokenData[mint]?.priceChange24h || 0);
          const marketCaps = mints.map(mint => tokenData[mint]?.marketCap || 0);
          
          avgChange = changes.length > 0 
            ? changes.reduce((sum, change) => sum + change, 0) / changes.length 
            : 0;
          
          avgMarketCap = marketCaps.length > 0 
            ? marketCaps.reduce((sum, marketCap) => sum + marketCap, 0) / marketCaps.length 
            : 0;
        }

        return {
          id: portfolio.id,
          name: portfolio.name,
          username: portfolio.username,
          views,
          shares,
          avgChange,
          tokenCount,
          avgMarketCap,
          profilePicture: portfolio.profilePicture,
          rows: portfolio.rows
        };
      })
    );

    // Sort by different criteria
    const mostShared = [...portfoliosWithStats]
      .sort((a, b) => b.views - a.views)
      .slice(0, 20);

    const bestPerforming = [...portfoliosWithStats]
      .filter(p => p.tokenCount > 0) // Only portfolios with tokens
      .sort((a, b) => {
        // Calculate a balanced score: 70% weight on 24h change, 30% weight on market cap
        // Higher market cap gets bonus points, but 24h change is primary factor
        const scoreA = (a.avgChange * 0.7) + (Math.log10(Math.max(a.avgMarketCap, 1000)) * 0.3);
        const scoreB = (b.avgChange * 0.7) + (Math.log10(Math.max(b.avgMarketCap, 1000)) * 0.3);
        return scoreB - scoreA;
      })
      .slice(0, 20);

    const mostDiverse = [...portfoliosWithStats]
      .sort((a, b) => b.tokenCount - a.tokenCount)
      .slice(0, 20);

    console.log('Leaderboard data with fresh calculations:', {
      totalPortfolios: portfoliosWithStats.length,
      mostSharedCount: mostShared.length,
      bestPerformingCount: bestPerforming.length,
      mostDiverseCount: mostDiverse.length,
      portfoliosWithZeroMarketCap: portfoliosWithStats.filter(p => p.avgMarketCap === 0).length,
      portfoliosWithMarketCap: portfoliosWithStats.filter(p => p.avgMarketCap > 0).length,
      samplePortfolio: portfoliosWithStats[0] ? {
        id: portfoliosWithStats[0].id,
        name: portfoliosWithStats[0].name,
        avgMarketCap: portfoliosWithStats[0].avgMarketCap,
        avgChange: portfoliosWithStats[0].avgChange,
        views: portfoliosWithStats[0].views,
        shares: portfoliosWithStats[0].shares,
        tokenCount: portfoliosWithStats[0].tokenCount
      } : null
    });

    return NextResponse.json({
      mostShared,
      bestPerforming,
      mostDiverse
    });

  } catch (error) {
    console.error('Error fetching leaderboard data:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
