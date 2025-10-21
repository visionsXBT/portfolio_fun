"use client";

import { useState, useEffect, useCallback } from "react";
import { useSafeWallets, useSafeSolanaWallets, useSafePrivy, useSafeLogin, useSafeLoginWithSiws } from '@/hooks/usePrivySafe';
import JumpingDots from './JumpingDots';

// TypeScript declaration for Phantom wallet
declare global {
  interface Window {
    solana?: {
      isPhantom?: boolean;
      publicKey?: {
        toString: () => string;
      };
      connect?: () => Promise<{ publicKey: { toString: () => string } }>;
      signMessage?: (message: Uint8Array) => Promise<{ signature: Uint8Array }>;
    };
  }
}

interface SignInModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (username: string, userId: string) => void;
  onSwitchToSignUp: () => void;
}

export default function SignInModal({ isOpen, onClose, onSuccess, onSwitchToSignUp }: SignInModalProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isWalletLoading, setIsWalletLoading] = useState(false);

  // Privy hooks - using safe wrappers
  const { wallets } = useSafeWallets();
  const { wallets: solanaWallets } = useSafeSolanaWallets();
  const { authenticated, user, getAccessToken, connectWallet } = useSafePrivy();
  const { login } = useSafeLogin();
  const { generateSiwsMessage, loginWithSiws } = useSafeLoginWithSiws();

  // Handle wallet authentication with our database
  const handleWalletAuthentication = useCallback(async () => {
    // DISABLED: Wallet authentication is not working
    setError("Wallet authentication is currently disabled. Please use username/password authentication.");
    return;
    
    /*
    if (!user) {
      return;
    }

    // Get wallet address from user's linked accounts if wallets array is empty
    let walletAddress;
    if (wallets?.length > 0) {
      walletAddress = wallets[0].address;
    } else if (user.linkedAccounts && user.linkedAccounts.length > 0) {
      // Find Solana wallet in linked accounts
      const solanaAccount = user.linkedAccounts.find(account => 
        account.type === 'wallet' && account.chainType === 'solana'
      );
      if (solanaAccount && 'address' in solanaAccount) {
        walletAddress = solanaAccount.address;
      }
    }

    if (!walletAddress) {
      return;
    }

    try {
      // Get access token from Privy
      const accessToken = await getAccessToken();
      
      // Validate access token format
      if (!accessToken || typeof accessToken !== 'string' || accessToken.length < 10) {
        setError("Authentication failed: Invalid token format");
        setIsWalletLoading(false);
        return;
      }
      
      // Create or find user in our database
      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({ 
          action: 'wallet-auth',
          walletAddress: walletAddress,
          privyUserId: user.id
        })
      });

      // Check if response is JSON
      const contentType = response.headers.get('content-type');
      
      let data;
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        const text = await response.text();
        throw new Error(`API returned non-JSON response: ${text}`);
      }
      
      if (data.success) {
        onSuccess(data.user.username, data.user._id);
        setError("");
        // Close the modal after successful authentication
        onClose();
      } else {
        setError(data.error || "Wallet authentication failed");
      }
    } catch (error) {
      setError("Wallet authentication failed. Please try again.");
    }
    */
  }, [wallets, user, onSuccess, onClose, getAccessToken]);

  // Handle authentication state changes - simplified approach
  useEffect(() => {
    if (authenticated && user && isWalletLoading) {
      // User is authenticated with wallet, create/find user in our database
      handleWalletAuthentication();
      setIsWalletLoading(false);
    }
  }, [authenticated, user, handleWalletAuthentication, isWalletLoading]);

  // Check if Phantom extension is installed
  const isPhantomInstalled = () => {
    return typeof window !== 'undefined' && window.solana && window.solana.isPhantom;
  };

  // Handle wallet connection - split approach for proper popup
  const handleWalletConnect = async () => {
    // DISABLED: Wallet authentication is not working
    setError("Wallet connection is currently disabled. Please use username/password authentication.");
    return;
    
    /*
    setIsWalletLoading(true);
    setError("");

    try {
      // Check if Phantom is installed
      if (!isPhantomInstalled()) {
        setError("Phantom wallet extension is not installed. Please install Phantom wallet first.");
        setIsWalletLoading(false);
        return;
      }

      console.log('🔗 Attempting to connect wallet...');
      console.log('🔗 Phantom installed:', isPhantomInstalled());
      
      // Use Privy's connectWallet from usePrivy hook (not useConnectWallet)
      console.log('🔗 Using Privy connectWallet...');
      await connectWallet();
      
      console.log('✅ Wallet connection successful');
      setIsWalletLoading(false);
    } catch (error) {
      console.error('❌ Wallet connection error:', error);
      setError("Wallet connection failed. Please try again.");
      setIsWalletLoading(false);
    }
    */
  };

  // Handle wallet login with signature - using Privy's authentication
  const handleWalletLogin = async () => {
    // DISABLED: Wallet authentication is not working
    setError("Wallet authentication is currently disabled. Please use username/password authentication.");
    return;
    
    /*
    if (!solanaWallets || solanaWallets.length === 0) {
      setError("Please connect a wallet first");
      return;
    }

    setIsWalletLoading(true);
    setError("");

    try {
      const walletAddress = solanaWallets[0].address;
      console.log('🔐 Signing message for wallet:', walletAddress);
      
      // Generate SIWS message for the connected wallet
      const message = await generateSiwsMessage({ address: walletAddress });
      const encodedMessage = new TextEncoder().encode(message);
      
      // Sign the message with Privy's wallet
      const results = await solanaWallets[0].signMessage({ message: encodedMessage });
      console.log('🔐 Signature results:', results);
      
      // Login with the signed message using Privy
      await loginWithSiws({ 
        message: message, // Use the original string message, not encodedMessage
        signature: Array.from(results.signature).map(byte => byte.toString(16).padStart(2, '0')).join('')
      });
    } catch (error) {
      console.error('Wallet login error:', error);
      setError("Wallet login failed. Please try again.");
      setIsWalletLoading(false);
    }
    */
  };

  // Handle keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Allow Ctrl+A (or Cmd+A on Mac) to select all
    if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
      e.preventDefault();
      const target = e.target as HTMLInputElement;
      target.select();
    }
  };



  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    if (!username.trim() || !password) {
      setError("Please fill in all fields");
      return;
    }

    setIsLoading(true);
    
    try {
      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'signin', username, password })
      });

      const data = await response.json();

      if (data.success) {
        onSuccess(data.user.username, data.user._id);
        setUsername("");
        setPassword("");
        setError("");
      } else {
        setError(data.error || "Sign in failed");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" data-auth-modal>
      <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-white">Sign In</h2>
          <button
            onClick={onClose}
            className="text-white/60 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-500/20 border border-red-500/50 rounded-md p-3 text-red-400 text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm text-white/80 mb-2">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full rounded-md border border-white/20 bg-white/5 text-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--brand-end)]"
              placeholder="Enter your username"
              disabled={isLoading}
            />
          </div>

          <div>
            <label className="block text-sm text-white/80 mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full rounded-md border border-white/20 bg-white/5 text-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--brand-end)]"
              placeholder="Enter your password"
              disabled={isLoading}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-md border border-white/20 bg-white/5 text-white px-4 py-2 text-sm hover:bg-white/10 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 rounded-md bg-[var(--brand-end)] hover:bg-[var(--brand-start)] px-4 py-2 text-sm text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <JumpingDots className="text-white" />
                </div>
              ) : "Sign In"}
            </button>
          </div>

          <div className="text-center pt-2">
            <button
              type="button"
              onClick={onSwitchToSignUp}
              className="text-sm text-white/60 hover:text-white transition-colors"
            >
              Don&apos;t have an account? Sign up
            </button>
          </div>
        </form>

        {/* Wallet Connection Section - DISABLED */}
        {false && (
          <div className="mt-6 pt-6 border-t border-white/20">
            <div className="text-center mb-4">
              <p className="text-sm text-white/60">Or connect with your wallet</p>
              {!isPhantomInstalled() && (
                <p className="text-xs text-yellow-400 mt-1">
                  <a 
                    href="https://phantom.app/" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="underline hover:text-yellow-300"
                  >
                    Install Phantom Wallet
                  </a>
                </p>
              )}
            </div>
            
            <button
              disabled
              className="w-full rounded-md border border-white/20 bg-white/5 text-white/50 px-4 py-2 text-sm transition-colors flex items-center justify-center gap-2 cursor-not-allowed"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M21 7h-3V6a3 3 0 0 0-3-3H5a3 3 0 0 0-3 3v12a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3v-1h3a1 1 0 0 0 1-1V8a1 1 0 0 0-1-1zM5 4h10a1 1 0 0 1 1 1v1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1zm11 14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V8h12v10z"/>
              </svg>
              Wallet Connection (Disabled)
            </button>
            <div className="text-center mt-2">
              <p className="text-xs text-white/40">Wallet authentication is currently disabled</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
