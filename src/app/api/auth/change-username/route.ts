import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';

export async function POST(request: NextRequest) {
  try {
    const { newUsername } = await request.json();

    if (!newUsername || typeof newUsername !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Username is required' },
        { status: 400 }
      );
    }

    // Validate username format
    if (newUsername.length < 3 || newUsername.length > 20) {
      return NextResponse.json(
        { success: false, error: 'Username must be between 3 and 20 characters' },
        { status: 400 }
      );
    }

    if (!/^[a-zA-Z0-9_]+$/.test(newUsername)) {
      return NextResponse.json(
        { success: false, error: 'Username can only contain letters, numbers, and underscores' },
        { status: 400 }
      );
    }

    const db = await connectToDatabase();
    if (!db) {
      return NextResponse.json(
        { success: false, error: 'Database connection failed' },
        { status: 500 }
      );
    }

    // Check if username already exists
    const existingUser = await db.collection('users').findOne({ username: newUsername });
    if (existingUser) {
      return NextResponse.json(
        { success: false, error: 'Username already exists' },
        { status: 400 }
      );
    }

    // Get current user session
    const sessionResponse = await fetch(`${request.nextUrl.origin}/api/session`, {
      headers: {
        cookie: request.headers.get('cookie') || '',
      },
    });

    if (!sessionResponse.ok) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const sessionData = await sessionResponse.json();
    if (!sessionData.success || !sessionData.user) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const currentUser = sessionData.user;

    // Check if user is a wallet user and hasn't set username yet
    if (currentUser.accountType !== 'wallet') {
      return NextResponse.json(
        { success: false, error: 'Only wallet users can change their username' },
        { status: 403 }
      );
    }

    // Update username
    const result = await db.collection('users').updateOne(
      { _id: currentUser.id },
      { 
        $set: { 
          username: newUsername,
          usernameSet: true,
          updatedAt: new Date()
        } 
      }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Username updated successfully'
    });

  } catch (error) {
    console.error('Username change error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
