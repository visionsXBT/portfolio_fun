import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';

export async function POST(request: NextRequest) {
  try {
    const { portfolioId, userId } = await request.json();
    
    if (!portfolioId || !userId) {
      return NextResponse.json({ error: 'Portfolio ID and user ID required' }, { status: 400 });
    }

    const db = await connectToDatabase();
    if (!db) {
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
    }

    // Find the user and their portfolio
    const user = await db.collection('users').findOne({ _id: userId });
    if (!user || !user.portfolios) {
      return NextResponse.json({ error: 'User or portfolio not found' }, { status: 404 });
    }

    // Find the specific portfolio and initialize stats
    const portfolioIndex = user.portfolios.findIndex((p: { id: string }) => p.id === portfolioId);
    if (portfolioIndex === -1) {
      return NextResponse.json({ error: 'Portfolio not found' }, { status: 404 });
    }

    // Initialize portfolio stats if they don't exist
    if (!user.portfolios[portfolioIndex].views) {
      user.portfolios[portfolioIndex].views = 0;
    }
    if (!user.portfolios[portfolioIndex].shares) {
      user.portfolios[portfolioIndex].shares = 0;
    }

    // Update the portfolio in the database
    await db.collection('users').updateOne(
      { _id: userId },
      { $set: { portfolios: user.portfolios } }
    );

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error initializing portfolio stats:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
