import { NextRequest, NextResponse } from 'next/server';
import { createAccount, authenticateUser } from '@/lib/database';
import { connectToDatabase } from '@/lib/mongodb';
import crypto from 'crypto';

// Helper function to create a session
async function createSession(userId: string, username: string) {
  const db = await connectToDatabase();
  if (!db) {
    throw new Error('Database connection failed');
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

  return sessionToken;
}

export async function POST(request: NextRequest) {
  try {
    const { action, username, password } = await request.json();

    if (action === 'signup') {
      const user = await createAccount(username, password);
      if (!user || !user._id || !user.username) {
        return NextResponse.json({ 
          success: false, 
          error: 'Failed to create account' 
        }, { status: 500 });
      }
      
      const sessionToken = await createSession(user._id.toString(), user.username);
      
      // Create response with session cookie
      const response = NextResponse.json({ 
        success: true, 
        user: { id: user._id, username: user.username, createdAt: user.createdAt }
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
    }

    if (action === 'signin') {
      const user = await authenticateUser(username, password);
      if (user && user._id && user.username) {
        const sessionToken = await createSession(user._id.toString(), user.username);
        
        // Create response with session cookie
        const response = NextResponse.json({ 
          success: true, 
          user: { id: user._id, username: user.username, createdAt: user.createdAt }
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
      } else {
        return NextResponse.json({ 
          success: false, 
          error: 'Invalid username or password' 
        }, { status: 401 });
      }
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}
