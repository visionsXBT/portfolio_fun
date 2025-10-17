import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

    const db = await connectToDatabase();
    if (!db) {
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
    }

    // Try different ways to find the user
    let user = null;
    
    // First try with ObjectId
    try {
      user = await db.collection('users').findOne({ _id: new ObjectId(userId) });
    } catch {
      // If ObjectId fails, try with id field (not _id)
      user = await db.collection('users').findOne({ id: userId });
    }

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Return user data including profile picture
    return NextResponse.json({
      id: user.id || user._id,
      username: user.username,
      accountType: user.accountType,
      profilePicture: user.profilePicture || null
    });

  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
