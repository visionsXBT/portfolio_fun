import bcrypt from 'bcryptjs';
import { ObjectId } from 'mongodb';
import { connectToDatabase, isUsingInMemory } from './mongodb';

export interface Portfolio {
  id: string;
  name: string;
  rows: Array<{ mint: string }>;
  isExpanded: boolean;
}

export interface UserAccount {
  _id?: string | ObjectId;
  username?: string; // Optional for wallet-only accounts
  passwordHash?: string; // Optional for wallet-only accounts
  walletAddress?: string; // For Privy wallet accounts
  privyUserId?: string; // Privy user ID
  accountType: 'email' | 'wallet'; // Track account type
  createdAt: string;
  portfolios: Portfolio[];
}

// In-memory storage fallback
const inMemoryUsers: UserAccount[] = [];

// Create new account
export async function createAccount(username: string, password: string): Promise<UserAccount> {
  console.log('🔐 Creating account for:', username);
  
  // Always use in-memory during build or if no MongoDB URI
  if (isUsingInMemory() || !process.env.MONGODB_URI) {
    console.log('📝 Using in-memory storage');
    // Check if username already exists
    const existingUser = inMemoryUsers.find(user => user.username === username);
    if (existingUser) {
      throw new Error('Username already exists');
    }
    
    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);
    
    // Create new user
    const newUser: UserAccount = {
      _id: Date.now().toString(),
      username,
      passwordHash,
      accountType: 'email',
      createdAt: new Date().toISOString(),
      portfolios: []
    };
    
    inMemoryUsers.push(newUser);
    console.log('✅ Account created in memory');
    return newUser;
  }

  console.log('🗄️ Using MongoDB storage');
  try {
    const db = await connectToDatabase();
    if (!db) {
      console.error('❌ Database connection failed in createAccount');
      throw new Error('Database connection failed');
    }
    
    const users = db.collection<UserAccount>('users');
    
    // Check if username already exists
    const existingUser = await users.findOne({ username });
    if (existingUser) {
      throw new Error('Username already exists');
    }
    
    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);
    
    // Create new user
    const newUser: UserAccount = {
      username,
      passwordHash,
      accountType: 'email',
      createdAt: new Date().toISOString(),
      portfolios: []
    };
    
    const result = await users.insertOne(newUser);
    console.log('✅ Account created in MongoDB');
    return { ...newUser, _id: result.insertedId.toString() };
  } catch (error) {
    console.error('❌ MongoDB error in createAccount:', error);
    // Fallback to in-memory storage
    console.log('🔄 Falling back to in-memory storage');
    const existingUser = inMemoryUsers.find(user => user.username === username);
    if (existingUser) {
      throw new Error('Username already exists');
    }
    
    const passwordHash = await bcrypt.hash(password, 10);
    const newUser: UserAccount = {
      _id: Date.now().toString(),
      username,
      passwordHash,
      accountType: 'email',
      createdAt: new Date().toISOString(),
      portfolios: []
    };
    
    inMemoryUsers.push(newUser);
    console.log('✅ Account created in memory (fallback)');
    return newUser;
  }
}

