"use client";

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { PublicKey } from '@solana/web3.js';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrophy, faCopy } from '@fortawesome/free-solid-svg-icons';
import TokenImage from '@/components/TokenImage';
import SignInModal from '@/components/SignInModal';
import AccountModal from '@/components/AccountModal';
import UserSearchBar from '@/components/UserSearchBar';
import ShareModal from '@/components/ShareModal';
import ProfilePictureUpload from '@/components/ProfilePictureUpload';
import NavigationBar from '@/components/NavigationBar';

// Helper functions for token validation
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

function extractMintFromInput(raw: string): string | null {
  const trimmed = raw.trim();
  
  // Check if it's a valid Solana mint
  if (isValidMint(trimmed)) return trimmed;
  
  // Check if it's a valid BNB address
  if (isValidBNBAddress(trimmed)) return trimmed;
  
  // Try to extract Solana mint from text
  const base58Re = /[1-9A-HJ-NP-Za-km-z]{32,48}/g;
  const matches = trimmed.match(base58Re);
  if (matches) {
    for (const match of matches) {
      if (isValidMint(match)) return match;
    }
  }
  
  return null;
}

interface PortfolioRow {
  mint: string;
}

interface Portfolio {
  id: string;
  name: string;
  rows: PortfolioRow[];
  avgChange?: number;
  avgMarketCap?: number;
  views?: number;
  shares?: number;
}

interface UserData {
  id: string;
  username: string;
  accountType: 'email' | 'wallet';
  createdAt: string;
  profilePicture?: string;
  portfolios: Portfolio[];
}

