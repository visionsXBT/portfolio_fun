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

    // Calculate stats for each portfolio
    const portfoliosWithStats = allPortfolios.map(portfolio => {
      const views = portfolio.views || 0;
      const shares = portfolio.shares || 0;
      const avgChange = portfolio.avgChange || 0;
      const tokenCount = portfolio.rows?.length || 0;
      
      // Use the actual avgMarketCap from the portfolio data
      // If not available, use a placeholder for now (will be calculated on next save)
      let avgMarketCap = portfolio.avgMarketCap || 0;
      
      // For portfolios without market cap data, use a reasonable default
      if (avgMarketCap === 0 && tokenCount > 0) {
        avgMarketCap = 1000000; // 1M default for portfolios without calculated market cap
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
    });

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

    console.log('Leaderboard data:', {
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
