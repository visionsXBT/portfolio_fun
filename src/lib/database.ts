import { writeFileSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';
import bcrypt from 'bcryptjs';

const DB_PATH = join(process.cwd(), 'data', 'accounts.json');

export interface UserAccount {
  id: string;
  username: string;
  passwordHash: string;
  createdAt: string;
  portfolios: any[];
}

export interface AccountData {
  users: UserAccount[];
}

// Initialize database if it doesn't exist
function initDatabase(): AccountData {
  if (!existsSync(DB_PATH)) {
    const data: AccountData = { users: [] };
    writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
  }
  return JSON.parse(readFileSync(DB_PATH, 'utf8'));
}

// Read all accounts
export function getAccounts(): AccountData {
  return initDatabase();
}

// Save accounts to file
export function saveAccounts(data: AccountData): void {
  writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

// Create new account
export async function createAccount(username: string, password: string): Promise<UserAccount> {
  const data = getAccounts();
  
  // Check if username already exists
  if (data.users.find(user => user.username === username)) {
    throw new Error('Username already exists');
  }
  
  // Hash password
  const passwordHash = await bcrypt.hash(password, 10);
  
  // Create new user
  const newUser: UserAccount = {
    id: Date.now().toString(),
    username,
    passwordHash,
    createdAt: new Date().toISOString(),
    portfolios: []
  };
  
  data.users.push(newUser);
  saveAccounts(data);
  
  return newUser;
}

// Authenticate user
export async function authenticateUser(username: string, password: string): Promise<UserAccount | null> {
  const data = getAccounts();
  const user = data.users.find(user => user.username === username);
  
  if (!user) {
    return null;
  }
  
  const isValid = await bcrypt.compare(password, user.passwordHash);
  return isValid ? user : null;
}

// Get user by ID
export function getUserById(id: string): UserAccount | null {
  const data = getAccounts();
  return data.users.find(user => user.id === id) || null;
}

// Update user portfolios
export function updateUserPortfolios(userId: string, portfolios: any[]): void {
  const data = getAccounts();
  const user = data.users.find(user => user.id === userId);
  
  if (user) {
    user.portfolios = portfolios;
    saveAccounts(data);
  }
}
