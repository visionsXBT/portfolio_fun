import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';

export async function GET() {
  try {
    console.log('🔥 Warming up database connection...');
    const db = await connectToDatabase();
    
    // Test the connection with a simple operation
    await db.collection('users').findOne({});
    
    console.log('✅ Database connection warmed up successfully');
    return NextResponse.json({ 
      success: true, 
      message: 'Database connection established',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Database warmup failed:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
