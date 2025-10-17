import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';

export async function POST(request: NextRequest) {
  try {
    const { portfolioId, action, referrerId } = await request.json();
    
    if (!portfolioId || !action) {
      return NextResponse.json({ error: 'Portfolio ID and action required' }, { status: 400 });
    }

    const db = await connectToDatabase();
    if (!db) {
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
    }

    // Find the portfolio across all users
    const users = await db.collection('users').find({}).toArray();
    let portfolioFound = false;
    let portfolioOwner = null;

    for (const user of users) {
      if (user.portfolios && Array.isArray(user.portfolios)) {
        const portfolioIndex = user.portfolios.findIndex((p: { id: string }) => p.id === portfolioId);
        if (portfolioIndex !== -1) {
          portfolioFound = true;
          portfolioOwner = user;
          
          // Update portfolio stats
          const portfolio = user.portfolios[portfolioIndex];
          if (action === 'view') {
            portfolio.views = (portfolio.views || 0) + 1;
          } else if (action === 'share') {
            portfolio.shares = (portfolio.shares || 0) + 1;
          }

          // Update the portfolio in the database
          await db.collection('users').updateOne(
            { _id: user._id },
            { $set: { portfolios: user.portfolios } }
          );

          // Handle referral rewards if this is a view and there's a referrer
          if (action === 'view' && referrerId && referrerId !== user._id?.toString()) {
            await handleReferralReward(db, referrerId, user._id?.toString());
          }

          break;
        }
      }
    }

    if (!portfolioFound) {
      return NextResponse.json({ error: 'Portfolio not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error tracking portfolio action:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function handleReferralReward(db: any, referrerId: string, newUserId: string) {
  try {
    // Find the referrer
    const referrer = await db.collection('users').findOne({ _id: referrerId });
    if (!referrer) return;

    // Initialize referral stats if they don't exist
    if (!referrer.referralStats) {
      referrer.referralStats = {
        totalReferrals: 0,
        activeReferrals: 0,
        totalRewards: 0
      };
    }

    // Increment total referrals
    referrer.referralStats.totalReferrals += 1;

    // Give referral reward (you can adjust this amount)
    const rewardAmount = 10; // Points or tokens
    referrer.referralStats.totalRewards += rewardAmount;

    // Update referrer in database
    await db.collection('users').updateOne(
      { _id: referrerId },
      { $set: { referralStats: referrer.referralStats } }
    );

    console.log(`Referral reward given: ${rewardAmount} points to user ${referrerId} for referring ${newUserId}`);
  } catch (error) {
    console.error('Error handling referral reward:', error);
  }
}
