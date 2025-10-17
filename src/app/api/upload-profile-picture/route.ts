import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function POST(request: NextRequest) {
  try {
    const { userId, imageData } = await request.json();
    
    if (!userId || !imageData) {
      return NextResponse.json({ error: 'User ID and image data required' }, { status: 400 });
    }

    const db = await connectToDatabase();
    if (!db) {
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
    }

    // Generate a unique filename
    const timestamp = Date.now();
    
    // For now, we'll store the base64 data directly in the database
    // In production, you'd want to upload to a cloud storage service like AWS S3
    const profilePictureUrl = `data:image/jpeg;base64,${imageData.split(',')[1]}`;

    // Try different ways to find the user
    let result = null;
    
    // First try with ObjectId
    try {
      result = await db.collection('users').updateOne(
        { _id: new ObjectId(userId) },
        { $set: { profilePicture: profilePictureUrl } }
      );
    } catch {
      // If ObjectId fails, try with string ID
      result = await db.collection('users').updateOne(
        { _id: userId },
        { $set: { profilePicture: profilePictureUrl } }
      );
    }

    // If still not found, try with id field (not _id)
    if (result.matchedCount === 0) {
      result = await db.collection('users').updateOne(
        { id: userId },
        { $set: { profilePicture: profilePictureUrl } }
      );
    }

    if (result.matchedCount === 0) {
      console.error('User not found with ID:', userId);
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ 
      success: true, 
      profilePictureUrl: profilePictureUrl 
    });

  } catch (error) {
    console.error('Error uploading profile picture:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
