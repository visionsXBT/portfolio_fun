const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://reachyuann_db_user:yuann020202@cluster0.uo1lq4p.mongodb.net/?';
const MONGODB_DB = process.env.MONGODB_DB || 'port_fun';

async function clearDatabase() {
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    const db = client.db(MONGODB_DB);

    console.log(`📊 Connected to MongoDB database: ${MONGODB_DB}`);

    // Get all collections
    const collections = await db.listCollections().toArray();
    console.log(`Found ${collections.length} collection(s)`);

    if (collections.length === 0) {
      console.log('✅ Database is already empty!');
      return;
    }

    // Drop each collection
    for (const collection of collections) {
      await db.collection(collection.name).deleteMany({});
      console.log(`🗑️  Cleared collection: ${collection.name}`);
    }

    console.log('✅ Successfully cleared all collections from the database!');
  } catch (error) {
    console.error('❌ Error clearing database:', error);
    process.exit(1);
  } finally {
    await client.close();
  }
}

clearDatabase();