export default function UsernamePage() {
  const params = useParams();
  const router = useRouter();
  const username = params.username as string;
  const [isValidUser, setIsValidUser] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [tokenMeta, setTokenMeta] = useState<Record<string, { symbol?: string; name?: string; logoURI?: string | null; marketCap?: number; price?: number; priceChange24h?: number }>>({});
  const [extraMeta, setExtraMeta] = useState<Record<string, { symbol?: string; name?: string; logoURI?: string | null; marketCap?: number; price?: number; priceChange24h?: number }>>({});
  const [priceChanges24h, setPriceChanges24h] = useState<Record<string, number>>({});
  const [marketCaps, setMarketCaps] = useState<Record<string, number>>({});
  const [showSignInModal, setShowSignInModal] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [selectedPortfolioForShare, setSelectedPortfolioForShare] = useState<Portfolio | null>(null);
  const [currentUserSession, setCurrentUserSession] = useState<{ username: string; userId: string; sessionToken: string; profilePicture?: string } | null>(null);
  const [editingPortfolioId, setEditingPortfolioId] = useState<string | null>(null);
  const [editingPortfolioName, setEditingPortfolioName] = useState<string>('');
  const [portfolioInputs, setPortfolioInputs] = useState<Record<string, string>>({});
  const [copiedMintAddress, setCopiedMintAddress] = useState<string | null>(null);

  // Handle portfolio editing
  const handleEditPortfolio = (portfolio: Portfolio) => {
    setEditingPortfolioId(portfolio.id);
    setEditingPortfolioName(portfolio.name);
  };

  // Handle portfolio sharing
  const handleSharePortfolio = useCallback((portfolio: Portfolio) => {
    setSelectedPortfolioForShare(portfolio);
    setShowShareModal(true);
  }, []);

  const handleCloseShareModal = useCallback(() => {
    setShowShareModal(false);
    setSelectedPortfolioForShare(null);
  }, []);

  // Handle copying contract address
  const handleCopyContractAddress = useCallback(async (mintAddress: string) => {
    try {
      await navigator.clipboard.writeText(mintAddress);
      setCopiedMintAddress(mintAddress);
      // Reset the copied state after 2 seconds
      setTimeout(() => {
        setCopiedMintAddress(null);
      }, 2000);
    } catch (err) {
      console.error('Failed to copy contract address:', err);
    }
  }, []);

  // Handle portfolio deletion
  const handleDeletePortfolio = useCallback(async (portfolioId: string) => {
    if (!currentUserSession || currentUserSession.username !== username) return;
    
    try {
      // Update local state first
      if (userData) {
        const updatedPortfolios = userData.portfolios.filter(p => p.id !== portfolioId);
        setUserData({ ...userData, portfolios: updatedPortfolios });
      }

      // Delete from database
      await fetch(`/api/user/${currentUserSession.userId}/portfolios`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          portfolios: userData?.portfolios.filter(p => p.id !== portfolioId) || []
        })
      });
      console.log('✅ Portfolio deleted from database');
    } catch (error) {
      console.error('❌ Failed to delete portfolio:', error);
      // Revert local state on error
      if (userData) {
        setUserData({ ...userData, portfolios: userData.portfolios });
      }
    }
  }, [currentUserSession, username, userData]);

  // Handle profile picture change
  const handleProfilePictureChange = useCallback((imageUrl: string | null) => {
    if (userData) {
      const updatedUserData = { ...userData, profilePicture: imageUrl || undefined };
      setUserData(updatedUserData);
    }
  }, [userData]);

  // Handle portfolio creation
  const handleCreatePortfolio = useCallback(async () => {
    if (!currentUserSession) {
      setShowSignInModal(true);
    } else {
      // Generate a unique ID based on timestamp to avoid conflicts
      const newId = Date.now().toString();
      const newPortfolio = { 
        id: newId, 
        name: `Portfolio ${(userData?.portfolios?.length || 0) + 1}`, 
        rows: [], 
        isExpanded: true,
        views: 0,
        shares: 0,
        avgChange: 0,
        avgMarketCap: 0
      };
      
      // Update local state first
      if (userData) {
        const updatedPortfolios = [...(userData.portfolios || []), newPortfolio];
        setUserData({ ...userData, portfolios: updatedPortfolios });
      }

      // Save to database
      try {
        const updatedPortfolios = [...(userData?.portfolios || []), newPortfolio];
        
        await fetch(`/api/user/${currentUserSession.userId}/portfolios`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ portfolios: updatedPortfolios })
        });
        console.log('✅ Portfolio created in database');
      } catch (error) {
        console.error('❌ Failed to create portfolio in database:', error);
      }
    }
  }, [currentUserSession, userData]);

  const handleSavePortfolio = async (portfolioId: string) => {
    if (!editingPortfolioName.trim()) return;
    
    try {
      const response = await fetch(`/api/portfolio/${portfolioId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editingPortfolioName.trim() })
      });

      if (response.ok) {
        // Update local state
        if (userData) {
          const updatedPortfolios = userData.portfolios.map(p => 
            p.id === portfolioId ? { ...p, name: editingPortfolioName.trim() } : p
          );
          setUserData({ ...userData, portfolios: updatedPortfolios });
        }
        setEditingPortfolioId(null);
        setEditingPortfolioName('');
      }
    } catch (error) {
      console.error('Failed to update portfolio:', error);
    }
  };

  const handleCancelEdit = () => {
    setEditingPortfolioId(null);
    setEditingPortfolioName('');
  };

  // Handle adding tokens to portfolios (same logic as builder page)
  const handleAddToken = useCallback(async (portfolioId: string) => {
    const inputValue = portfolioInputs[portfolioId] || "";
    const mint = extractMintFromInput(inputValue);
    if (!mint || !currentUserSession) return;

    console.log('➕ Adding token with mint:', mint);

    // Check if token already exists in this portfolio
    const portfolio = userData?.portfolios.find(p => p.id === portfolioId);
    if (portfolio && portfolio.rows.some(row => row.mint === mint)) {
      alert("This token has been added to this portfolio already.");
      return;
    }

    // Add the token immediately
    const updatedPortfolios = userData?.portfolios.map(p =>
      p.id === portfolioId
        ? { ...p, rows: [...p.rows, { mint }] }
        : p
    ) || [];

    // Update local state
    if (userData) {
      setUserData({ ...userData, portfolios: updatedPortfolios });
    }

    // Clear input
    setPortfolioInputs(prev => ({ ...prev, [portfolioId]: '' }));

    // Save to database
    try {
      const response = await fetch(`/api/user/${currentUserSession.userId}/portfolios`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ portfolios: updatedPortfolios })
      });

      if (response.ok) {
        console.log('✅ Token added to portfolio');
      }
    } catch (error) {
      console.error('Failed to add token:', error);
    }
  }, [portfolioInputs, currentUserSession, userData]);

  // Handle removing tokens from portfolios (same logic as builder page)
  const handleRemoveToken = useCallback(async (portfolioId: string, mint: string) => {
    if (!currentUserSession) return;

    // Update local state first
    const updatedPortfolios = userData?.portfolios.map(p => 
      p.id === portfolioId 
        ? { ...p, rows: p.rows.filter(row => row.mint !== mint) }
        : p
    ) || [];

    // Update local state
    if (userData) {
      setUserData({ ...userData, portfolios: updatedPortfolios });
    }

    // Save to database
    try {
      const response = await fetch(`/api/user/${currentUserSession.userId}/portfolios`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ portfolios: updatedPortfolios })
      });

      if (response.ok) {
        console.log('✅ Token removed from portfolio');
      }
    } catch (error) {
      console.error('Failed to remove token:', error);
    }
  }, [currentUserSession, userData]);

  // Function to fetch Four.meme market data
  const fetchFourMemeData = useCallback(async (address: string): Promise<{ marketCap?: number; priceChange24h?: number; price?: number } | null> => {
    // Skip during build time to prevent build errors
    if (typeof window === 'undefined') {
      return null;
    }
    
    console.log('🔍 Fetching Four.meme data for address:', address);
    
    try {
      const query = `
        query {
          Trading {
            Pairs(
              where: {
                Interval: {Time: {Duration: {eq: 1}}}, 
                Price: {IsQuotedInUsd: true}, 
                Market: {Protocol: {is: "fourmeme_v1"}, Network: {is: "Binance Smart Chain"}}, 
                Volume: {Usd: {gt: 5}},
                Token: {Address: {is: "${address}"}}
              }
            ) {
              Token {
                Name
                Symbol
                Address
              }
              Market {
                Protocol
                Network
              }
              Price {
                Last
                Change24h
              }
              Volume {
                Usd
              }
              MarketCap {
                Last
              }
            }
          }
        }
      `;

      const response = await fetch('/api/fourmeme-proxy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query }),
        signal: AbortSignal.timeout(10000)
      });

      if (!response.ok) {
        console.log('❌ Four.meme API request failed:', response.status, response.statusText);
        return null;
      }

      const data = await response.json();
      
      if (data?.data?.Trading?.Pairs && data.data.Trading.Pairs.length > 0) {
        const pair = data.data.Trading.Pairs[0];
        const result = {
          price: pair.Price?.Last ? parseFloat(pair.Price.Last) : undefined,
          priceChange24h: pair.Price?.Change24h ? parseFloat(pair.Price.Change24h) : undefined,
          marketCap: pair.MarketCap?.Last ? parseFloat(pair.MarketCap.Last) : undefined
        };
        console.log('✅ Four.meme data fetched:', result);
        return result;
      } else {
        console.log('❌ No Four.meme data found for address:', address);
        return null;
      }
    } catch (error) {
      console.log('❌ Four.meme fetch error:', error);
      return null;
    }
  }, []);

  // Fetch pump.fun images for tokens
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
      // Skip HEAD request validation due to CORS - let TokenImage component handle it through proxy
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
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data && data.pairs && data.pairs.length > 0) {
          const pair = data.pairs[0];
          if (pair.baseToken?.image) {
            console.log('✅ Found image from DexScreener API:', pair.baseToken.image);
            return pair.baseToken.image;
          }
        }
      }
    } catch (error) {
      console.log('❌ DexScreener API failed:', (error as Error).message);
    }
    
    console.log('❌ No image found for token:', mint);
    return null;
  }, []);

  useEffect(() => {
    const fetchUserData = async () => {
      if (!username) return;
      
      setIsLoading(true);
      try {
        // Always fetch user data from database
        const response = await fetch(`/api/user-by-username?username=${encodeURIComponent(username)}`);
        const result = await response.json();
        
        if (result.success) {
          setIsValidUser(true);
          setUserData(result.user);
        } else {
          setIsValidUser(false);
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
        setIsValidUser(false);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserData();
  }, [username]);

  // Check for current user session from database
  useEffect(() => {
    const checkUserSession = async () => {
      try {
        // Check if there's a session cookie or header
        const response = await fetch('/api/session');
        if (response.ok) {
          const result = await response.json();
          if (result.success) {
            setCurrentUserSession({
              username: result.user.username,
              userId: result.user.id,
              sessionToken: 'database-session', // Placeholder since we don't store tokens client-side
              profilePicture: result.user.profilePicture
            });
          }
        }
      } catch (error) {
        console.error('Error checking user session:', error);
      }
    };

    checkUserSession();
  }, []);

  // Fetch token metadata and prices
  useEffect(() => {
    if (!userData?.portfolios) return;
    
    const allMints = userData.portfolios.flatMap(p => p.rows.map(r => r.mint));
    const uniqueMints = [...new Set(allMints)];
    
    if (uniqueMints.length === 0) return;

    console.log('🔄 Starting bulk metadata fetch for mints:', uniqueMints);
    const controller = new AbortController();
    
    // Fetch Jupiter token list for metadata
    fetch("https://token.jup.ag/strict", { signal: controller.signal })
      .then((r) => r.json())
      .then((tokens) => {
        const nextMeta: Record<string, { symbol?: string; name?: string; logoURI?: string | null; marketCap?: number; price?: number; priceChange24h?: number }> = {};
        for (const mint of uniqueMints) {
          const token = tokens.find((t: { address: string }) => t.address === mint);
          if (token) {
            // Don't override existing metadata from individual fetching
            const existingMeta = extraMeta[mint];
            if (!existingMeta) {
              nextMeta[mint] = {
                symbol: token.symbol,
                name: token.name,
                logoURI: token.logoURI || undefined,
              };
            }
          }
        }
        console.log('📊 Jupiter bulk metadata fetch result (only new tokens):', nextMeta);
        setTokenMeta(nextMeta);
      })
      .catch((error) => {
        console.warn('❌ Jupiter token list failed:', error);
      });

    // Fetch DexScreener data for 24h changes and additional metadata
    const dexScreenerMints = uniqueMints.slice(0, 20); // Limit to avoid URL length issues
    const dexScreenerIds = dexScreenerMints.join(",");
    
    fetch(`https://api.dexscreener.com/latest/dex/tokens/${dexScreenerIds}`, { signal: controller.signal })
      .then((r) => r.json())
      .then((data) => {
        const nextChanges: Record<string, number> = {};
        const nextMarketCaps: Record<string, number> = {};
        const nextExtraMeta: Record<string, { symbol?: string; name?: string; logoURI?: string | null; marketCap?: number; price?: number; priceChange24h?: number }> = {};
        
        if (data && data.pairs) {
          for (const pair of data.pairs) {
            const mint = pair.baseToken?.address;
            if (mint && uniqueMints.includes(mint)) {
              if (typeof pair.priceChange?.h24 === "number") {
                nextChanges[mint] = pair.priceChange.h24;
              }
              if (typeof pair.marketCap === "number") {
                nextMarketCaps[mint] = pair.marketCap;
              }
              if (!tokenMeta[mint] && !extraMeta[mint]) {
                // For bulk fetch, set metadata and price data from DexScreener
                const dexPrice = parseFloat(pair.priceUsd);
                const dexPriceChange = parseFloat(pair.priceChange?.h24);
                const dexMarketCap = parseFloat(pair.marketCap);
                
                nextExtraMeta[mint] = {
                  symbol: pair.baseToken?.symbol,
                  name: pair.baseToken?.name,
                  price: dexPrice || undefined,
                  priceChange24h: dexPriceChange || undefined,
                  marketCap: dexMarketCap || undefined,
                  // Don't set logoURI here - let individual fetch handle it
                };
                console.log('📝 Adding new token to bulk metadata (with price data):', mint, nextExtraMeta[mint]);
              } else {
                console.log('⏭️ Skipping token (already has metadata):', mint, {
                  hasTokenMeta: !!tokenMeta[mint],
                  hasExtraMeta: !!extraMeta[mint],
                  existingLogoURI: extraMeta[mint]?.logoURI
                });
              }
            }
          }
        }
        setPriceChanges24h(nextChanges);
        setMarketCaps(nextMarketCaps);
        setExtraMeta(prev => {
          const merged = { ...prev };
          // Only merge new metadata, preserve existing logoURI
          for (const [mint, newMeta] of Object.entries(nextExtraMeta)) {
            merged[mint] = {
              ...prev[mint], // Keep existing metadata including logoURI
              ...newMeta,    // Override with new symbol/name
              logoURI: prev[mint]?.logoURI || newMeta.logoURI // Preserve existing logoURI
            };
          }
          console.log('🔄 Merging DexScreener bulk metadata (preserving logoURI):', { 
            newTokens: Object.keys(nextExtraMeta),
            mergedTokens: Object.keys(merged)
          });
          return merged;
        });
      })
      .catch((error) => {
        console.warn('❌ DexScreener bulk fetch failed:', error);
      });

    // Fetch individual token images and fourmeme data
    const fetchIndividualImages = async () => {
      for (const mint of uniqueMints) {
        // Fetch image if not already available
        if (!extraMeta[mint]?.logoURI && !tokenMeta[mint]?.logoURI) {
          try {
            const imageUrl = await fetchPumpFunImages(mint);
            if (imageUrl) {
              setExtraMeta(prev => ({
                ...prev,
                [mint]: {
                  ...prev[mint],
                  logoURI: imageUrl
                }
              }));
            }
          } catch (error) {
            console.warn('❌ Failed to fetch image for token:', mint, error);
          }
        }

        // Fetch fourmeme data for BNB tokens if no price data available
        if (isValidBNBAddress(mint) && !priceChanges24h[mint] && !marketCaps[mint]) {
          try {
            console.log('💰 Fetching Four.meme market data for BNB token:', mint);
            const fourMemeResult = await fetchFourMemeData(mint);
            if (fourMemeResult) {
              setExtraMeta(prev => ({
                ...prev,
                [mint]: {
                  ...prev[mint],
                  price: fourMemeResult.price,
                  priceChange24h: fourMemeResult.priceChange24h,
                  marketCap: fourMemeResult.marketCap
                }
              }));
              console.log('✅ Four.meme data added for BNB token:', mint);
            }
          } catch (error) {
            console.warn('❌ Failed to fetch Four.meme data for BNB token:', mint, error);
          }
        }
      }
    };

    fetchIndividualImages();

    return () => {
      controller.abort();
    };
  }, [userData?.portfolios, tokenMeta, extraMeta, fetchPumpFunImages, fetchFourMemeData, priceChanges24h, marketCaps]);

  // Calculate portfolio stats
  const portfolioStats = useMemo(() => {
    if (!userData?.portfolios) return [];
    
    return userData.portfolios.map(portfolio => {
      const tokens = portfolio.rows;
      const changes = tokens.map(row => {
        const meta = extraMeta[row.mint] || tokenMeta[row.mint];
        return meta?.priceChange24h || priceChanges24h[row.mint] || 0;
      });
      const marketCapsList = tokens.map(row => {
        const meta = extraMeta[row.mint] || tokenMeta[row.mint];
        return meta?.marketCap || marketCaps[row.mint] || 0;
      });
      
      const avgChange = changes.length > 0 ? changes.reduce((sum, change) => sum + change, 0) / changes.length : 0;
      const avgMarketCap = marketCapsList.length > 0 ? marketCapsList.reduce((sum, cap) => sum + cap, 0) / marketCapsList.length : 0;
      
      return {
        portfolio,
        change24h: avgChange,
        avgMarketCap: avgMarketCap
      };
    });
  }, [userData?.portfolios, priceChanges24h, marketCaps, extraMeta, tokenMeta]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  if (isValidUser === false) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">User Not Found</h1>
          <p className="text-white/60 mb-6">The user profile you&apos;re looking for doesn&apos;t exist.</p>
          <button
            onClick={() => router.push('/profile')}
            className="rounded-lg gradient-button px-6 py-3 text-white"
          >
            Go to Profile
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex" style={{ fontFamily: 'Golos Text, sans-serif' }}>
      {/* Navigation Bar */}
      <NavigationBar 
        username={username} 
        profilePicture={userData?.profilePicture}
        isCurrentUser={currentUserSession?.username === username}
      />
      
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
                      <Link href="/leaderboard" className="gradient-button px-4 py-2 text-sm text-white rounded-md"><FontAwesomeIcon icon={faTrophy} /> Leaderboard</Link>
                      {currentUserSession && currentUserSession.username !== username && (
                        <Link 
                          href={`/${currentUserSession.username}`}
                          className="inline-flex items-center gap-3 rounded-lg gradient-button px-4 py-2 text-sm text-white transition-colors"
                        >
                          <div className="w-6 h-6 rounded-full border border-white/20 overflow-hidden">
                            <Image
                              src={currentUserSession.profilePicture || '/placeholder-token.svg'}
                              alt={currentUserSession.username}
                              width={24}
                              height={24}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          {currentUserSession.username}
                        </Link>
                      )}
                      {!currentUserSession && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setShowSignInModal(true)}
                            className="rounded-lg border border-white/20 bg-white/5 hover:bg-white/10 px-4 py-2 text-sm text-white transition-colors"
                          >
                            Sign In
                          </button>
                          <button
                            onClick={() => setShowAccountModal(true)}
                            className="gradient-button px-4 py-2 text-sm text-white rounded-md"
                          >
                            Create Account
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
          <h1 className="text-2xl font-semibold mb-1">
            {currentUserSession && currentUserSession.username === username ? 'My Portfolios' : `${username}'s Portfolios`}
          </h1>
          <p className="text-white/60 text-sm">
            {currentUserSession && currentUserSession.username === username 
              ? 'Manage and edit your portfolios below. Click on any portfolio to edit it.'
              : `Viewing all portfolios by ${username}. Sign in to create and edit your own portfolios.`
            }
          </p>
        </div>

        {/* User Profile Section */}
        <div className="mb-4 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              {currentUserSession && currentUserSession.username === username ? (
                <ProfilePictureUpload
                  currentImage={userData?.profilePicture}
                  onImageChange={handleProfilePictureChange}
                  userId={currentUserSession.userId}
                  usernameInitial={username.charAt(0).toUpperCase()}
                />
              ) : (
                <div className="w-16 h-16 rounded-full overflow-hidden flex-shrink-0">
                  {userData?.profilePicture ? (
                    <Image
                      src={userData.profilePicture}
                      alt={username}
                      width={64}
                      height={64}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-r from-[var(--brand-start)] to-[var(--brand-end)] flex items-center justify-center text-white font-bold text-xl">
                      {username.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
              )}
              <div className="min-w-0">
                <h2 className="text-xl font-semibold text-white truncate">{username}</h2>
                <p className="text-white/60">Portfolio Creator</p>
                <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-white/60">
                  <span>{userData?.portfolios?.length || 0} portfolios</span>
                  <span>{userData?.portfolios?.reduce((total, p) => total + p.rows.length, 0) || 0} tokens</span>
                  <span className="text-green-400">Active</span>
                </div>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <Link
                href="/leaderboard"
                className="rounded-md border border-white/20 bg-white/5 hover:bg-white/10 px-4 py-2 text-sm text-white transition-colors text-center w-full sm:w-auto"
              >
                <FontAwesomeIcon icon={faTrophy} /> Leaderboard
              </Link>
              {currentUserSession && currentUserSession.username === username && (
                <button
                  onClick={handleCreatePortfolio}
                  className="gradient-button px-4 py-2 text-sm text-white rounded-md w-full sm:w-auto"
                >
                  Create New Portfolio
                </button>
              )}
            </div>
          </div>
        </div>

        {!userData?.portfolios || userData?.portfolios?.length === 0 ? (
          <div className="text-center py-8">
            <div className="mb-4">
              <h2 className="text-xl font-semibold text-white mb-2">
                {currentUserSession && currentUserSession.username === username ? 'No portfolios yet' : 'No portfolios yet'}
              </h2>
              <p className="text-white/60 mb-4 text-sm">
                {currentUserSession && currentUserSession.username === username 
                  ? 'Create your first portfolio to get started!'
                  : `${username} hasn't created any portfolios yet.`
                }
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                {currentUserSession && currentUserSession.username === username ? (
                  <button
                    onClick={handleCreatePortfolio}
                    className="rounded-lg gradient-button px-6 py-3 text-base font-medium text-white"
                  >
                    Create Your First Portfolio
                  </button>
                ) : (
                  <Link
                    href="/"
                    className="rounded-lg gradient-button px-6 py-3 text-base font-medium text-white"
                  >
                    Create Your Own Portfolio
                  </Link>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {userData.portfolios.map((portfolio) => {
              const stats = portfolioStats.find(s => s.portfolio.id === portfolio.id);
              const visibleTokens = portfolio.rows.slice(0, 4);
              const hiddenCount = portfolio.rows.length - 4;
              
              return (
                <div 
                  key={portfolio.id} 
                  className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6"
                >
                  {/* Portfolio Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 flex-1">
                      <div className="flex items-center gap-3">
                        {currentUserSession && currentUserSession.username === username && editingPortfolioId === portfolio.id ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={editingPortfolioName}
                              onChange={(e) => setEditingPortfolioName(e.target.value)}
                              className="bg-white/10 border border-white/20 rounded px-2 py-1 text-white text-lg font-medium focus:outline-none focus:ring-2 focus:ring-white/30"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  handleSavePortfolio(portfolio.id);
                                } else if (e.key === 'Escape') {
                                  handleCancelEdit();
                                }
                              }}
                            />
                            <button
                              onClick={() => handleSavePortfolio(portfolio.id)}
                              className="text-green-400 hover:text-green-300 transition-colors"
                              title="Save"
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="20,6 9,17 4,12"/>
                              </svg>
                            </button>
                            <button
                              onClick={handleCancelEdit}
                              className="text-red-400 hover:text-red-300 transition-colors"
                              title="Cancel"
                            >
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <line x1="18" y1="6" x2="6" y2="18"/>
                                <line x1="6" y1="6" x2="18" y2="18"/>
                              </svg>
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-3">
                            <h3 className="text-lg font-medium text-white">{portfolio.name}</h3>
                            {currentUserSession && currentUserSession.username === username && (
                              <button
                                onClick={() => handleEditPortfolio(portfolio)}
                                className="text-white/40 hover:text-white/60 transition-colors"
                                title="Edit portfolio name"
                              >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                                </svg>
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-white/60">
                        <span>{portfolio.rows.length} tokens</span>
                        {stats && (
                          <>
                            <span className={stats.change24h >= 0 ? "text-green-400" : "text-red-400"}>
                              {stats.change24h >= 0 ? "+" : ""}{stats.change24h.toFixed(2)}%
                            </span>
                            {stats.avgMarketCap > 0 && (
                              <span className="text-blue-400">
                                ${stats.avgMarketCap >= 1e9
                                  ? `${(stats.avgMarketCap / 1e9).toFixed(1)}B`
                                  : stats.avgMarketCap >= 1e6
                                  ? `${(stats.avgMarketCap / 1e6).toFixed(1)}M`
                                  : `${(stats.avgMarketCap / 1e3).toFixed(1)}K`
                                }
                              </span>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                    
                    {/* Share and Delete Buttons - Right Side */}
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => handleSharePortfolio(portfolio)}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg border border-white/20 bg-white/5 hover:bg-white/10 text-white text-sm transition-colors"
                        title="Share portfolio"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="18" cy="5" r="3"/>
                          <circle cx="6" cy="12" r="3"/>
                          <circle cx="18" cy="19" r="3"/>
                          <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
                          <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
                        </svg>
                        Share
                      </button>
                      {currentUserSession && currentUserSession.username === username && (
                        <button
                          onClick={() => handleDeletePortfolio(portfolio.id)}
                          className="text-red-400 hover:text-red-300 transition-colors p-2"
                          title="Delete portfolio"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18"/>
                            <line x1="6" y1="6" x2="18" y2="18"/>
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                      {/* Token Images */}
                      <div className="flex items-center gap-1 flex-wrap">
                        {visibleTokens.map((row) => {
                          const meta = extraMeta[row.mint] || tokenMeta[row.mint];
                          return (
                            <div key={row.mint} className="relative group">
                              <TokenImage
                                src={meta?.logoURI || undefined}
                                alt={meta?.symbol || "Token"}
                                className="w-8 h-8 rounded-lg border border-white/20"
                                fallbackSrc="/placeholder-token.svg"
                              />
                              {currentUserSession && currentUserSession.username === username && (
                                <button
                                  onClick={() => handleRemoveToken(portfolio.id, row.mint)}
                                  className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                                >
                                  -
                                </button>
                              )}
                            </div>
                          );
                        })}
                        {hiddenCount > 0 && (
                          <div className="w-8 h-8 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-xs text-white/60">
                            +{hiddenCount}
                          </div>
                        )}
                      </div>
                      
                    </div>

                  {/* Add Token Input - MOVED TO TOP */}
                  {currentUserSession && currentUserSession.username === username && (
                    <div className="mt-4">
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                        <input
                          type="text"
                          value={portfolioInputs[portfolio.id] || ""}
                          onChange={(e) => setPortfolioInputs(prev => ({ ...prev, [portfolio.id]: e.target.value }))}
                          placeholder="Paste Solana or BNB token contract address..."
                          className="flex-1 rounded-md border border-white/20 bg-white/5 text-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--brand-end)]"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleAddToken(portfolio.id);
                          }}
                        />
                        <button
                          onClick={() => handleAddToken(portfolio.id)}
                          disabled={!extractMintFromInput(portfolioInputs[portfolio.id] || "")}
                          className="rounded-md gradient-button px-4 py-2 text-sm text-white disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto"
                        >
                          Add Token
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Token List - MOVED TO BOTTOM */}
                  {portfolio.rows.length > 0 && (
                    <div className="space-y-2 mt-4">
                      {portfolio.rows.map((row) => {
                        const meta = extraMeta[row.mint] || tokenMeta[row.mint];
                        const priceChange = meta?.priceChange24h || priceChanges24h[row.mint] || 0;
                        const marketCap = meta?.marketCap || marketCaps[row.mint] || 0;
                        
                        return (
                          <div key={row.mint} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 bg-white/5 rounded-lg">
                            <div className="flex items-center gap-3">
                              <TokenImage
                                src={meta?.logoURI || undefined}
                                alt={meta?.symbol || "Token"}
                                className="w-8 h-8 rounded-lg border border-white/20"
                                fallbackSrc="/placeholder-token.svg"
                              />
                              <div className="min-w-0 flex-1">
                                <div className="text-white font-medium truncate">
                                  {meta?.symbol || "Unknown"}
                                </div>
                                <div className="flex items-center gap-2">
                                  <div className="text-white/60 text-sm truncate">
                                    {row.mint.slice(0, 8)}...{row.mint.slice(-8)}
                                  </div>
                                  <button
                                    onClick={() => handleCopyContractAddress(row.mint)}
                                    className="text-white/40 hover:text-white/60 transition-colors flex-shrink-0"
                                    title="Copy contract address"
                                  >
                                    <FontAwesomeIcon icon={faCopy} className="w-3 h-3" />
                                  </button>
                                  {copiedMintAddress === row.mint && (
                                    <span className="text-green-400 text-xs">Copied!</span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center justify-between sm:justify-end gap-3">
                              <div className="text-left sm:text-right">
                                <div className={`font-medium ${priceChange >= 0 ? "text-green-400" : "text-red-400"}`}>
                                  {priceChange >= 0 ? "+" : ""}{priceChange.toFixed(2)}%
                                </div>
                                {marketCap > 0 && (
                                  <div className="text-white/60 text-sm">
                                    ${marketCap >= 1e9
                                      ? `${(marketCap / 1e9).toFixed(1)}B`
                                      : marketCap >= 1e6
                                      ? `${(marketCap / 1e6).toFixed(1)}M`
                                      : `${(marketCap / 1e3).toFixed(1)}K`
                                    }
                                  </div>
                                )}
                              </div>
                              {currentUserSession && currentUserSession.username === username && (
                                <button
                                  onClick={() => handleRemoveToken(portfolio.id, row.mint)}
                                  className="text-red-400 hover:text-red-300 transition-colors flex-shrink-0"
                                >
                                  ✕
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modals */}
      {showSignInModal && (
        <SignInModal
          isOpen={showSignInModal}
          onClose={() => setShowSignInModal(false)}
          onSuccess={(username, userId) => {
            setShowSignInModal(false);
            // Session is now handled by HTTP-only cookies
            // Redirect to user's profile page after successful sign in
            router.push(`/${username}`);
          }}
          onSwitchToSignUp={() => {
            setShowSignInModal(false);
            setShowAccountModal(true);
          }}
        />
      )}

      {showAccountModal && (
        <AccountModal
          isOpen={showAccountModal}
          onClose={() => setShowAccountModal(false)}
          onSuccess={(username, userId) => {
            setShowAccountModal(false);
            // Session is now handled by HTTP-only cookies
            // Redirect to user's profile page after successful account creation
            router.push(`/${username}`);
          }}
          onSwitchToSignIn={() => {
            setShowAccountModal(false);
            setShowSignInModal(true);
          }}
        />
      )}

      {selectedPortfolioForShare && (
        <ShareModal
          isOpen={showShareModal}
          onClose={handleCloseShareModal}
          portfolio={selectedPortfolioForShare}
          portfolioStats={{
            avgMarketCap: portfolioStats.find(stat => stat.portfolio.id === selectedPortfolioForShare.id)?.avgMarketCap || 0,
            change24h: portfolioStats.find(stat => stat.portfolio.id === selectedPortfolioForShare.id)?.change24h || 0
          }}
          tokenMeta={tokenMeta}
          extraMeta={extraMeta}
          userId={currentUserSession?.userId}
        />
      )}
      </div>
    </div>
  );
}
