import { NextRequest, NextResponse } from 'next/server';
import { createAccount, authenticateUser } from '@/lib/database';
import { connectToDatabase } from '@/lib/mongodb';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { ObjectId } from 'mongodb';

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

  return {
    sessionToken,
    expiresAt: sessionData.expiresAt
  };
}

export async function POST(request: NextRequest) {
  try {
    const { action, username, password, currentPassword, newPassword, walletAddress, newDisplayName } = await request.json();

    if (action === 'signup') {
      if (!username || !password) {
        return NextResponse.json({ 
          success: false, 
          error: 'Username and password are required' 
        }, { status: 400 });
      }

      try {
        const result = await createAccount(username, password);
        
        // Create session
        const session = await createSession(result._id?.toString() || '', username);

        // Create response with session cookie
        const response = NextResponse.json({
          success: true,
          user: {
            _id: result._id,
            username: result.username,
            displayName: result.displayName,
            accountType: result.accountType
          },
          sessionToken: session.sessionToken
        });

        // Set secure HTTP-only cookie
        response.cookies.set('sessionToken', session.sessionToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
          path: '/'
        });

        return response;
      } catch (error: any) {
        return NextResponse.json({ 
          success: false, 
          error: error.message 
        }, { status: 400 });
      }
    }

    if (action === 'signin') {
      if (!username || !password) {
        return NextResponse.json({ 
          success: false, 
          error: 'Username and password are required' 
        }, { status: 400 });
      }

      try {
        const result = await authenticateUser(username, password);
        
        if (!result) {
          return NextResponse.json({ 
            success: false, 
            error: 'Invalid username or password' 
          }, { status: 401 });
        }
        
        // Create session
        const session = await createSession(result._id?.toString() || '', username);

        // Create response with session cookie
        const response = NextResponse.json({
          success: true,
          user: {
            _id: result._id,
            username: result.username,
            displayName: result.displayName,
            accountType: result.accountType
          },
          sessionToken: session.sessionToken
        });

        // Set secure HTTP-only cookie
        response.cookies.set('sessionToken', session.sessionToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
          path: '/'
        });

        return response;
      } catch (error: any) {
        return NextResponse.json({ 
          success: false, 
          error: 'Invalid username or password' 
        }, { status: 401 });
      }
    }

    if (action === 'wallet-auth') {
      if (!walletAddress) {
        return NextResponse.json({ 
          success: false, 
          error: 'Wallet address is required' 
        }, { status: 400 });
      }

      const db = await connectToDatabase();
      if (!db) {
        return NextResponse.json({ 
          success: false, 
          error: 'Database connection failed' 
        }, { status: 500 });
      }

      // Check if user already exists with this wallet address
      let user = await db.collection('users').findOne({
        walletAddress: walletAddress.toLowerCase()
      });

      if (!user) {
        // Create new user with wallet
        const defaultUsername = `wallet_${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`;
        
        // Ensure username is unique
        let username = defaultUsername;
        let counter = 1;
        while (await db.collection('users').findOne({ username })) {
          username = `${defaultUsername}_${counter}`;
          counter++;
        }

        const newUser = {
          username,
          email: null,
          password: null,
          walletAddress: walletAddress.toLowerCase(),
          accountType: 'wallet',
          displayName: null, // Will be set when user chooses their display name
          createdAt: new Date(),
          updatedAt: new Date()
        };

        const result = await db.collection('users').insertOne(newUser);
        user = { ...newUser, _id: result.insertedId };
      }

      // Create session
      const session = await createSession(user._id?.toString() || '', user.username || '');

      // Create response with session cookie
      const response = NextResponse.json({
        success: true,
        user: {
          _id: user._id,
          username: user.username,
          displayName: user.displayName,
          walletAddress: user.walletAddress,
          accountType: user.accountType
        },
        sessionToken: session.sessionToken
      });

      // Set secure HTTP-only cookie
      response.cookies.set('sessionToken', session.sessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
        path: '/'
      });

      return response;
    }

    if (action === 'change-display-name') {
      if (!newDisplayName || !newDisplayName.trim()) {
        return NextResponse.json({ 
          success: false, 
          error: 'Display name is required' 
        }, { status: 400 });
      }

      // Get session token from cookies
      const sessionToken = request.cookies.get('sessionToken')?.value;
      if (!sessionToken) {
        return NextResponse.json({ 
          success: false, 
          error: 'Not authenticated' 
        }, { status: 401 });
      }

      const db = await connectToDatabase();
      if (!db) {
        return NextResponse.json({ 
          success: false, 
          error: 'Database connection failed' 
        }, { status: 500 });
      }

      // Verify session
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

      // Update user's display name
      const result = await db.collection('users').updateOne(
        { _id: new ObjectId(session.userId) },
        { 
          $set: { 
            displayName: newDisplayName.trim(),
            updatedAt: new Date()
          } 
        }
      );

      if (result.modifiedCount === 0) {
        return NextResponse.json({ 
          success: false, 
          error: 'Failed to update display name' 
        }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        message: 'Display name updated successfully'
      });
    }

    if (action === 'change-password') {
      if (!currentPassword || !newPassword) {
        return NextResponse.json({ 
          success: false, 
          error: 'Current password and new password are required' 
        }, { status: 400 });
      }

      // Get session token from cookies
      const sessionToken = request.cookies.get('sessionToken')?.value;
      if (!sessionToken) {
        return NextResponse.json({ 
          success: false, 
          error: 'Not authenticated' 
        }, { status: 401 });
      }

      const db = await connectToDatabase();
      if (!db) {
        return NextResponse.json({ 
          success: false, 
          error: 'Database connection failed' 
        }, { status: 500 });
      }

      // Verify session
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

      // Get user
      const user = await db.collection('users').findOne({
        _id: new ObjectId(session.userId)
      });

      if (!user || !user.password) {
        return NextResponse.json({ 
          success: false, 
          error: 'User not found or no password set' 
        }, { status: 404 });
      }

      // Verify current password
      const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
      if (!isCurrentPasswordValid) {
        return NextResponse.json({ 
          success: false, 
          error: 'Current password is incorrect' 
        }, { status: 401 });
      }

      // Hash new password
      const hashedNewPassword = await bcrypt.hash(newPassword, 12);

      // Update password
      const result = await db.collection('users').updateOne(
        { _id: new ObjectId(session.userId) },
        { 
          $set: { 
            password: hashedNewPassword,
            updatedAt: new Date()
          } 
        }
      );

      if (result.modifiedCount === 0) {
        return NextResponse.json({ 
          success: false, 
          error: 'Failed to update password' 
        }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        message: 'Password updated successfully'
      });
    }

    return NextResponse.json({ 
      success: false, 
      error: 'Invalid action' 
    }, { status: 400 });

  } catch (error) {
    console.error('Auth API error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}