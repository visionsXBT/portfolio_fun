"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

interface SearchUser {
  id: string;
  username: string;
  displayName?: string;
  profilePicture?: string;
  portfolioCount: number;
  createdAt: string;
}

interface UserSearchBarProps {
  className?: string;
}

export default function UserSearchBar({ className = "" }: UserSearchBarProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchUser[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const router = useRouter();
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Debounced search function
  const searchUsers = useCallback(async (searchQuery: string) => {
    if (searchQuery.trim().length < 1) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    setIsLoading(true);
    try {
      console.log(`🔍 Searching for: "${searchQuery}"`);
      const response = await fetch(`/api/search-users?q=${encodeURIComponent(searchQuery.trim())}`);
      if (response.ok) {
        const data = await response.json();
        console.log(`🔍 Search response:`, data);
        setResults(data.users || []);
        // Always show dropdown when there's a search query, even if no results
        setIsOpen(true);
        setSelectedIndex(-1);
      } else {
        console.error('Search API error:', response.status, response.statusText);
        setResults([]);
        setIsOpen(true); // Still show dropdown to indicate search was attempted
      }
    } catch (error) {
      console.error('Error searching users:', error);
      setResults([]);
      setIsOpen(true); // Still show dropdown to indicate search was attempted
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Handle input change with debouncing
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);

    // Clear previous timeout
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // If input is empty, close dropdown immediately
    if (value.trim().length === 0) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    // Set new timeout for debounced search
    debounceRef.current = setTimeout(() => {
      searchUsers(value);
    }, 300);
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || results.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < results.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : results.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < results.length) {
          handleUserSelect(results[selectedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setSelectedIndex(-1);
        inputRef.current?.blur();
        break;
    }
  };

  // Handle user selection
  const handleUserSelect = (user: SearchUser) => {
    setIsOpen(false);
    setQuery('');
    setResults([]);
    setSelectedIndex(-1);
    router.push(`/${user.username}`);
  };

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSelectedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  return (
    <div ref={searchRef} className={`relative ${className}`}>
      {/* Search Input */}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          placeholder="Search users..."
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (query.trim().length > 0) {
              setIsOpen(true);
            }
          }}
          className="w-full rounded-md border border-[#b8bdbf] bg-[#d7dadb]/60 text-gray-800 pl-10 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--brand-end)]"
        />
        
        {/* Search Icon */}
        <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-600">
          {isLoading ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white/60 rounded-full animate-spin"></div>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/>
              <path d="m21 21-4.35-4.35"/>
            </svg>
          )}
        </div>
      </div>

      {/* Search Results Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 z-50 max-h-80 overflow-y-auto">
          {isLoading ? (
            <div className="glassmorphism p-4">
              <div className="flex items-center justify-center gap-2 text-gray-600">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white/60 rounded-full animate-spin"></div>
                <span>Searching...</span>
              </div>
            </div>
          ) : results.length > 0 ? (
            results.map((user, index) => (
            <div key={user.id} className="mb-2 last:mb-0">
              <button
                onClick={() => handleUserSelect(user)}
                className={`w-full glassmorphism p-4 transition-colors ${
                  index === selectedIndex ? 'bg-white/20' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  {/* Profile Picture */}
                  <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
                    {user.profilePicture ? (
                      <Image
                        src={user.profilePicture}
                        alt={user.username}
                        width={40}
                        height={40}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-r from-[var(--brand-start)] to-[var(--brand-end)] flex items-center justify-center text-white font-bold text-sm">
                        {user.username.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>

                  {/* User Info */}
                  <div className="flex-1 text-left">
                    <div className="text-gray-800 font-medium">{user.displayName || user.username}</div>
                    <div className="text-gray-600 text-sm">
                      {user.portfolioCount} portfolio{user.portfolioCount !== 1 ? 's' : ''}
                    </div>
                  </div>

                  {/* Arrow Icon */}
                  <div className="text-gray-500">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M9 18l6-6-6-6"/>
                    </svg>
                  </div>
                </div>
              </button>
            </div>
            ))
          ) : (
            <div className="glassmorphism p-4">
              <div className="text-gray-600 text-center">
                No users found for &quot;{query}&quot;
                <div className="text-gray-500 text-sm mt-1">
                  Try searching for a different username
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
