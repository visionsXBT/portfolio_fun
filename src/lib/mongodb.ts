import { MongoClient, Db } from 'mongodb';

let client: MongoClient;
let db: Db;
let useInMemory = false;

export async function connectToDatabase(): Promise<Db> {
  if (db) {
    return db;
  }

  const uri = process.env.MONGODB_URI;
  const dbName = process.env.MONGODB_DB || 'portfolio_fun';

  // If no MongoDB URI is provided, use in-memory storage
  if (!uri) {
    console.log('No MongoDB URI provided, using in-memory storage');
    useInMemory = true;
    return null as unknown as Db; // Will be handled by database functions
  }

  try {
    client = new MongoClient(uri, {
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    });
    await client.connect();
    db = client.db(dbName);
    console.log('Connected to MongoDB');
    return db;
  } catch (error) {
    console.error('Failed to connect to MongoDB, falling back to in-memory storage:', error);
    useInMemory = true;
    return null as unknown as Db; // Will be handled by database functions
  }
}

export function isUsingInMemory(): boolean {
  return useInMemory;
}

export async function closeConnection(): Promise<void> {
  if (client) {
    await client.close();
  }
}
