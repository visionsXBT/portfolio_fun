"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrophy, faUser, faCog, faSignOutAlt, faBars, faTimes, faSave, faEye, faEyeSlash, faWallet } from '@fortawesome/free-solid-svg-icons';
import { useSafeLogout, useSafeWallets, useSafeLogin, useSafePrivy } from '@/hooks/usePrivySafe';
import UserSearchBar from '@/components/UserSearchBar';
import SignInModal from '@/components/SignInModal';
import AccountModal from '@/components/AccountModal';
import ProfilePictureUpload from '@/components/ProfilePictureUpload';

interface UserSession {
  id: string;
  username: string;
  email?: string;
  profilePicture?: string;
  accountType?: 'email' | 'wallet';
  walletAddress?: string;
  usernameSet?: boolean;
  displayName?: string;
}

export default function SettingsPage() {
  const params = useParams();
  const router = useRouter();
  const { logout } = useSafeLogout();
  const { wallets } = useSafeWallets();
  const { login } = useSafeLogin();
  const { authenticated, user, getAccessToken, connectWallet } = useSafePrivy();
  const username = params.username as string;
  
  const [currentUserSession, setCurrentUserSession] = useState<UserSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showSignInModal, setShowSignInModal] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  
  // Settings state
  const [showPassword, setShowPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  
  // Wallet connection state
  // const [isConnectingWallet, setIsConnectingWallet] = useState(false);
  const [walletMessage, setWalletMessage] = useState('');
  
  // Display name change state (for wallet users)
  const [newDisplayName, setNewDisplayName] = useState('');
  const [isChangingDisplayName, setIsChangingDisplayName] = useState(false);
  const [displayNameMessage, setDisplayNameMessage] = useState('');


  // Check user session
  useEffect(() => {
    const checkSession = async () => {
      try {
        const response = await fetch('/api/session');
        const data = await response.json();
        
        if (data.success && data.user) {
          setCurrentUserSession(data.user);
          
          // Redirect if not the current user
          if (data.user.username !== username) {
            router.push(`/${data.user.username}/settings`);
            return;
          }
        } else {
          setShowSignInModal(true);
        }
      } catch (error) {
        console.error('Session check failed:', error);
        setShowSignInModal(true);
      } finally {
        setIsLoading(false);
      }
    };

    checkSession();
  }, [username, router]);

  const handleLogout = async () => {
    console.log('🔴 Starting logout process...');
    
    try {
      // Clear session from server using DELETE method
      console.log('🔴 Clearing session from server...');
      await fetch('/api/session', {
        method: 'DELETE',
        credentials: 'include'
      });
      console.log('✅ Session cleared from server');
    } catch (error) {
      console.error('❌ Error clearing session:', error);
    }
    
    // Clear local storage and session storage
    console.log('🔴 Clearing local storage...');
    localStorage.clear();
    sessionStorage.clear();
    
    // Clear all caches
    if ('caches' in window) {
      caches.keys().then(names => {
        names.forEach(name => {
          caches.delete(name);
        });
      });
    }
    
    // Clear React state immediately
    setCurrentUserSession(null);
    setShowSignInModal(true);
    
    // Disconnect wallets if any
    if (wallets && wallets.length > 0) {
      console.log('🔴 Disconnecting wallets...');
      wallets.forEach(wallet => {
        try {
          wallet.disconnect();
        } catch (error) {
          // Silent fail
        }
      });
    }
    
    // Logout from Privy
    try {
      console.log('🔴 Logging out from Privy...');
      if (logout) {
        await logout();
        console.log('✅ Logged out from Privy');
      }
    } catch (error) {
      console.error('❌ Error logging out from Privy:', error);
    }
    
    // Add a small delay to ensure everything is cleared
    console.log('🔴 Waiting 500ms before refresh...');
    setTimeout(() => {
      console.log('🔴 Refreshing page...');
      window.location.reload();
    }, 500);
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate that all password fields are filled
    if (!currentPassword.trim()) {
      setSaveMessage('Current password is required');
      return;
    }
    
    if (!newPassword.trim()) {
      setSaveMessage('New password is required');
      return;
    }
    
    if (!confirmPassword.trim()) {
      setSaveMessage('Please confirm your new password');
      return;
    }
    
    if (newPassword !== confirmPassword) {
      setSaveMessage('Passwords do not match');
      return;
    }
    
    if (newPassword.length < 6) {
      setSaveMessage('New password must be at least 6 characters');
      return;
    }
    
    setIsSaving(true);
    setSaveMessage('');
    
    try {
      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'change-password',
          currentPassword,
          newPassword
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setSaveMessage('Password changed successfully!');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setSaveMessage(data.error || 'Failed to change password');
      }
    } catch (error) {
      setSaveMessage('Network error. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleWalletConnection = async () => {
    // DISABLED: Wallet authentication is not working
    setWalletMessage('Wallet connection is currently disabled. Please use username/password authentication.');
    return;
    
    /*
    // setIsConnectingWallet(true);
    setWalletMessage('');
    
    try {
      // Connect Solana wallet only
      await connectWallet({
        walletChainType: 'solana-only',
        // Try to force popup behavior
        suggestedAddress: undefined
      });
      
      // First, authenticate with Privy
      await login();
      
      // Get access token from Privy
      const accessToken = await getAccessToken();
      if (!accessToken) {
        throw new Error('Failed to get access token from Privy');
      }
      
      // Connect wallet to existing email account
      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({ 
          action: 'connect-wallet'
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setWalletMessage('Wallet connected successfully! Refreshing page...');
        // Refresh the page to update the user session
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else {
        setWalletMessage(data.error || 'Failed to connect wallet');
      }
    } catch (error) {
      setWalletMessage('Wallet connection failed. Please try again.');
    } finally {
      // setIsConnectingWallet(false);
    }
    */
  };

  const handleDisplayNameChange = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newDisplayName.trim()) {
      setDisplayNameMessage('Please enter a display name');
      return;
    }
    
    if (newDisplayName.length < 3) {
      setDisplayNameMessage('Display name must be at least 3 characters');
      return;
    }
    
    if (newDisplayName.length > 20) {
      setDisplayNameMessage('Display name must be 20 characters or less');
      return;
    }
    
    setIsChangingDisplayName(true);
    setDisplayNameMessage('');
    
    try {
      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'change-display-name',
          newDisplayName: newDisplayName.trim()
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setDisplayNameMessage('Display name set successfully!');
        setNewDisplayName('');
        // Update the current user session
        setCurrentUserSession(prev => prev ? { 
          ...prev, 
          displayName: newDisplayName.trim(), 
          usernameSet: true 
        } : null);
      } else {
        setDisplayNameMessage(data.error || 'Failed to set display name');
      }
    } catch (error) {
      setDisplayNameMessage('Network error. Please try again.');
    } finally {
      setIsChangingDisplayName(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-800">Loading...</div>
      </div>
    );
  }

  if (!currentUserSession) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Please Sign In</h1>
          <p className="text-gray-800/60 mb-6">You need to be signed in to access settings.</p>
          <button
            onClick={() => router.push('/')}
            className="rounded-lg gradient-button px-6 py-3 text-white"
          >
            Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen overflow-hidden flex" style={{ fontFamily: 'Golos Text, sans-serif' }}>
      {/* Navigation Bar */}
      <div className={`
        fixed left-0 top-0 h-screen w-80 glassmorphism z-40 border-r border-[#b8bdbf]
        transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0 lg:static lg:h-screen lg:w-64 lg:bg-transparent lg:backdrop-blur-none lg:border-r-0
      `} style={{ borderRight: '1px solid rgba(107, 114, 128, 0.5)' }}>
        <div className="flex flex-col h-screen p-2 pt-16 lg:h-screen lg:pt-2">
          {/* Logo Section */}
          <div className="flex flex-col items-start gap-2 mb-6">
            <Link href="/" className="w-40 h-20 hover:opacity-80 transition-opacity">
              <Image
                src="/logo.png"
                alt="goPort Logo"
                width={160}
                height={80}
                className="w-full h-full object-contain"
              />
            </Link>
            <div className="flex items-center gap-3 px-4 py-3 rounded-lg border border-[#b8bdbf] text-gray-800 drop-shadow-md w-full">
              <div className="w-12 h-12 rounded-full border border-white/20 overflow-hidden flex-shrink-0">
                {currentUserSession.profilePicture ? (
                  <Image
                    src={currentUserSession.profilePicture}
                    alt={currentUserSession.username}
                    width={48}
                    height={48}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-[var(--brand-start)] to-[var(--brand-end)] flex items-center justify-center text-white font-bold text-lg">
                    {currentUserSession.username.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div className="text-left">
                <div className="text-gray-800 font-medium">
                  {currentUserSession.displayName || currentUserSession.username}
                </div>
                <div className="text-gray-800/60 text-sm">
                  Portfolio Creator
                </div>
              </div>
            </div>
          </div>

          {/* Navigation Items */}
          <nav className="space-y-2">
            <Link
              href="/leaderboard"
              className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-800/80 hover:text-gray-800 hover:bg-[#d7dadb]/60 transition-colors border border-[#b8bdbf]"
              onClick={() => setIsOpen(false)}
            >
              <FontAwesomeIcon icon={faTrophy} className="w-5 h-5" />
              <span className="font-medium">Leaderboard</span>
            </Link>
            
            <Link
              href={`/${currentUserSession.username}`}
              className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-800/80 hover:text-gray-800 hover:bg-[#d7dadb]/60 transition-colors border border-[#b8bdbf]"
              onClick={() => setIsOpen(false)}
            >
              <FontAwesomeIcon icon={faUser} className="w-5 h-5" />
              <span className="font-medium">Portfolio</span>
            </Link>
            
            <div className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-800 bg-[#d7dadb]/60 border border-[#b8bdbf]">
              <FontAwesomeIcon icon={faCog} className="w-5 h-5" />
              <span className="font-medium">Settings</span>
            </div>
          </nav>

          {/* Spacer */}
          <div className="flex-1"></div>
        </div>
      </div>

      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 bg-white/10 backdrop-blur-md border border-white/20 rounded-lg p-2 text-gray-800"
        style={{ fontFamily: 'Golos Text, sans-serif' }}
      >
        <FontAwesomeIcon icon={isOpen ? faTimes : faBars} />
      </button>

      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

            {/* Main Content */}
            <div className="flex-1 lg:ml-12 lg:pl-2 p-4 sm:p-6 md:p-8 pb-40 pt-16 lg:pt-8 overflow-y-auto">
        <div className="w-full">
          {/* Header */}
          <div className="mb-4">
            <div className="flex flex-col sm:flex-row items-center justify-between mb-4 gap-4">
              {/* Search Bar */}
              <div className="w-full sm:flex-1 sm:max-w-2xl order-2 sm:order-1">
                <UserSearchBar />
              </div>
              
              <div className="flex items-center gap-4 order-1 sm:order-2">
                <Link href="/leaderboard" className="gradient-button px-4 py-2 text-sm text-white rounded-md">
                  <FontAwesomeIcon icon={faTrophy} /> Leaderboard
                </Link>
              </div>
            </div>
            
            <h1 className="text-2xl font-semibold mb-1 text-gray-800 drop-shadow-lg">Settings</h1>
            <p className="text-gray-800/60 text-sm drop-shadow-md">
              Manage your account settings and preferences.
            </p>
          </div>

          {/* Settings Content */}
          <div className="space-y-6">
            {/* Profile Picture Upload */}
            <div className="glassmorphism p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Profile Picture</h2>
              <ProfilePictureUpload
                currentImage={currentUserSession.profilePicture}
                onImageChange={(newProfilePicture: string | null) => {
                  setCurrentUserSession(prev => prev ? { ...prev, profilePicture: newProfilePicture || undefined } : null);
                }}
                userId={currentUserSession.id}
                usernameInitial={currentUserSession.username.charAt(0).toUpperCase()}
              />
            </div>

            {/* Account Information */}
            <div className="glassmorphism p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Account Information</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-800/80 mb-2">
                    {currentUserSession.accountType === 'wallet' ? 'Wallet Address' : 'Username'}
                  </label>
                  <div className="bg-[#d7dadb]/60 border border-[#b8bdbf] rounded-md px-3 py-2 text-gray-800">
                    {currentUserSession.accountType === 'wallet' ? currentUserSession.walletAddress : currentUserSession.username}
                  </div>
                </div>
                {currentUserSession.accountType === 'wallet' && currentUserSession.displayName && (
                  <div>
                    <label className="block text-sm text-gray-800/80 mb-2">Display Name</label>
                    <div className="bg-[#d7dadb]/60 border border-[#b8bdbf] rounded-md px-3 py-2 text-gray-800">
                      {currentUserSession.displayName}
                    </div>
                  </div>
                )}
                <div>
                  <label className="block text-sm text-gray-800/80 mb-2">Account Type</label>
                  <div className="bg-[#d7dadb]/60 border border-[#b8bdbf] rounded-md px-3 py-2 text-gray-800">
                    {currentUserSession.accountType === 'wallet' ? 'Wallet Account' : 'User Account'}
                  </div>
                </div>
                {currentUserSession.email && (
                  <div>
                    <label className="block text-sm text-gray-800/80 mb-2">Email</label>
                    <div className="bg-[#d7dadb]/60 border border-[#b8bdbf] rounded-md px-3 py-2 text-gray-800">
                      {currentUserSession.email}
                    </div>
                  </div>
                )}
                {currentUserSession.accountType === 'wallet' && currentUserSession.walletAddress && (
                  <div>
                    <label className="block text-sm text-gray-800/80 mb-2">Wallet Address</label>
                    <div className="bg-[#d7dadb]/60 border border-[#b8bdbf] rounded-md px-3 py-2 text-gray-800 font-mono text-sm">
                      {currentUserSession.walletAddress}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Display Name Change (Wallet Users Only) */}
            {currentUserSession.accountType === 'wallet' && !currentUserSession.usernameSet && (
              <div className="glassmorphism p-6">
                <h2 className="text-xl font-semibold text-gray-800 mb-4">Set Your Display Name</h2>
                <p className="text-gray-800/60 text-sm mb-4">
                  Choose a display name that will be shown on your profile. You can only set this once!
                </p>
                <form onSubmit={handleDisplayNameChange} className="space-y-4">
                  <div>
                    <label className="block text-sm text-gray-800/80 mb-2">Display Name</label>
                    <input
                      type="text"
                      value={newDisplayName}
                      onChange={(e) => setNewDisplayName(e.target.value)}
                      className="w-full bg-[#d7dadb]/60 border border-[#b8bdbf] rounded-md px-3 py-2 text-gray-800 focus:outline-none focus:ring-2 focus:ring-[var(--brand-end)]"
                      placeholder="Enter your display name"
                      required
                      minLength={3}
                      maxLength={20}
                    />
                  </div>
                  
                  {displayNameMessage && (
                    <div className={`text-sm ${displayNameMessage.includes('successfully') ? 'text-green-400' : 'text-red-400'}`}>
                      {displayNameMessage}
                    </div>
                  )}
                  
                  <button
                    type="submit"
                    disabled={isChangingDisplayName}
                    className="w-full bg-[var(--brand-end)] hover:bg-[var(--brand-start)] text-white px-4 py-2 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isChangingDisplayName ? (
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span className="ml-2">Setting Display Name...</span>
                      </div>
                    ) : (
                      <>
                        <FontAwesomeIcon icon={faSave} />
                        Set Display Name
                      </>
                    )}
                  </button>
                </form>
              </div>
            )}

            {/* Wallet Connection (Email Users Only) - DISABLED */}
            {false && currentUserSession?.accountType === 'email' && (
              <div className="glassmorphism p-6">
                <h2 className="text-xl font-semibold text-gray-800 mb-4">Connect Wallet</h2>
                <p className="text-gray-800/60 text-sm mb-4">
                  Connect a wallet to your account for additional security and features.
                </p>
                <button
                  onClick={handleWalletConnection}
                  className="flex items-center gap-2 rounded-md bg-[#d7dadb]/60 text-gray-800 px-4 py-2 text-sm hover:bg-[#d7dadb]/80 transition-colors border border-[#b8bdbf]"
                  disabled
                >
                  <FontAwesomeIcon icon={faWallet} />
                  Connect Wallet (Disabled)
                </button>
                <div className="text-sm mt-2 text-gray-800/60">
                  Wallet connection is currently disabled.
                </div>
              </div>
            )}

            {/* Change Password (Email Users Only) */}
            {currentUserSession.accountType === 'email' && (
              <div className="glassmorphism p-6 mb-20">
                <h2 className="text-xl font-semibold text-gray-800 mb-4">Change Password</h2>
              <form onSubmit={handlePasswordChange} className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-800/80 mb-2">Current Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="w-full bg-[#d7dadb]/60 border border-[#b8bdbf] rounded-md px-3 py-2 text-gray-800 focus:outline-none focus:ring-2 focus:ring-[var(--brand-end)]"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-800/60 hover:text-gray-800"
                    >
                      <FontAwesomeIcon icon={showPassword ? faEyeSlash : faEye} />
                    </button>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm text-gray-800/80 mb-2">New Password</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full bg-[#d7dadb]/60 border border-[#b8bdbf] rounded-md px-3 py-2 text-gray-800 focus:outline-none focus:ring-2 focus:ring-[var(--brand-end)]"
                    required
                    minLength={6}
                  />
                </div>
                
                <div>
                  <label className="block text-sm text-gray-800/80 mb-2">Confirm New Password</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-[#d7dadb]/60 border border-[#b8bdbf] rounded-md px-3 py-2 text-gray-800 focus:outline-none focus:ring-2 focus:ring-[var(--brand-end)]"
                    required
                    minLength={6}
                  />
                </div>
                
                {saveMessage && (
                  <div className={`text-sm ${saveMessage.includes('successfully') ? 'text-green-400' : 'text-red-400'}`}>
                    {saveMessage}
                  </div>
                )}
                
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex items-center gap-2 rounded-md gradient-button px-4 py-2 text-sm text-white disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <FontAwesomeIcon icon={faSave} />
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </form>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Fixed Sign Out Button - positioned above terminal */}
      <div className="fixed bottom-20 left-4 z-40 w-56">
        <button
          onClick={() => {
            console.log('🔴 Sign out button clicked!');
            handleLogout();
          }}
          className="flex items-center gap-3 px-4 py-3 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors glassmorphism border border-red-500/20 w-full"
        >
          <FontAwesomeIcon icon={faSignOutAlt} className="w-5 h-5" />
          <span className="font-medium">Sign Out</span>
        </button>
      </div>

      {/* Modals */}
      {showSignInModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <SignInModal
            isOpen={showSignInModal}
            onClose={() => setShowSignInModal(false)}
            onSuccess={(username, userId) => {
              setShowSignInModal(false);
              window.location.href = `/${username}/settings`;
            }}
            onSwitchToSignUp={() => {
              setShowSignInModal(false);
              setShowAccountModal(true);
            }}
          />
        </div>
      )}

      {showAccountModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <AccountModal
            isOpen={showAccountModal}
            onClose={() => setShowAccountModal(false)}
            onSuccess={(username, userId) => {
              setShowAccountModal(false);
              window.location.href = `/${username}/settings`;
            }}
            onSwitchToSignIn={() => {
              setShowAccountModal(false);
              setShowSignInModal(true);
            }}
          />
        </div>
      )}
    </div>
  );
}
