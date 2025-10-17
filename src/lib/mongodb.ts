import { MongoClient, Db } from 'mongodb';

let client: MongoClient;
let db: Db;

export async function connectToDatabase(): Promise<Db> {
  if (db) {
    return db;
  }

  const uri = process.env.MONGODB_URI;
  const dbName = process.env.MONGODB_DB || 'portfolio_fun';

  // MongoDB URI is required
  if (!uri) {
    throw new Error('MONGODB_URI environment variable is required');
  }

  try {
    console.log('Attempting to connect to MongoDB...');
    console.log('URI:', uri ? `${uri.substring(0, 20)}...` : 'No URI provided');
    console.log('Database:', dbName);
    
    client = new MongoClient(uri, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      maxPoolSize: 10,
      minPoolSize: 1,
      maxIdleTimeMS: 30000,
      retryWrites: true,
      retryReads: true,
    });
    
    // Test the connection first
    await client.connect();
    
    // Test with a simple ping
    await client.db('admin').command({ ping: 1 });
    
    db = client.db(dbName);
    console.log('✅ Successfully connected to MongoDB');
    return db;
  } catch (error) {
    console.error('❌ Failed to connect to MongoDB:', error);
    console.error('Error details:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : 'Unknown error',
      code: (error as Error & { code?: string })?.code || 'No code',
      stack: error instanceof Error ? error.stack : 'No stack trace'
    });
    throw new Error(`MongoDB connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function closeConnection(): Promise<void> {
  if (client) {
    await client.close();
  }
}
