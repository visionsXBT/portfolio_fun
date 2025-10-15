import { NextRequest, NextResponse } from 'next/server';
import { getUserById, updateUserPortfolios } from '@/lib/database';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const user = await getUserById(userId);
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      portfolios: user.portfolios || []
    });
  } catch (error) {
    console.error('Error fetching user portfolios:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch portfolios' 
    }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;
    const { portfolios } = await request.json();
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    if (!portfolios) {
      return NextResponse.json({ error: 'Portfolios data is required' }, { status: 400 });
    }

    await updateUserPortfolios(userId, portfolios);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating user portfolios:', error);
    return NextResponse.json({ 
      error: 'Failed to update portfolios' 
    }, { status: 500 });
  }
}
