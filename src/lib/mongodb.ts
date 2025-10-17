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
    
    // Create a new client for each connection attempt (better for serverless)
    client = new MongoClient(uri, {
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 15000,
      socketTimeoutMS: 45000,
      maxPoolSize: 1, // Reduce pool size for serverless
      minPoolSize: 0, // Allow zero connections in serverless
      maxIdleTimeMS: 10000, // Close idle connections faster
      retryWrites: true,
      retryReads: true,
      // SSL/TLS configuration for serverless environments
      tls: true,
      tlsAllowInvalidCertificates: false,
      tlsAllowInvalidHostnames: false,
      // Additional options for Vercel compatibility
      compressors: ['zlib'],
      zlibCompressionLevel: 6,
    });
    
    // Connect with retry logic
    let retries = 3;
    while (retries > 0) {
      try {
        await client.connect();
        break;
      } catch (connectError) {
        retries--;
        if (retries === 0) {
          throw connectError;
        }
        console.log(`Connection attempt failed, retrying... (${retries} attempts left)`);
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second before retry
      }
    }
    
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
