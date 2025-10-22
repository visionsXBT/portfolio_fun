"use client";

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrophy, faUser, faCog, faSignOutAlt, faBars, faTimes } from '@fortawesome/free-solid-svg-icons';
import { useSafeLogout, useSafeWallets } from '@/hooks/usePrivySafe';

interface NavigationBarProps {
  username: string;
  profilePicture?: string;
  isCurrentUser?: boolean;
  displayName?: string;
}

export default function NavigationBar({ username, profilePicture, isCurrentUser = false, displayName }: NavigationBarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { logout } = useSafeLogout();
  const { wallets } = useSafeWallets();

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

  const navigationItems = [
    {
      icon: faTrophy,
      label: 'Leaderboard',
      href: '/leaderboard',
      show: true
    },
    {
      icon: faUser,
      label: 'Portfolio',
      href: `/${username}`,
      show: isCurrentUser
    },
    {
      icon: faCog,
      label: 'Settings',
      href: `/${username}/settings`,
      show: isCurrentUser
    }
  ];

  return (
    <>
      {/* Mobile Menu Button - Always Visible */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 bg-white/10 backdrop-blur-md border border-white/20 rounded-lg p-2 text-gray-800"
        style={{ fontFamily: 'Golos Text, sans-serif' }}
      >
        <FontAwesomeIcon icon={isOpen ? faTimes : faBars} />
      </button>

      {/* Navigation Bar */}
      <div className={`
        fixed left-0 top-0 h-screen w-80 bg-white/5 backdrop-blur-md glassmorphism border-r border-white/10 z-40
        transform transition-transform duration-300 ease-in-out animate-slide-in-left animate-delay-100
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0 lg:static lg:h-auto lg:w-64 lg:bg-transparent lg:backdrop-blur-none
      `}>
        <div className="flex flex-col h-screen p-2 pb-16 pt-16 lg:pt-2" style={{ fontFamily: 'Golos Text, sans-serif' }}>
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
                {profilePicture ? (
                  <Image
                    src={profilePicture}
                    alt={username}
                    width={48}
                    height={48}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-[var(--brand-start)] to-[var(--brand-end)] flex items-center justify-center text-gray-800 font-bold text-lg">
                    {username.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div className="text-left">
                <div className="text-gray-800 font-medium">
                  {displayName || username}
                </div>
                <div className="text-gray-800/60 text-sm">
                  Portfolio Creator
                </div>
              </div>
            </div>
          </div>

          {/* Navigation Items */}
          <nav className="space-y-2">
            {navigationItems.map((item) => {
              if (!item.show) return null;
              
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-3 px-4 py-3 rounded-lg border border-[#b8bdbf] hover:text-gray-800 hover:bg-[#d7dadb]/60 text-gray-800/80 hover:text-gray-800 transition-colors drop-shadow-md"
                  onClick={() => setIsOpen(false)}
                >
                  <FontAwesomeIcon icon={item.icon} className="w-5 h-5" />
                  <span className="font-medium">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Spacer */}
          <div className="flex-1"></div>

          {/* Logout Button */}
          {isCurrentUser && (
            <div className="pt-4 border-t border-white/10">
              <button
                onClick={handleLogout}
                className="flex items-center gap-3 px-4 py-3 rounded-lg text-red-400 border border-[#b8bdbf] bg-[#d7dadb] hover:text-red-300 hover:bg-red-500/10 transition-colors w-full"
              >
                <FontAwesomeIcon icon={faSignOutAlt} className="w-5 h-5" />
                <span className="font-medium">Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
}
