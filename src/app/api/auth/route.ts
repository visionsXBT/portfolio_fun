import { NextRequest, NextResponse } from 'next/server';
import { createAccount, authenticateUser } from '@/lib/database';

export async function POST(request: NextRequest) {
  try {
    const { action, username, password } = await request.json();

    if (action === 'signup') {
      const user = await createAccount(username, password);
      return NextResponse.json({ 
        success: true, 
        user: { id: user.id, username: user.username, createdAt: user.createdAt }
      });
    }

    if (action === 'signin') {
      const user = await authenticateUser(username, password);
      if (user) {
        return NextResponse.json({ 
          success: true, 
          user: { id: user.id, username: user.username, createdAt: user.createdAt }
        });
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
