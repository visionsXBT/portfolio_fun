import { NextRequest, NextResponse } from 'next/server';
import { createAccount, authenticateUser } from '@/lib/database';
import { connectToDatabase } from '@/lib/mongodb';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

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
    const { action, username, password, currentPassword, newPassword } = await request.json();

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

    if (action === 'logout') {
      // Clear the session cookie
      const response = NextResponse.json({ success: true });
      response.cookies.set('sessionToken', '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 0, // Expire immediately
        path: '/'
      });
      return response;
    }

    if (action === 'change-password') {
      // Get session token from cookie
      const sessionToken = request.cookies.get('sessionToken')?.value;
      if (!sessionToken) {
        return NextResponse.json({ 
          success: false, 
          error: 'Not authenticated' 
        }, { status: 401 });
      }

      // Verify session
      const db = await connectToDatabase();
      if (!db) {
        return NextResponse.json({ 
          success: false, 
          error: 'Database connection failed' 
        }, { status: 500 });
      }

      const session = await db.collection('sessions').findOne({ 
        sessionToken, 
        isActive: true,
        expiresAt: { $gt: new Date() }
      });

      if (!session) {
        return NextResponse.json({ 
          success: false, 
          error: 'Invalid session' 
        }, { status: 401 });
      }

      // Get user from database
      const user = await db.collection('users').findOne({ 
        _id: session.userId 
      });

      if (!user) {
        return NextResponse.json({ 
          success: false, 
          error: 'User not found' 
        }, { status: 404 });
      }

      // Verify current password
      const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
      if (!isCurrentPasswordValid) {
        return NextResponse.json({ 
          success: false, 
          error: 'Current password is incorrect' 
        }, { status: 400 });
      }

      // Hash new password
      const hashedNewPassword = await bcrypt.hash(newPassword, 12);

      // Update password in database
      await db.collection('users').updateOne(
        { _id: user._id },
        { $set: { password: hashedNewPassword } }
      );

      return NextResponse.json({ 
        success: true, 
        message: 'Password changed successfully' 
      });
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}
