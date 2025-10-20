import { NextRequest, NextResponse } from 'next/server';
import { createAccount, authenticateUser } from '@/lib/database';
import { connectToDatabase } from '@/lib/mongodb';
import { verifyPrivyToken, extractAccessToken } from '@/lib/privy-verification';
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

  return sessionToken;
}

export async function POST(request: NextRequest) {
  try {
    const { action, username, password, currentPassword, newPassword, walletAddress, privyUserId, newDisplayName } = await request.json();

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

    if (action === 'wallet-auth') {
      if (!walletAddress || !privyUserId) {
        return NextResponse.json({ 
          success: false, 
          error: 'Wallet address and Privy user ID are required' 
        }, { status: 400 });
      }

      // Verify Privy access token
      const authHeader = request.headers.get('authorization');
      const accessToken = extractAccessToken(authHeader);
      
      if (!accessToken) {
        return NextResponse.json({ 
          success: false, 
          error: 'Authorization header with Bearer token is required' 
        }, { status: 401 });
      }

      try {
        const verifiedToken = await verifyPrivyToken(accessToken);
        console.log('Verified Privy token:', verifiedToken);
        
        // Verify that the token's user ID matches the provided privyUserId
        if (verifiedToken.sub !== privyUserId) {
          return NextResponse.json({ 
            success: false, 
            error: 'Token user ID does not match provided user ID' 
          }, { status: 401 });
        }
      } catch (error) {
        console.error('Token verification failed:', error);
        return NextResponse.json({ 
          success: false, 
          error: 'Invalid or expired token' 
        }, { status: 401 });
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
        $or: [
          { walletAddress: walletAddress.toLowerCase() },
          { privyUserId }
        ]
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
          privyUserId,
          accountType: 'wallet',
          displayName: null, // Will be set when user chooses their display name
          usernameSet: false,
          createdAt: new Date(),
          updatedAt: new Date(),
          portfolios: []
        };

        const result = await db.collection('users').insertOne(newUser);
        user = { ...newUser, _id: result.insertedId };
      }

      if (user && user._id && user.username) {
        const sessionToken = await createSession(user._id.toString(), user.username);
        
        // Create response with session cookie
        const response = NextResponse.json({ 
          success: true, 
          user: { 
            id: user._id, 
            username: user.username, 
            accountType: user.accountType,
            walletAddress: user.walletAddress,
            usernameSet: user.usernameSet,
            createdAt: user.createdAt 
          }
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
          error: 'Failed to authenticate wallet' 
        }, { status: 500 });
      }
    }

    if (action === 'connect-wallet') {
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
      const user = await db.collection('users').findOne({ _id: new ObjectId(session.userId) });
      if (!user) {
        return NextResponse.json({ 
          success: false, 
          error: 'User not found' 
        }, { status: 404 });
      }

      // Check if user already has a wallet connected
      if (user.accountType === 'wallet') {
        return NextResponse.json({ 
          success: false, 
          error: 'User already has a wallet connected' 
        }, { status: 400 });
      }

      // Verify Privy access token
      const authHeader = request.headers.get('authorization');
      const accessToken = extractAccessToken(authHeader);
      
      if (!accessToken) {
        return NextResponse.json({ 
          success: false, 
          error: 'Authorization header with Bearer token is required' 
        }, { status: 401 });
      }

      try {
        const verifiedToken = await verifyPrivyToken(accessToken);
        console.log('Verified Privy token for wallet connection:', verifiedToken);
        
        // Get wallet address from Privy token
        let walletAddress;
        if (verifiedToken.linkedAccounts && verifiedToken.linkedAccounts.length > 0) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const solanaAccount = verifiedToken.linkedAccounts.find((account: any) => 
            account.type === 'wallet' && account.chainType === 'solana'
          );
          if (solanaAccount && 'address' in solanaAccount) {
            walletAddress = solanaAccount.address;
          }
        }

        if (!walletAddress) {
          return NextResponse.json({ 
            success: false, 
            error: 'No wallet address found in Privy account' 
          }, { status: 400 });
        }

        // Update user to include wallet information (keep email account type and username)
        await db.collection('users').updateOne(
          { _id: user._id },
          { 
            $set: { 
              walletAddress: walletAddress.toLowerCase(),
              privyUserId: verifiedToken.sub,
              // Keep accountType as 'email' to maintain /{username} URL structure
              updatedAt: new Date()
            }
          }
        );

        return NextResponse.json({ 
          success: true, 
          message: 'Wallet connected successfully',
          user: {
            id: user._id,
            username: user.username,
            accountType: 'email', // Keep as email to maintain /{username} URL structure
            walletAddress: walletAddress.toLowerCase()
          }
        });
      } catch (error) {
        console.error('Token verification failed:', error);
        return NextResponse.json({ 
          success: false, 
          error: 'Invalid or expired token' 
        }, { status: 401 });
      }
    }

    if (action === 'change-display-name') {
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
      const user = await db.collection('users').findOne({ _id: new ObjectId(session.userId) });
      if (!user) {
        return NextResponse.json({ 
          success: false, 
          error: 'User not found' 
        }, { status: 404 });
      }

      // Only allow wallet users to change display name
      if (user.accountType !== 'wallet') {
        return NextResponse.json({ 
          success: false, 
          error: 'Only wallet users can change display name' 
        }, { status: 400 });
      }

      // Check if user has already set their display name
      if (user.usernameSet) {
        return NextResponse.json({ 
          success: false, 
          error: 'Display name can only be set once' 
        }, { status: 400 });
      }


      if (!newDisplayName || newDisplayName.trim().length < 3) {
        return NextResponse.json({ 
          success: false, 
          error: 'Display name must be at least 3 characters' 
        }, { status: 400 });
      }

      if (newDisplayName.trim().length > 20) {
        return NextResponse.json({ 
          success: false, 
          error: 'Display name must be 20 characters or less' 
        }, { status: 400 });
      }

      // Check if display name is already taken
      const existingUser = await db.collection('users').findOne({ 
        displayName: newDisplayName.trim(),
        _id: { $ne: user._id }
      });

      if (existingUser) {
        return NextResponse.json({ 
          success: false, 
          error: 'Display name is already taken' 
        }, { status: 400 });
      }

      // Update user with new display name
      await db.collection('users').updateOne(
        { _id: user._id },
        { 
          $set: { 
            displayName: newDisplayName.trim(),
            usernameSet: true,
            updatedAt: new Date()
          }
        }
      );

      return NextResponse.json({ 
        success: true, 
        message: 'Display name set successfully',
        user: {
          id: user._id,
          username: user.username, // Keep the wallet-based username for URL
          displayName: newDisplayName.trim(),
          accountType: user.accountType,
          walletAddress: user.walletAddress,
          usernameSet: true
        }
      });
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
        _id: new ObjectId(session.userId) 
      });

      if (!user) {
        return NextResponse.json({ 
          success: false, 
          error: 'User not found' 
        }, { status: 404 });
      }

      // Check if user is a wallet account (they don't have passwords)
      if (user.accountType === 'wallet') {
        return NextResponse.json({ 
          success: false, 
          error: 'Wallet accounts do not use passwords' 
        }, { status: 400 });
      }

      // Validate password fields
      if (!currentPassword || !newPassword) {
        return NextResponse.json({ 
          success: false, 
          error: 'Current password and new password are required' 
        }, { status: 400 });
      }


      // Debug: Check what we have for user.passwordHash
      console.log('User password debug:', {
        userPasswordHashExists: !!user.passwordHash,
        userPasswordHashType: typeof user.passwordHash,
        userPasswordHashLength: user.passwordHash?.length,
        userAccountType: user.accountType,
        userId: user._id
      });

      // Handle case where user doesn't have a password set (shouldn't happen for email accounts, but can occur)
      if (!user.passwordHash) {
        console.log('WARNING: User passwordHash is undefined/null for email account, allowing password to be set');
        // For email accounts without a password, we'll skip the current password verification
        // and just set the new password directly
      } else {
        // Verify current password only if user has a password
        const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash);
        if (!isCurrentPasswordValid) {
          return NextResponse.json({ 
            success: false, 
            error: 'Current password is incorrect' 
          }, { status: 400 });
        }
      }

      // Hash new password
      const hashedNewPassword = await bcrypt.hash(newPassword, 12);

      // Update password in database
      await db.collection('users').updateOne(
        { _id: user._id },
        { $set: { passwordHash: hashedNewPassword } }
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
