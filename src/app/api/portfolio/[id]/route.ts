import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    if (!id) {
      return NextResponse.json({ error: 'Portfolio ID required' }, { status: 400 });
    }

    try {
      const db = await connectToDatabase();
      if (!db) {
        return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
      }

      // Search for the portfolio across all users
      const users = await db.collection('users').find({}).toArray();
      
      for (const user of users) {
        if (user.portfolios && Array.isArray(user.portfolios)) {
          const portfolio = user.portfolios.find((p: { id: string }) => p.id === id);
          if (portfolio) {
            // Include username and profile picture with the portfolio data
            const portfolioWithUser = {
              ...portfolio,
              username: user.username || user.name || 'Anonymous',
              profilePicture: user.profilePicture
            };
            return NextResponse.json(portfolioWithUser, { status: 200 });
          }
        }
      }

      // Portfolio not found
      return NextResponse.json({ error: 'Portfolio not found' }, { status: 404 });

    } catch (dbError) {
      console.error('Database error:', dbError);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

  } catch (error) {
    console.error('Error fetching public portfolio:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
