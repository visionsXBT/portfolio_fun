import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';

export async function POST(request: NextRequest) {
  try {
    const db = await connectToDatabase();
    if (!db) {
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
    }

    // Get all users with their portfolios
    const users = await db.collection('users').find({}).toArray();
    let updatedCount = 0;

    for (const user of users) {
      if (user.portfolios && Array.isArray(user.portfolios)) {
        let userUpdated = false;
        
        for (const portfolio of user.portfolios) {
          // Initialize missing fields
          if (portfolio.views === undefined) {
            portfolio.views = 0;
            userUpdated = true;
          }
          if (portfolio.shares === undefined) {
            portfolio.shares = 0;
            userUpdated = true;
          }
          if (portfolio.avgChange === undefined) {
            portfolio.avgChange = 0;
            userUpdated = true;
          }
          if (portfolio.avgMarketCap === undefined) {
            portfolio.avgMarketCap = 1000000; // Default 1M market cap
            userUpdated = true;
          }
        }

        if (userUpdated) {
          await db.collection('users').updateOne(
            { _id: user._id },
            { $set: { portfolios: user.portfolios } }
          );
          updatedCount++;
        }
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: `Updated ${updatedCount} users with portfolio stats`,
      totalUsers: users.length
    });

  } catch (error) {
    console.error('Error initializing portfolio stats:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
