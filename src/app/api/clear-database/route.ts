import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';

export async function POST(request: NextRequest) {
  try {
    console.log('🗑️ Clearing database...');
    
    const db = await connectToDatabase();
    
    // Clear the users collection
    const result = await db.collection('users').deleteMany({});
    
    console.log(`✅ Cleared ${result.deletedCount} users from database`);
    
    return NextResponse.json({ 
      message: `Successfully cleared ${result.deletedCount} users from database`,
      cleared: true,
      deletedCount: result.deletedCount
    });

  } catch (error) {
    console.error('❌ Error clearing database:', error);
    return NextResponse.json({ 
      message: `Error clearing database: ${(error as Error).message}`,
      cleared: false 
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    console.log('📊 Checking database status...');
    
    const db = await connectToDatabase();
    
    // Count users in the database
    const userCount = await db.collection('users').countDocuments();
    
    return NextResponse.json({ 
      message: `Found ${userCount} users in database`,
      type: 'mongodb',
      userCount: userCount
    });

  } catch (error) {
    console.error('❌ Error checking database:', error);
    return NextResponse.json({ 
      message: `Error checking database: ${(error as Error).message}`,
      type: 'error'
    }, { status: 500 });
  }
}