// Create wallet account (Privy)
export async function createWalletAccount(walletAddress: string, privyUserId: string): Promise<UserAccount> {
  console.log('🔐 Creating wallet account for:', walletAddress);
  
  // Always use in-memory during build or if no MongoDB URI
  if (isUsingInMemory() || !process.env.MONGODB_URI) {
    console.log('📝 Using in-memory storage for wallet account');
    // Check if wallet already exists
    const existingUser = inMemoryUsers.find(user => user.walletAddress === walletAddress);
    if (existingUser) {
      console.log('✅ Wallet account already exists in memory');
      return existingUser;
    }
    
    // Create new wallet user
    const newUser: UserAccount = {
      _id: Date.now().toString(),
      walletAddress,
      privyUserId,
      accountType: 'wallet',
      createdAt: new Date().toISOString(),
      portfolios: []
    };
    
    inMemoryUsers.push(newUser);
    console.log('✅ Wallet account created in memory');
    return newUser;
  }

  console.log('🗄️ Using MongoDB storage for wallet account');
  try {
    const db = await connectToDatabase();
    if (!db) {
      console.error('❌ Database connection failed in createWalletAccount');
      throw new Error('Database connection failed');
    }
    
    const users = db.collection<UserAccount>('users');
    
    // Check if wallet already exists
    const existingUser = await users.findOne({ walletAddress });
    if (existingUser) {
      console.log('✅ Wallet account already exists in MongoDB');
      return existingUser;
    }
    
    // Create new wallet user
    const newUser: UserAccount = {
      walletAddress,
      privyUserId,
      accountType: 'wallet',
      createdAt: new Date().toISOString(),
      portfolios: []
    };
    
    const result = await users.insertOne(newUser);
    console.log('✅ Wallet account created in MongoDB');
    return { ...newUser, _id: result.insertedId.toString() };
  } catch (error) {
    console.error('❌ MongoDB error in createWalletAccount:', error);
    // Fallback to in-memory storage
    console.log('🔄 Falling back to in-memory storage');
    const existingUser = inMemoryUsers.find(user => user.walletAddress === walletAddress);
    if (existingUser) {
      return existingUser;
    }
    
    const newUser: UserAccount = {
      _id: Date.now().toString(),
      walletAddress,
      privyUserId,
      accountType: 'wallet',
      createdAt: new Date().toISOString(),
      portfolios: []
    };
    
    inMemoryUsers.push(newUser);
    console.log('✅ Wallet account created in memory (fallback)');
    return newUser;
  }
}

// Get user by wallet address
export async function getUserByWalletAddress(walletAddress: string): Promise<UserAccount | null> {
  console.log('👤 Getting user by wallet address:', walletAddress);
  
  // Always use in-memory during build or if no MongoDB URI
  if (isUsingInMemory() || !process.env.MONGODB_URI) {
    console.log('📝 Using in-memory storage for getUserByWalletAddress');
    const user = inMemoryUsers.find(user => user.walletAddress === walletAddress) || null;
    console.log(user ? '✅ User found in memory' : '❌ User not found in memory');
    return user;
  }

  console.log('🗄️ Using MongoDB storage for getUserByWalletAddress');
  try {
    const db = await connectToDatabase();
    if (!db) {
      console.error('❌ Database connection failed in getUserByWalletAddress');
      throw new Error('Database connection failed');
    }
    
    const users = db.collection<UserAccount>('users');
    
    const user = await users.findOne({ walletAddress });
    console.log(user ? '✅ User found in MongoDB' : '❌ User not found in MongoDB');
    return user;
  } catch (error) {
    console.error('❌ MongoDB error in getUserByWalletAddress:', error);
    // Fallback to in-memory storage
    console.log('🔄 Falling back to in-memory storage');
    const user = inMemoryUsers.find(user => user.walletAddress === walletAddress) || null;
    console.log(user ? '✅ User found in memory (fallback)' : '❌ User not found in memory (fallback)');
    return user;
  }
}

// Authenticate user
export async function authenticateUser(username: string, password: string): Promise<UserAccount | null> {
  console.log('🔑 Authenticating user:', username);
  
  // Always use in-memory during build or if no MongoDB URI
  if (isUsingInMemory() || !process.env.MONGODB_URI) {
    console.log('📝 Using in-memory storage for authentication');
    const user = inMemoryUsers.find(user => user.username === username);
    if (!user) {
      console.log('❌ User not found in memory');
      return null;
    }
    
    const isValid = await bcrypt.compare(password, user.passwordHash!);
    console.log(isValid ? '✅ Authentication successful' : '❌ Invalid password');
    return isValid ? user : null;
  }

  console.log('🗄️ Using MongoDB storage for authentication');
  try {
    const db = await connectToDatabase();
    if (!db) {
      console.error('❌ Database connection failed in authenticateUser');
      throw new Error('Database connection failed');
    }
    
    const users = db.collection<UserAccount>('users');
    
    const user = await users.findOne({ username });
    if (!user) {
      console.log('❌ User not found in MongoDB');
      return null;
    }
    
    const isValid = await bcrypt.compare(password, user.passwordHash!);
    console.log(isValid ? '✅ Authentication successful' : '❌ Invalid password');
    return isValid ? user : null;
  } catch (error) {
    console.error('❌ MongoDB error in authenticateUser:', error);
    // Fallback to in-memory storage
    console.log('🔄 Falling back to in-memory storage');
    const user = inMemoryUsers.find(user => user.username === username);
    if (!user) {
      console.log('❌ User not found in memory (fallback)');
      return null;
    }
    
    const isValid = await bcrypt.compare(password, user.passwordHash!);
    console.log(isValid ? '✅ Authentication successful (fallback)' : '❌ Invalid password (fallback)');
    return isValid ? user : null;
  }
}

