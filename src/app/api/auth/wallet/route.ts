import { NextRequest, NextResponse } from 'next/server';
import { createWalletAccount, getUserByWalletAddress } from '@/lib/database';

export async function POST(request: NextRequest) {
  try {
    const { walletAddress, privyUserId } = await request.json();

    if (!walletAddress || !privyUserId) {
      return NextResponse.json({ error: 'Wallet address and Privy user ID are required' }, { status: 400 });
    }

    // Check if wallet account already exists
    let user = await getUserByWalletAddress(walletAddress);
    
    if (!user) {
      // Create new wallet account
      user = await createWalletAccount(walletAddress, privyUserId);
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user._id,
        walletAddress: user.walletAddress,
        accountType: user.accountType,
        portfolios: user.portfolios
      }
    });
  } catch (error) {
    console.error('Error in wallet authentication:', error);
    return NextResponse.json({
      error: 'Failed to authenticate wallet'
    }, { status: 500 });
  }
}
