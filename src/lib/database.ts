import bcrypt from 'bcryptjs';
import { connectToDatabase } from './mongodb';

export interface Portfolio {
  id: string;
  name: string;
  rows: Array<{ mint: string }>;
  isExpanded: boolean;
}

export interface UserAccount {
  _id?: string;
  username: string;
  passwordHash: string;
  createdAt: string;
  portfolios: Portfolio[];
}

// Create new account
export async function createAccount(username: string, password: string): Promise<UserAccount> {
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
    createdAt: new Date().toISOString(),
    portfolios: []
  };
  
  const result = await users.insertOne(newUser);
  return { ...newUser, _id: result.insertedId.toString() };
}

// Authenticate user
export async function authenticateUser(username: string, password: string): Promise<UserAccount | null> {
  const db = await connectToDatabase();
  const users = db.collection<UserAccount>('users');
  
  const user = await users.findOne({ username });
  if (!user) {
    return null;
  }
  
  const isValid = await bcrypt.compare(password, user.passwordHash);
  return isValid ? user : null;
}

// Get user by ID
export async function getUserById(id: string): Promise<UserAccount | null> {
  const db = await connectToDatabase();
  const users = db.collection<UserAccount>('users');
  
  try {
    const user = await users.findOne({ _id: id });
    return user;
  } catch {
    return null;
  }
}

// Update user portfolios
export async function updateUserPortfolios(userId: string, portfolios: Portfolio[]): Promise<void> {
  const db = await connectToDatabase();
  const users = db.collection<UserAccount>('users');
  
  await users.updateOne(
    { _id: userId },
    { $set: { portfolios } }
  );
}
