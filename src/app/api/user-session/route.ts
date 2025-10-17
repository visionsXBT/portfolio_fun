import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function GET(request: NextRequest) {
  try {
    // Get user ID from query parameters or headers
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    
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
      // If ObjectId fails, try with string ID
      user = await db.collection('users').findOne({ _id: userId });
    }

    // If still not found, try with id field (not _id)
    if (!user) {
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
    console.error('Error fetching user session:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
