import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    
    if (!query || query.trim().length < 1) {
      return NextResponse.json({ users: [] });
    }

    const db = await connectToDatabase();
    if (!db) {
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
    }

    const searchTerm = query.trim();
    console.log(`🔍 Searching for users with username containing: "${searchTerm}"`);

    // First, let's see how many total users exist in the database
    const totalUsers = await db.collection('users').countDocuments();
    console.log(`📊 Total users in database: ${totalUsers}`);

    // Get all usernames for debugging
    const allUsers = await db.collection('users').find({}, { projection: { username: 1 } }).toArray();
    console.log('👥 All usernames in database:', allUsers.map(u => u.username));

    // Search for users by username (case-insensitive, partial match)
    // The regex pattern will match any username that contains the search term anywhere
    const users = await db.collection('users').find({
      username: { 
        $regex: searchTerm, 
        $options: 'i' 
      }
    })
    .limit(10) // Limit to 10 results for performance
    .toArray();

    console.log(`🔍 Found ${users.length} users matching "${searchTerm}"`);

    // Transform the results to include portfolio count
    const searchResults = users.map(user => ({
      id: user._id.toString(),
      username: user.username,
      profilePicture: user.profilePicture,
      portfolioCount: user.portfolios ? user.portfolios.length : 0,
      createdAt: user.createdAt
    }));

    console.log('🔍 Search results:', searchResults);

    return NextResponse.json({ users: searchResults });

  } catch (error) {
    console.error('Error searching users:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
