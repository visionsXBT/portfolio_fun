import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';

export async function POST(request: NextRequest) {
  try {
    const { username } = await request.json();

    if (!username || typeof username !== 'string') {
      return NextResponse.json({ 
        available: false, 
        error: 'Username is required' 
      }, { status: 400 });
    }

    // Validate username format (alphanumeric, 3-20 characters)
    const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
    if (!usernameRegex.test(username)) {
      return NextResponse.json({ 
        available: false, 
        error: 'Username must be 3-20 characters long and contain only letters, numbers, and underscores' 
      }, { status: 400 });
    }

    const db = await connectToDatabase();
    if (!db) {
      return NextResponse.json({ 
        available: false, 
        error: 'Database connection failed' 
      }, { status: 500 });
    }

    // Check if username already exists (case-sensitive)
    const existingUser = await db.collection('users').findOne({ 
      username: username // Case-sensitive search
    });

    if (existingUser) {
      return NextResponse.json({ 
        available: false, 
        error: 'Username is already taken' 
      });
    }

    return NextResponse.json({ 
      available: true, 
      message: 'Username is available' 
    });

  } catch (error) {
    console.error('Error checking username:', error);
    return NextResponse.json({ 
      available: false, 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}
