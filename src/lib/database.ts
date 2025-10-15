import bcrypt from 'bcryptjs';

export interface Portfolio {
  id: string;
  name: string;
  rows: Array<{ mint: string }>;
  isExpanded: boolean;
}

export interface UserAccount {
  id: string;
  username: string;
  passwordHash: string;
  createdAt: string;
  portfolios: Portfolio[];
}

export interface AccountData {
  users: UserAccount[];
}

// In-memory database for serverless environment
let accounts: AccountData = { users: [] };

// Read all accounts
export function getAccounts(): AccountData {
  return accounts;
}

// Save accounts to memory
export function saveAccounts(data: AccountData): void {
  accounts = data;
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
export function updateUserPortfolios(userId: string, portfolios: Portfolio[]): void {
  const data = getAccounts();
  const user = data.users.find(user => user.id === userId);
  
  if (user) {
    user.portfolios = portfolios;
    saveAccounts(data);
  }
}
