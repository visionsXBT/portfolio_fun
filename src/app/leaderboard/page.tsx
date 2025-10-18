"use client";

import { useState, useEffect, useCallback } from 'react';
import Logo from '@/components/Logo';
import Link from 'next/link';
import TokenImage from '@/components/TokenImage';
import JumpingDots from '@/components/JumpingDots';
import { PublicKey } from '@solana/web3.js';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChartBar, faCrown, faHouse } from '@fortawesome/free-solid-svg-icons';

interface PortfolioStats {
  id: string;
  name: string;
  username: string;
  views: number;
  shares: number;
  avgChange: number;
  tokenCount: number;
  avgMarketCap: number;
  profilePicture?: string;
  rows?: Array<{ mint: string }>;
}

interface LeaderboardData {
  mostShared: PortfolioStats[];
  bestPerforming: PortfolioStats[];
  mostDiverse: PortfolioStats[];
}

export default function LeaderboardPage() {
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardData>({
    mostShared: [],
    bestPerforming: [],
    mostDiverse: []
  });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'mostShared' | 'bestPerforming' | 'mostDiverse'>('mostShared');
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0
  });
  const [tokenMeta, setTokenMeta] = useState<Record<string, { symbol?: string; name?: string; logoURI?: string | null }>>({});
  const [tabChangeKey, setTabChangeKey] = useState(0);
  const [userAccount, setUserAccount] = useState<{ 
    username?: string; 
    walletAddress?: string;
    id: string; 
    accountType: 'email' | 'wallet';
    profilePicture?: string;
  } | null>(null);
  const [isLoadingUserData, setIsLoadingUserData] = useState(false);

  // Validation functions (copied from BuilderPageContent)
  function isValidMint(value: string): boolean {
    try {
      new PublicKey(value);
      return true;
    } catch {
      return false;
    }
  }

  function isValidBNBAddress(value: string): boolean {
    const bnbAddressRegex = /^0x[a-fA-F0-9]{40}$/;
    return bnbAddressRegex.test(value);
  }


  // Load user account from database session
  useEffect(() => {
    const loadUserAccount = async () => {
      setIsLoadingUserData(true);
      try {
        // Check for current user session from database
        const sessionResponse = await fetch('/api/session');
        if (sessionResponse.ok) {
          const sessionData = await sessionResponse.json();
          if (sessionData.success) {
            console.log('👤 Found user session, loading user data:', sessionData.user);
            setUserAccount(sessionData.user);
          } else {
            console.log('👤 No valid session found');
            setUserAccount(null);
          }
        } else {
          console.log('👤 No session found');
          setUserAccount(null);
        }
      } catch (error) {
        console.error('Failed to load user account:', error);
        setUserAccount(null);
      } finally {
        setIsLoadingUserData(false);
      }
    };
    
    loadUserAccount();
  }, []);

  // Refresh session state when page becomes visible (handles navigation from other pages)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        // Page became visible, refresh session state
        const refreshSession = async () => {
          try {
            const sessionResponse = await fetch('/api/session');
            if (sessionResponse.ok) {
              const sessionData = await sessionResponse.json();
              if (sessionData.success) {
                setUserAccount(sessionData.user);
              } else {
                setUserAccount(null);
              }
            } else {
              setUserAccount(null);
            }
          } catch (error) {
            console.error('Failed to refresh session:', error);
            setUserAccount(null);
          }
        };
        refreshSession();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Dedicated function for pump.fun image fetching (copied from BuilderPageContent)
  const fetchPumpFunImages = useCallback(async (mint: string): Promise<string | null> => {
    console.log('🔍 Trying image sources for Solana token:', mint);
    
    // For pump tokens, try pump.fun first, then DexScreener for tokens without specific images
    if (mint.toLowerCase().includes('pump')) {
      const pumpUrl = `https://images.pump.fun/coin-image/${mint}?variant=600x600`;
      console.log('🔍 Testing pump.fun URL for pump token:', pumpUrl);
      
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000);
        
        const response = await fetch(pumpUrl, { 
          method: 'HEAD',
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
          console.log('✅ Found specific image from pump.fun URL:', pumpUrl);
          return pumpUrl;
        } else {
          console.log('❌ No specific pump.fun image found, trying DexScreener');
        }
      } catch (error) {
        console.log('❌ Pump.fun URL failed, trying DexScreener:', (error as Error).message);
      }
      
      // Fall back to DexScreener for pump tokens without specific images
      console.log('🔍 Trying DexScreener for pump token without specific image');
      // Continue to DexScreener logic below
    }
    
    // For non-pump tokens, try DexScreener first (primary source)
    try {
      // Try direct DexScreener image URL first (most reliable)
      const directDexScreenerUrl = `https://dd.dexscreener.com/ds-data/tokens/solana/${mint}.png?key=2d2e69`;
      console.log('✅ Returning direct DexScreener URL (will be proxied):', directDexScreenerUrl);
      return directDexScreenerUrl;
    } catch (error) {
      console.log('❌ Direct DexScreener URL failed:', (error as Error).message);
    }
    
    // Try DexScreener API for image data
    try {
      const dexScreenerUrl = `https://api.dexscreener.com/latest/dex/tokens/${mint}`;
      console.log('🔍 Trying DexScreener API for Solana token image:', dexScreenerUrl);
      
      const response = await fetch(dexScreenerUrl, {
        signal: AbortSignal.timeout(5000)
      });
      
      if (response.ok) {
        const data = await response.json();
        
        if (data.pairs && data.pairs.length > 0) {
          const pair = data.pairs[0];
          
          // Check for imageUrl in the baseToken info
          if (pair.baseToken?.info?.imageUrl) {
            console.log('✅ Found image from DexScreener imageUrl:', pair.baseToken.info.imageUrl);
            return pair.baseToken.info.imageUrl;
          }
          
          // Check for imageHash in the baseToken info (DexScreener CDN format)
          if (pair.baseToken?.info?.imageHash) {
            const cdnUrl = `https://cdn.dexscreener.com/cms/images/${pair.baseToken.info.imageHash}?width=800&height=800&fit=crop&quality=95&format=auto`;
            console.log('✅ Found image from DexScreener CDN:', cdnUrl);
            return cdnUrl;
          }
        }
      }
    } catch (error) {
      console.log('❌ DexScreener image failed:', (error as Error).message);
    }
    
    // Try Jupiter token list
    try {
      console.log('🔍 Trying Jupiter token list for image...');
      const response = await fetch('https://token.jup.ag/strict', {
        signal: AbortSignal.timeout(5000)
      });
      
      if (response.ok) {
        const tokens = await response.json();
        const token = tokens.find((t: { address: string }) => t.address === mint);
        
        if (token?.logoURI) {
          console.log('✅ Found image from Jupiter token list:', token.logoURI);
          return token.logoURI;
        }
      }
    } catch (error) {
      console.log('❌ Jupiter token list failed:', (error as Error).message);
    }
    
    console.log('❌ No image found for Solana token:', mint);
    return null;
  }, []);

  // Function to fetch BNB token images (simplified version)
  const fetchBNBTokenImage = useCallback(async (address: string): Promise<string | null> => {
    console.log('🔍 Trying BNB token image sources for address:', address);
    
    // Try DexScreener for BNB token image
    try {
      const dexScreenerUrl = `https://api.dexscreener.com/latest/dex/tokens/${address}`;
      console.log('🔄 Trying DexScreener for BNB image:', dexScreenerUrl);
      
      const response = await fetch(dexScreenerUrl, {
        signal: AbortSignal.timeout(5000)
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.pairs && data.pairs.length > 0) {
          const pair = data.pairs[0];
          
          // Check for imageUrl in the baseToken info
          if (pair.baseToken?.info?.imageUrl) {
            console.log('✅ Found image from DexScreener imageUrl:', pair.baseToken.info.imageUrl);
            return pair.baseToken.info.imageUrl;
          }
          
          // Check for imageHash in the baseToken info (DexScreener CDN format)
          if (pair.baseToken?.info?.imageHash) {
            const cdnUrl = `https://cdn.dexscreener.com/cms/images/${pair.baseToken.info.imageHash}?width=800&height=800&fit=crop&quality=95&format=auto`;
            console.log('✅ Found image from DexScreener CDN:', cdnUrl);
            return cdnUrl;
          }
        }
      }
    } catch (error) {
      console.log('❌ DexScreener image failed:', (error as Error).message);
    }
    
    console.log('❌ No BNB token images found for address:', address);
    return null;
  }, []);

  const fetchTokenMetadata = async (mints: string[]) => {
    try {
      // First get basic metadata from DexScreener
      const response = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${mints.join(',')}`);
      if (response.ok) {
        const data = await response.json();
        const meta: Record<string, { symbol?: string; name?: string; logoURI?: string | null }> = {};
        
        if (data.pairs) {
          for (const pair of data.pairs) {
            const mint = pair.baseToken?.address;
            if (mint) {
              meta[mint] = {
                symbol: pair.baseToken?.symbol,
                name: pair.baseToken?.name,
                logoURI: pair.baseToken?.info?.imageUrl || null
              };
            }
          }
        }
        
        // Now fetch images for tokens that don't have them
        for (const mint of mints) {
          if (!meta[mint]?.logoURI) {
            let logoURI = null;
            
            if (isValidMint(mint)) {
              logoURI = await fetchPumpFunImages(mint);
            } else if (isValidBNBAddress(mint)) {
              logoURI = await fetchBNBTokenImage(mint);
            }
            
            if (logoURI) {
              meta[mint] = {
                ...meta[mint],
                logoURI
              };
            }
          }
        }
        
        console.log('📝 Setting token metadata:', meta);
        setTokenMeta(prev => {
          const updated = { ...prev, ...meta };
          console.log('📝 Updated tokenMeta state:', Object.keys(updated).length, 'tokens');
          return updated;
        });
      }
    } catch (error) {
      console.error('Failed to fetch token metadata:', error);
    }
  };

  useEffect(() => {
    const fetchLeaderboardData = async () => {
      // Skip during build time to prevent build errors
      if (typeof window === 'undefined') {
        return;
      }
      
      try {
        const response = await fetch('/api/leaderboard');
        if (response.ok) {
          const data = await response.json();
          console.log('Leaderboard data received:', {
            mostShared: data.mostShared?.length || 0,
            bestPerforming: data.bestPerforming?.length || 0,
            mostDiverse: data.mostDiverse?.length || 0,
            sampleBestPerforming: data.bestPerforming?.[0],
            sampleMostDiverse: data.mostDiverse?.[0]
          });
          setLeaderboardData(data);
          
          // Fetch token metadata for all portfolios
          const allMints = [
            ...data.mostShared,
            ...data.bestPerforming,
            ...data.mostDiverse
          ].flatMap(portfolio => portfolio.rows?.map((row: { mint: string }) => row.mint) || []);
          
          const uniqueMints = [...new Set(allMints)];
          console.log('🔍 Fetching metadata for unique mints:', uniqueMints.length, uniqueMints);
          if (uniqueMints.length > 0) {
            await fetchTokenMetadata(uniqueMints);
            console.log('✅ Token metadata fetch completed, current tokenMeta:', Object.keys(tokenMeta).length);
          }
        }
      } catch (error) {
        console.error('Failed to fetch leaderboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboardData();
  }, []);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date();
      const nextMonday = new Date();
      
      // Get next Monday at 00:00:00
      const daysUntilMonday = (8 - now.getDay()) % 7;
      nextMonday.setDate(now.getDate() + (daysUntilMonday === 0 ? 7 : daysUntilMonday));
      nextMonday.setHours(0, 0, 0, 0);
      
      const difference = nextMonday.getTime() - now.getTime();
      
      if (difference > 0) {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((difference / 1000 / 60) % 60),
          seconds: Math.floor((difference / 1000) % 60)
        });
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatMarketCap = (marketCap: number): string => {
    if (marketCap >= 1e9) {
      return `${(marketCap / 1e9).toFixed(1)}B`;
    } else if (marketCap >= 1e6) {
      return `${(marketCap / 1e6).toFixed(1)}M`;
    } else if (marketCap >= 1e3) {
      return `${(marketCap / 1e3).toFixed(1)}K`;
    } else {
      return marketCap.toFixed(0);
    }
  };

  const tabs = [
    { id: 'mostShared', label: 'Most Shared', data: leaderboardData.mostShared },
    { id: 'bestPerforming', label: 'Best Performing', data: leaderboardData.bestPerforming },
    { id: 'mostDiverse', label: 'Most Diverse', data: leaderboardData.mostDiverse }
  ];

  const currentTab = tabs.find(tab => tab.id === activeTab);

  // Debug tab changes and token metadata
  useEffect(() => {
    console.log('🔄 Active tab changed to:', activeTab);
    console.log('📊 Current tab data:', currentTab?.data?.length || 0, 'portfolios');
    
    // Force re-render of TokenImage components when tab changes
    setTabChangeKey(prev => prev + 1);
  }, [activeTab]); // Removed currentTab from dependencies to prevent infinite loop

  return (
    <div className="min-h-screen p-6 sm:p-8 md:p-12 pb-24" style={{ fontFamily: 'Golos Text, sans-serif' }}>
      <div className="mx-auto w-full max-w-6xl">
        {/* Header with Logo */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <Logo />
            <div className="flex items-center gap-4">
              {isLoadingUserData ? (
                <div className="flex items-center gap-2 px-4 py-2 text-sm text-white/60">
                  <JumpingDots className="text-white/60" />
                  <span>Loading profile...</span>
                </div>
              ) : userAccount ? (
                <button 
                  onClick={() => window.location.href = '/profile'}
                  className="gradient-button px-4 py-2 text-sm text-white rounded-md flex items-center gap-2"
                >
                  {userAccount.profilePicture ? (
                    <img
                      src={userAccount.profilePicture}
                      alt="Profile"
                      className="w-6 h-6 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-gradient-to-r from-[var(--brand-start)] to-[var(--brand-end)] flex items-center justify-center text-white font-bold text-xs">
                      {userAccount.username?.charAt(0).toUpperCase() || 'U'}
                    </div>
                  )}
                  <span>{userAccount.username || 'Profile'}</span>
                </button>
              ) : (
                <button 
                  onClick={() => window.location.href = '/'}
                  className="gradient-button px-4 py-2 text-sm text-white rounded-md flex items-center gap-2"
                >
                  <FontAwesomeIcon icon={faHouse} />
                  Home
                </button>
              )}
            </div>
          </div>
          <h1 className="text-3xl font-semibold mb-2">Weekly Portfolio Leaderboards</h1>
          <p className="text-white/60">
            Compete for pump.fun rewards! Most viewed portfolio wins 20% of weekly rewards.
          </p>
        </div>

        {/* Weekly Timer */}
        <div className="mb-8 bg-gradient-to-r from-[var(--brand-start)] to-[var(--brand-end)] rounded-xl p-4 sm:p-6">
          <div className="text-center">
            <h2 className="text-lg sm:text-xl font-semibold text-white mb-4">Weekly Competition Ends In</h2>
            <div className="flex items-center justify-center gap-2 sm:gap-4 text-lg sm:text-2xl font-bold text-white">
              <div className="bg-white/20 rounded-lg px-2 sm:px-4 py-2">
                <div className="text-xs sm:text-sm text-white/80">Days</div>
                <div>{timeLeft.days}</div>
              </div>
              <div className="bg-white/20 rounded-lg px-2 sm:px-4 py-2">
                <div className="text-xs sm:text-sm text-white/80">Hours</div>
                <div>{timeLeft.hours}</div>
              </div>
              <div className="bg-white/20 rounded-lg px-2 sm:px-4 py-2">
                <div className="text-xs sm:text-sm text-white/80">Minutes</div>
                <div>{timeLeft.minutes}</div>
              </div>
              <div className="bg-white/20 rounded-lg px-2 sm:px-4 py-2">
                <div className="text-xs sm:text-sm text-white/80">Seconds</div>
                <div>{timeLeft.seconds}</div>
              </div>
            </div>
            <p className="text-white/80 text-xs sm:text-sm mt-4">
              Winner gets 20% of pump.fun weekly rewards pool
            </p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-1 mb-8 bg-white/5 rounded-lg p-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as 'mostShared' | 'bestPerforming' | 'mostDiverse')}
              className={`flex-1 py-2 sm:py-3 px-2 sm:px-4 rounded-md text-xs sm:text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-[var(--brand-end)] text-white'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
            >
              <div className="text-center">
                <div className="truncate">{tab.label}</div>
              </div>
            </button>
          ))}
        </div>

        {/* Leaderboard Content */}
        {loading ? (
          <div className="text-center py-16">
            <div className="flex flex-col items-center gap-4">
              <JumpingDots className="text-white text-2xl" />
              <p className="text-white/60">Loading leaderboard...</p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {currentTab?.data && currentTab.data.length > 0 ? (
              currentTab.data.map((portfolio, index) => (
                <div key={portfolio.id} className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-4 sm:p-6">
                  {/* Portfolio Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-4">
                    <div className="flex items-center gap-3 sm:gap-4 flex-1">
                      <div className="flex items-center gap-2 sm:gap-3">
                        <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-[var(--brand-end)] flex items-center justify-center text-white font-bold text-xs sm:text-sm">
                          {index + 1}
                        </div>
                        <Link 
                          href={`/${portfolio.username}`}
                          className="w-8 h-8 sm:w-10 sm:h-10 rounded-full overflow-hidden hover:opacity-80 transition-opacity cursor-pointer"
                        >
                          {portfolio.profilePicture ? (
                            <img
                              src={portfolio.profilePicture}
                              alt={portfolio.username}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-r from-[var(--brand-start)] to-[var(--brand-end)] flex items-center justify-center text-white font-bold text-xs sm:text-sm">
                              {portfolio.username.charAt(0).toUpperCase()}
                            </div>
                          )}
                        </Link>
                        <h3 className="text-base sm:text-lg font-medium text-white truncate">{portfolio.name}</h3>
                      </div>
                      
                      <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-xs sm:text-sm text-white/60">
                        <Link 
                          href={`/${portfolio.username}`}
                          className="truncate hover:text-white transition-colors cursor-pointer"
                        >
                          by {portfolio.username}
                        </Link>
                        {activeTab === 'mostShared' && (
                          <>
                            <span>{portfolio.shares} shares</span>
                            <span>{portfolio.views} views</span>
                          </>
                        )}
                        {activeTab === 'bestPerforming' && (
                          <>
                            <span className={portfolio.avgChange >= 0 ? 'text-green-400' : 'text-red-400'}>
                              {portfolio.avgChange >= 0 ? '+' : ''}{portfolio.avgChange.toFixed(2)}%
                            </span>
                            <span className="text-blue-400">
                              ${formatMarketCap(portfolio.avgMarketCap)} Avg MCap
                            </span>
                          </>
                        )}
                        {activeTab === 'mostDiverse' && (
                          <>
                            <span>{portfolio.tokenCount} tokens</span>
                            <span className="text-blue-400">
                              ${formatMarketCap(portfolio.avgMarketCap)} Avg MCap
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      {index === 0 && activeTab === 'mostShared' && (
                        <div className="flex items-center gap-1 text-yellow-400">
                          <span className="text-white text-base sm:text-lg"><FontAwesomeIcon icon={faCrown} /></span>
                          <span className="text-xs sm:text-sm font-medium">Weekly Leader</span>
                        </div>
                      )}
                      <Link
                        href={`/share/${portfolio.id}`}
                        className="rounded-md bg-[var(--brand-end)] hover:bg-[var(--brand-start)] px-3 sm:px-4 py-2 text-xs sm:text-sm text-white transition-colors"
                      >
                        View Portfolio
                      </Link>
                    </div>
                  </div>
                  
                  {/* Portfolio Tokens Preview */}
                  {portfolio.rows && portfolio.rows.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-white/10">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                        <span className="text-xs sm:text-sm text-white/60">Portfolio:</span>
                        <div className="flex flex-wrap items-center gap-2">
                          {portfolio.rows.slice(0, 3).map((row, tokenIndex) => {
                            const meta = tokenMeta[row.mint];
                            console.log(`🖼️ Rendering token ${row.mint}:`, {
                              hasMeta: !!meta,
                              logoURI: meta?.logoURI,
                              symbol: meta?.symbol
                            });
                            return (
                              <div key={`${portfolio.id}-${row.mint}-${tokenIndex}`} className="flex items-center gap-1">
                                {meta?.logoURI && meta.logoURI !== null ? (
                                  <TokenImage
                                    key={`${row.mint}-${activeTab}-${tabChangeKey}`}
                                    src={meta.logoURI}
                                    alt={meta?.symbol || "Token"}
                                    className="w-5 h-5 sm:w-6 sm:h-6 rounded-full"
                                    fallbackSrc="/placeholder-token.svg"
                                  />
                                ) : (
                                  <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-gray-600 flex items-center justify-center text-white text-xs">
                                    ?
                                  </div>
                                )}
                                <span className="text-xs text-white/80">
                                  {meta?.symbol || row.mint.slice(0, 4)}
                                </span>
                              </div>
                            );
                          })}
                          {portfolio.rows.length > 3 && (
                            <span className="text-xs text-white/60 ml-1">
                              +{portfolio.rows.length - 3} more
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="text-center py-16">
                <div className="mb-8">
                  <h2 className="text-2xl font-semibold text-white mb-4">No portfolios yet</h2>
                  <p className="text-white/60 mb-8">
                    Be the first to create a portfolio and climb the leaderboard!
                  </p>
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                    <Link
                      href="/profile"
                      className="rounded-lg bg-[var(--brand-end)] hover:bg-[var(--brand-start)] px-8 py-4 text-lg font-medium text-white transition-colors"
                    >
                      Create Portfolio
                    </Link>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Rewards Info */}
        <div className="mt-12 bg-gradient-to-r from-[var(--brand-start)] to-[var(--brand-end)] rounded-xl p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Weekly Rewards</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white/10 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-white text-lg"><FontAwesomeIcon icon={faCrown} /></span>
                <h3 className="font-medium text-white">Weekly Winner</h3>
              </div>
              <p className="text-white/80 text-sm">Most viewed portfolio gets 20% of pump.fun weekly rewards</p>
            </div>
            <div className="bg-white/10 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-white text-lg"><FontAwesomeIcon icon={faChartBar} /></span>
                <h3 className="font-medium text-white">Competition</h3>
              </div>
              <p className="text-white/80 text-sm">Reset every Monday at midnight UTC</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
