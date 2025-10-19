"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrophy, faUser, faCog, faSignOutAlt, faBars, faTimes, faSave, faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons';
import UserSearchBar from '@/components/UserSearchBar';
import SignInModal from '@/components/SignInModal';
import AccountModal from '@/components/AccountModal';

interface UserSession {
  userId: string;
  username: string;
  profilePicture?: string;
}

export default function SettingsPage() {
  const params = useParams();
  const router = useRouter();
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
    try {
      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'logout' })
      });

      if (response.ok) {
        router.push('/');
      }
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    
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

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  if (!currentUserSession) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Please Sign In</h1>
          <p className="text-white/60 mb-6">You need to be signed in to access settings.</p>
          <button
            onClick={() => setShowSignInModal(true)}
            className="rounded-lg gradient-button px-6 py-3 text-white"
          >
            Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex" style={{ fontFamily: 'Golos Text, sans-serif' }}>
      {/* Navigation Bar */}
      <div className={`
        fixed left-0 top-0 h-screen w-48 bg-white/5 backdrop-blur-md border-r border-white/10 z-40
        transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0 lg:static lg:h-auto lg:w-auto lg:bg-transparent lg:backdrop-blur-none lg:border-r-0
      `}>
        <div className="flex flex-col h-screen p-6 pb-16">
          {/* Logo Section */}
          <div className="flex flex-col items-center gap-3 mb-8">
            <Link href="/" className="w-40 h-20 hover:opacity-80 transition-opacity">
              <Image
                src="/logo.png"
                alt="onPort Logo"
                width={160}
                height={80}
                className="w-full h-full object-contain"
              />
            </Link>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full border border-white/20 overflow-hidden bg-gradient-to-br from-[var(--brand-start)] to-[var(--brand-end)]">
                <Image
                  src={currentUserSession.profilePicture || '/placeholder-token.svg'}
                  alt={currentUserSession.username}
                  width={48}
                  height={48}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="text-center">
                <div className="text-white font-medium text-lg">
                  {currentUserSession.username}
                </div>
                <div className="text-white/60 text-sm">
                  Portfolio Creator
                </div>
              </div>
            </div>
          </div>

          {/* Navigation Items */}
          <nav className="space-y-2">
            <Link
              href="/leaderboard"
              className="flex items-center gap-3 px-4 py-3 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
              onClick={() => setIsOpen(false)}
            >
              <FontAwesomeIcon icon={faTrophy} className="w-5 h-5" />
              <span className="font-medium">Leaderboard</span>
            </Link>
            
            <Link
              href={`/${currentUserSession.username}`}
              className="flex items-center gap-3 px-4 py-3 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
              onClick={() => setIsOpen(false)}
            >
              <FontAwesomeIcon icon={faUser} className="w-5 h-5" />
              <span className="font-medium">Portfolio</span>
            </Link>
            
            <div className="flex items-center gap-3 px-4 py-3 rounded-lg text-white bg-white/10">
              <FontAwesomeIcon icon={faCog} className="w-5 h-5" />
              <span className="font-medium">Settings</span>
            </div>
          </nav>

          {/* Spacer */}
          <div className="flex-1"></div>

          {/* Logout Button */}
          <div className="pt-4 border-t border-white/10">
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 px-4 py-3 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors w-full"
            >
              <FontAwesomeIcon icon={faSignOutAlt} className="w-5 h-5" />
              <span className="font-medium">Sign Out</span>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 bg-white/10 backdrop-blur-md border border-white/20 rounded-lg p-2 text-white"
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
            <div className="flex-1 lg:ml-48 lg:pl-0 p-4 sm:p-6 md:p-8 pb-16 pt-16 lg:pt-8">
        <div className="w-full">
          {/* Header */}
          <div className="mb-4">
            <div className="flex flex-col sm:flex-row items-center justify-between mb-4 gap-4">
              {/* Search Bar */}
              <div className="w-full sm:flex-1 sm:max-w-md order-2 sm:order-1">
                <UserSearchBar />
              </div>
              
              <div className="flex items-center gap-4 order-1 sm:order-2">
                <Link href="/leaderboard" className="gradient-button px-4 py-2 text-sm text-white rounded-md">
                  <FontAwesomeIcon icon={faTrophy} /> Leaderboard
                </Link>
              </div>
            </div>
            
            <h1 className="text-2xl font-semibold mb-1 text-white">Settings</h1>
            <p className="text-white/60 text-sm">
              Manage your account settings and preferences.
            </p>
          </div>

          {/* Settings Content */}
          <div className="space-y-6">
            {/* Account Information */}
            <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6">
              <h2 className="text-xl font-semibold text-white mb-4">Account Information</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-white/80 mb-2">Username</label>
                  <div className="bg-white/10 border border-white/20 rounded-md px-3 py-2 text-white">
                    {currentUserSession.username}
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-white/80 mb-2">Account Type</label>
                  <div className="bg-white/10 border border-white/20 rounded-md px-3 py-2 text-white">
                    Email Account
                  </div>
                </div>
              </div>
            </div>

            {/* Change Password */}
            <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6">
              <h2 className="text-xl font-semibold text-white mb-4">Change Password</h2>
              <form onSubmit={handlePasswordChange} className="space-y-4">
                <div>
                  <label className="block text-sm text-white/80 mb-2">Current Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="w-full bg-white/10 border border-white/20 rounded-md px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-[var(--brand-end)]"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/60 hover:text-white"
                    >
                      <FontAwesomeIcon icon={showPassword ? faEyeSlash : faEye} />
                    </button>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm text-white/80 mb-2">New Password</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full bg-white/10 border border-white/20 rounded-md px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-[var(--brand-end)]"
                    required
                    minLength={6}
                  />
                </div>
                
                <div>
                  <label className="block text-sm text-white/80 mb-2">Confirm New Password</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-white/10 border border-white/20 rounded-md px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-[var(--brand-end)]"
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
          </div>
        </div>
      </div>

      {/* Modals */}
      {showSignInModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <SignInModal
            isOpen={showSignInModal}
            onClose={() => setShowSignInModal(false)}
            onSuccess={(username, userId) => {
              setShowSignInModal(false);
              router.push(`/${username}/settings`);
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
              router.push(`/${username}/settings`);
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