// Get user by ID
export async function getUserById(id: string): Promise<UserAccount | null> {
  console.log('👤 Getting user by ID:', id);
  
  // Always use in-memory during build or if no MongoDB URI
  if (isUsingInMemory() || !process.env.MONGODB_URI) {
    console.log('📝 Using in-memory storage for getUserById');
    const user = inMemoryUsers.find(user => user._id === id) || null;
    console.log(user ? '✅ User found in memory' : '❌ User not found in memory');
    return user;
  }

  console.log('🗄️ Using MongoDB storage for getUserById');
  try {
    const db = await connectToDatabase();
    if (!db) {
      console.error('❌ Database connection failed in getUserById');
      throw new Error('Database connection failed');
    }
    
    const users = db.collection<UserAccount>('users');
    
    // Try to find user by ObjectId first, then by string ID
    let user = null;
    try {
      // Try with ObjectId first
      user = await users.findOne({ _id: new ObjectId(id) } as Record<string, unknown>);
      if (user) {
        console.log('✅ User found in MongoDB by ObjectId');
        return user;
      }
    } catch {
      console.log('⚠️ ObjectId conversion failed, trying string ID');
    }
    
    // Try with string ID
    user = await users.findOne({ _id: id });
    console.log(user ? '✅ User found in MongoDB by string ID' : '❌ User not found in MongoDB');
    return user;
  } catch (error) {
    console.error('❌ MongoDB error in getUserById:', error);
    // Fallback to in-memory storage
    console.log('🔄 Falling back to in-memory storage');
    const user = inMemoryUsers.find(user => user._id === id) || null;
    console.log(user ? '✅ User found in memory (fallback)' : '❌ User not found in memory (fallback)');
    return user;
  }
}

// Update user portfolios
export async function updateUserPortfolios(userId: string, portfolios: Portfolio[]): Promise<void> {
  console.log('💾 Updating portfolios for user:', userId);
  
  // Always use in-memory during build or if no MongoDB URI
  if (isUsingInMemory() || !process.env.MONGODB_URI) {
    console.log('📝 Using in-memory storage for portfolio update');
    const user = inMemoryUsers.find(user => user._id === userId);
    if (user) {
      user.portfolios = portfolios;
      console.log('✅ Portfolios updated in memory');
    } else {
      console.warn('⚠️ User not found in memory storage');
    }
    return;
  }

  console.log('🗄️ Using MongoDB storage for portfolio update');
  try {
    const db = await connectToDatabase();
    if (!db) {
      console.error('❌ Database connection failed in updateUserPortfolios');
      throw new Error('Database connection failed');
    }
    
    const users = db.collection<UserAccount>('users');
    
    // Try to update by ObjectId first, then by string ID
    let updateResult = null;
    try {
      // Try with ObjectId first
      updateResult = await users.updateOne(
        { _id: new ObjectId(userId) } as Record<string, unknown>,
        { $set: { portfolios } }
      );
      if (updateResult.matchedCount > 0) {
        console.log('✅ Portfolios updated in MongoDB by ObjectId');
        return;
      }
    } catch {
      console.log('⚠️ ObjectId conversion failed, trying string ID');
    }
    
    // Try with string ID
    updateResult = await users.updateOne(
      { _id: userId },
      { $set: { portfolios } }
    );
    console.log('✅ Portfolios updated in MongoDB by string ID');
  } catch (error) {
    console.error('❌ MongoDB error in updateUserPortfolios:', error);
    // Fallback to in-memory storage
    console.log('🔄 Falling back to in-memory storage');
    const user = inMemoryUsers.find(user => user._id === userId);
    if (user) {
      user.portfolios = portfolios;
      console.log('✅ Portfolios updated in memory (fallback)');
    } else {
      console.warn('⚠️ User not found in memory storage (fallback)');
    }
  }
}
