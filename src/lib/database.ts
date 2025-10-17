import bcrypt from 'bcryptjs';
import { ObjectId } from 'mongodb';
import { connectToDatabase } from './mongodb';

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

// Create new account
export async function createAccount(username: string, password: string): Promise<UserAccount> {
  console.log('🔐 Creating account for:', username);
  
  try {
    const db = await connectToDatabase();
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
    console.error('❌ Error creating account:', error);
    throw error;
  }
}

// Create wallet account (Privy)
export async function createWalletAccount(walletAddress: string, privyUserId: string): Promise<UserAccount> {
  console.log('🔐 Creating wallet account for:', walletAddress);
  
  try {
    const db = await connectToDatabase();
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
    console.error('❌ Error creating wallet account:', error);
    throw error;
  }
}

// Authenticate user
export async function authenticateUser(username: string, password: string): Promise<UserAccount | null> {
  console.log('🔐 Authenticating user:', username);
  
  try {
    const db = await connectToDatabase();
    const users = db.collection<UserAccount>('users');
    
    const user = await users.findOne({ username });
    if (!user) {
      console.log('❌ User not found');
      return null;
    }
    
    if (!user.passwordHash) {
      console.log('❌ User has no password hash');
      return null;
    }
    
    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      console.log('❌ Invalid password');
      return null;
    }
    
    console.log('✅ User authenticated successfully');
    return user;
  } catch (error) {
    console.error('❌ Error authenticating user:', error);
    throw error;
  }
}

// Get user by ID
export async function getUserById(id: string): Promise<UserAccount | null> {
  console.log('🔍 Getting user by ID:', id);
  
  try {
    const db = await connectToDatabase();
    const users = db.collection<UserAccount>('users');
    
    // Try ObjectId first, then string
    let user = null;
    try {
      user = await users.findOne({ _id: new ObjectId(id) });
    } catch {
      user = await users.findOne({ _id: id });
    }
    
    if (!user) {
      console.log('❌ User not found');
      return null;
    }
    
    console.log('✅ User found');
    return user;
  } catch (error) {
    console.error('❌ Error getting user by ID:', error);
    throw error;
  }
}

// Update user portfolios
export async function updateUserPortfolios(userId: string, portfolios: Portfolio[]): Promise<void> {
  console.log('💾 Updating portfolios for user:', userId);
  
  try {
    const db = await connectToDatabase();
    const users = db.collection<UserAccount>('users');
    
    // Try ObjectId first, then string
    let result = null;
    try {
      result = await users.updateOne(
        { _id: new ObjectId(userId) },
        { $set: { portfolios } }
      );
    } catch {
      result = await users.updateOne(
        { _id: userId },
        { $set: { portfolios } }
      );
    }
    
    if (result.matchedCount === 0) {
      throw new Error('User not found');
    }
    
    console.log('✅ Portfolios updated successfully');
  } catch (error) {
    console.error('❌ Error updating portfolios:', error);
    throw error;
  }
}