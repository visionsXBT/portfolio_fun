"use client";

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrophy, faUser, faCog, faSignOutAlt, faBars, faTimes } from '@fortawesome/free-solid-svg-icons';

interface NavigationBarProps {
  username: string;
  profilePicture?: string;
  isCurrentUser?: boolean;
}

export default function NavigationBar({ username, profilePicture, isCurrentUser = false }: NavigationBarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();

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
        className="lg:hidden fixed top-4 left-4 z-50 bg-white/10 backdrop-blur-md border border-white/20 rounded-lg p-2 text-white"
        style={{ fontFamily: 'Golos Text, sans-serif' }}
      >
        <FontAwesomeIcon icon={isOpen ? faTimes : faBars} />
      </button>

      {/* Navigation Bar */}
      <div className={`
        fixed left-0 top-0 h-screen w-48 bg-white/5 backdrop-blur-md border-r border-white/10 z-40
        transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0 lg:static lg:h-auto lg:w-auto lg:bg-transparent lg:backdrop-blur-none lg:border-r-0
      `}>
        <div className="flex flex-col h-screen p-4 pb-16 pt-16 lg:pt-4" style={{ fontFamily: 'Golos Text, sans-serif' }}>
          {/* Logo Section */}
          <div className="flex flex-col items-center gap-2 mb-6">
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
                  src={profilePicture || '/placeholder-token.svg?v=2'}
                  alt={username}
                  width={48}
                  height={48}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="text-left">
                <div className="text-white font-medium text-lg">
                  {username}
                </div>
                <div className="text-white/60 text-sm">
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
                  className="flex items-center gap-3 px-4 py-3 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
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
                className="flex items-center gap-3 px-4 py-3 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors w-full"
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
