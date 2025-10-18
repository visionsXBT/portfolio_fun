import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import crypto from 'crypto';

// Create a new session
export async function POST(request: NextRequest) {
  try {
    const { userId, username } = await request.json();

    if (!userId || !username) {
      return NextResponse.json({ 
        success: false, 
        error: 'User ID and username are required' 
      }, { status: 400 });
    }

    const db = await connectToDatabase();
    if (!db) {
      return NextResponse.json({ 
        success: false, 
        error: 'Database connection failed' 
      }, { status: 500 });
    }

    // Generate a secure session token
    const sessionToken = crypto.randomBytes(32).toString('hex');
    
    // Create session document
    const sessionData = {
      userId,
      username,
      sessionToken,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      isActive: true
    };

    // Store session in database
    await db.collection('sessions').insertOne(sessionData);

    // Create response with session cookie
    const response = NextResponse.json({ 
      success: true, 
      sessionToken,
      expiresAt: sessionData.expiresAt
    });

    // Set secure HTTP-only cookie
    response.cookies.set('sessionToken', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
      path: '/'
    });

    return response;

  } catch (error) {
    console.error('Error creating session:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}

// Get session by token from cookie or header
export async function GET(request: NextRequest) {
  try {
    // Try to get session token from cookie first
    let sessionToken = request.cookies.get('sessionToken')?.value;
    
    // If not in cookie, try from Authorization header
    if (!sessionToken) {
      const authHeader = request.headers.get('authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        sessionToken = authHeader.substring(7);
      }
    }

    if (!sessionToken) {
      return NextResponse.json({ 
        success: false, 
        error: 'No session found' 
      }, { status: 401 });
    }

    const db = await connectToDatabase();
    if (!db) {
      return NextResponse.json({ 
        success: false, 
        error: 'Database connection failed' 
      }, { status: 500 });
    }

    // Find active session
    const session = await db.collection('sessions').findOne({
      sessionToken,
      isActive: true,
      expiresAt: { $gt: new Date() }
    });

    if (!session) {
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid or expired session' 
      }, { status: 401 });
    }

    // Get user data
    const user = await db.collection('users').findOne({ 
      _id: new ObjectId(session.userId) 
    });

    if (!user) {
      return NextResponse.json({ 
        success: false, 
        error: 'User not found' 
      }, { status: 404 });
    }

    return NextResponse.json({ 
      success: true, 
      user: {
        id: user._id,
        username: user.username,
        accountType: user.accountType,
        profilePicture: user.profilePicture
      }
    });

  } catch (error) {
    console.error('Error getting session:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}

// Delete session (logout)
export async function DELETE(request: NextRequest) {
  try {
    // Try to get session token from cookie first
    let sessionToken = request.cookies.get('sessionToken')?.value;
    
    // If not in cookie, try from Authorization header
    if (!sessionToken) {
      const authHeader = request.headers.get('authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        sessionToken = authHeader.substring(7);
      }
    }

    if (!sessionToken) {
      return NextResponse.json({ 
        success: false, 
        error: 'No session found' 
      }, { status: 401 });
    }

    const db = await connectToDatabase();
    if (!db) {
      return NextResponse.json({ 
        success: false, 
        error: 'Database connection failed' 
      }, { status: 500 });
    }

    // Deactivate session
    await db.collection('sessions').updateOne(
      { sessionToken },
      { $set: { isActive: false, loggedOutAt: new Date() } }
    );

    // Create response and clear cookie
    const response = NextResponse.json({ 
      success: true, 
      message: 'Session ended successfully' 
    });

    // Clear the session cookie
    response.cookies.set('sessionToken', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0, // Expire immediately
      path: '/'
    });

    return response;

  } catch (error) {
    console.error('Error deleting session:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}
