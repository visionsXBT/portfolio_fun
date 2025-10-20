"use client";

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { PublicKey } from '@solana/web3.js';
import Logo from '@/components/Logo';
import TokenImage from '@/components/TokenImage';
import Image from 'next/image';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCopy } from '@fortawesome/free-solid-svg-icons';
import SignInModal from '@/components/SignInModal';
import AccountModal from '@/components/AccountModal';

interface PortfolioRow {
  mint: string;
}

interface Portfolio {
  id: string;
  name: string;
  rows: PortfolioRow[];
  isExpanded: boolean;
  username?: string;
  profilePicture?: string;
}

interface TokenMeta {
  symbol?: string;
  name?: string;
  logoURI?: string | null;
  marketCap?: number;
  price?: number;
  priceChange24h?: number;
}

// Validation functions
function isValidMint(value: string): boolean {
  try {
    new PublicKey(value);
    return true;
  } catch {
    return false;
  }
}

function isValidBNBAddress(value: string): boolean {
  // BNB Smart Chain uses Ethereum-compatible addresses (0x format, 42 characters)
  const bnbAddressRegex = /^0x[a-fA-F0-9]{40}$/;
  return bnbAddressRegex.test(value);
}

export default function PublicPortfolioView() {
  const params = useParams();
  const portfolioId = params?.id as string;
  
  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [tokenMeta, setTokenMeta] = useState<Record<string, TokenMeta>>({});
  const [extraMeta, setExtraMeta] = useState<Record<string, TokenMeta>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUserSession, setCurrentUserSession] = useState<{ 
    username: string; 
    userId: string; 
    sessionToken: string; 
    profilePicture?: string 
  } | null>(null);
  const [showSignInModal, setShowSignInModal] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [copiedMintAddress, setCopiedMintAddress] = useState<string | null>(null);

  // Dedicated function for pump.fun image fetching (copied from main page)
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
        signal: AbortSignal.timeout(5000)
      });
      
      console.log('📊 DexScreener response status:', response.status, response.ok);
      
      if (response.ok) {
        const data = await response.json();
        console.log('📊 DexScreener response data:', JSON.stringify(data, null, 2));
        
        if (data.pairs && data.pairs.length > 0) {
          const pair = data.pairs[0];
          console.log('📊 DexScreener pair data:', JSON.stringify(pair, null, 2));
          
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
    
    // For non-pump tokens, try a few pump.fun URLs as fallback
    const urls = [
      `https://images.pump.fun/coin-image/${mint}?variant=600x600&ipfs=QmQw4DQjdWp3G8TuMCykG8SVSwtFwkxvTyxEWNMuAVYU4q&src=https%3A%2F%2Fipfs.io%2Fipfs%2FQmQw4DQjdWp3G8TuMCykG8SVSwtFwkxvTyxEWNMuAVYU4q`,
      `https://images.pump.fun/coin-image/${mint}`,
      `https://pump.fun/${mint}.png`,
    ];
    
    console.log('🔍 Testing', urls.length, 'pump.fun URLs as fallback...');
    
    for (const url of urls) {
      try {
        console.log('🔍 Testing pump.fun URL:', url);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000);
        
        const response = await fetch(url, { 
          method: 'HEAD',
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
          console.log('✅ Found image from pump.fun URL:', url);
          return url;
        } else {
          console.log('❌ Pump.fun URL not found:', url, response.status);
        }
      } catch (error) {
        console.log('❌ Pump.fun URL failed:', url, (error as Error).message);
      }
    }
    
    console.log('❌ No image found for Solana token:', mint);
    return null;
  }, []);

  // Function to scrape Four.meme page and extract image UUID
  const scrapeFourMemeImage = useCallback(async (contractAddress: string): Promise<string | null> => {
    try {
      console.log('🕷️ Scraping Four.meme page for contract:', contractAddress);
      
      // Try different possible URL patterns for Four.meme token pages
      const possibleUrls = [
        `https://four.meme/market/${contractAddress}`,
        `https://four.meme/token/${contractAddress}`,
        `https://four.meme/${contractAddress}`,
        `https://four.meme/market/${contractAddress.toLowerCase()}`,
        `https://four.meme/token/${contractAddress.toLowerCase()}`
      ];
      
      for (const pageUrl of possibleUrls) {
        try {
          const response = await fetch(pageUrl, {
            signal: AbortSignal.timeout(10000),
            headers: {
              'User-Agent': 'Mozilla/5.0 (compatible; onPort/1.0)',
              'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            }
          });
          
          if (response.ok) {
            const html = await response.text();
            
            // Look for image URL patterns in the HTML
            const imagePatterns = [
              /https:\/\/static\.four\.meme\/market\/([a-f0-9-]+\.png)/gi,
              /https%3A%2F%2Fstatic\.four\.meme%2Fmarket%2F([a-f0-9-]+\.png)/gi,
              /background-image:\s*url\(['"]?https:\/\/static\.four\.meme\/market\/([a-f0-9-]+\.png)['"]?\)/gi,
              /data-src=['"]https:\/\/static\.four\.meme\/market\/([a-f0-9-]+\.png)['"]/gi,
              /src=['"]https:\/\/static\.four\.meme\/market\/([a-f0-9-]+\.png)['"]/gi
            ];
            
            for (const pattern of imagePatterns) {
              const matches = html.match(pattern);
              if (matches && matches.length > 0) {
                const fullMatch = matches[0];
                const uuidMatch = fullMatch.match(/([a-f0-9-]+\.png)/i);
                
                if (uuidMatch) {
                  const uuid = uuidMatch[1];
                  const imageUrl = `https://four.meme/_next/image?url=https%3A%2F%2Fstatic.four.meme%2Fmarket%2F${uuid}&w=48&q=75`;
                  console.log('✅ Found Four.meme image UUID:', uuid);
                  return imageUrl;
                }
              }
            }
          }
        } catch (error) {
          console.log('❌ Four.meme page fetch failed:', pageUrl, (error as Error).message);
        }
      }
      
      return null;
    } catch (error) {
      console.log('❌ Four.meme scraping failed:', (error as Error).message);
      return null;
    }
  }, []);

  const fetchBNBTokenImage = useCallback(async (address: string): Promise<string | null> => {
    console.log('🔍 Trying BNB token image sources for address:', address);
    
    // Try scraping Four.meme for BNB tokens first (primary source)
    try {
      console.log('🔄 Trying Four.meme scraping (primary)...');
      const scrapedImageUrl = await scrapeFourMemeImage(address);
      
      if (scrapedImageUrl) {
        console.log('✅ Returning scraped Four.meme URL (will be proxied):', scrapedImageUrl);
        return scrapedImageUrl;
      } else {
        console.log('❌ Four.meme scraping failed, trying fallbacks...');
      }
    } catch (error) {
      console.log('❌ Four.meme scraping failed:', (error as Error).message);
    }
    
    // Try DexScreener for BNB token image as fallback
    try {
      const dexScreenerUrl = `https://api.dexscreener.com/latest/dex/tokens/${address}`;
      console.log('🔄 Trying DexScreener for BNB image (fallback):', dexScreenerUrl);
      
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
    
    // Try CoinGecko API for BNB Smart Chain tokens
    try {
      const coinGeckoUrl = `https://api.coingecko.com/api/v3/coins/binance-smart-chain/contract/${address.toLowerCase()}`;
      console.log('🔄 Trying CoinGecko:', coinGeckoUrl);
      
      const response = await fetch(coinGeckoUrl, {
        signal: AbortSignal.timeout(5000)
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.image?.large) {
          console.log('✅ Found image from CoinGecko:', data.image.large);
          return data.image.large;
        }
      }
    } catch (error) {
      console.log('❌ CoinGecko failed:', (error as Error).message);
    }
    
    // Try Moralis API for BNB tokens
    try {
      const moralisUrl = `https://deep-index.moralis.io/api/v2.2/token-metadata?chain=bsc&addresses[]=${address}`;
      console.log('🔄 Trying Moralis:', moralisUrl);
      
      const response = await fetch(moralisUrl, {
        headers: {
          'X-API-Key': process.env.NEXT_PUBLIC_MORALIS_API_KEY || '',
        },
        signal: AbortSignal.timeout(5000)
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data[0]?.logo) {
          console.log('✅ Found image from Moralis:', data[0].logo);
          return data[0].logo;
        }
      }
    } catch (error) {
      console.log('❌ Moralis failed:', (error as Error).message);
    }
    
    console.log('❌ No BNB token images found for address:', address);
    return null;
  }, [scrapeFourMemeImage]);

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

  // Load user session
  useEffect(() => {
    const loadUserSession = async () => {
      try {
        const sessionResponse = await fetch('/api/session');
        if (sessionResponse.ok) {
          const sessionData = await sessionResponse.json();
          if (sessionData.success) {
            console.log('👤 Found user session on share page:', sessionData.user);
            setCurrentUserSession(sessionData.user);
          } else {
            console.log('👤 No valid session found on share page');
            setCurrentUserSession(null);
          }
        } else {
          console.log('👤 No session found on share page');
          setCurrentUserSession(null);
        }
      } catch (error) {
        console.error('Failed to load user session on share page:', error);
        setCurrentUserSession(null);
      }
    };
    
    loadUserSession();
  }, []);

  useEffect(() => {
    if (!portfolioId) return;

    const loadPortfolio = async () => {
      try {
        // Fetch from API (which will use MongoDB)
        const response = await fetch(`/api/portfolio/${portfolioId}`);
        if (response.ok) {
          const portfolioData = await response.json();
          // Structure it like the main website expects
          const portfolio: Portfolio = {
            ...portfolioData,
            isExpanded: true // Always expanded for shared view
          };
          setPortfolios([portfolio]);
          await fetchTokenMetadata(portfolioData.rows.map((r: PortfolioRow) => r.mint));
          
          // Track portfolio view
          await trackPortfolioAction('view');
        } else {
          setError('Portfolio not found');
        }
      } catch (err) {
        setError('Failed to load portfolio');
        console.error('Error loading portfolio:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadPortfolio();
  }, [portfolioId, fetchPumpFunImages, fetchBNBTokenImage, scrapeFourMemeImage]);

  const trackPortfolioAction = async (action: 'view' | 'share') => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const referrerId = urlParams.get('ref');
      
      await fetch('/api/track-portfolio', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          portfolioId,
          action,
          referrerId
        })
      });
    } catch (error) {
      console.error('Failed to track portfolio action:', error);
    }
  };

  const fetchTokenMetadata = async (mints: string[]) => {
    try {
      console.log('🔍 Fetching metadata for mints:', mints);
      
      // First, try to get basic metadata from DexScreener
      const dexScreenerIds = mints.join(",");
      const response = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${dexScreenerIds}`);
      
      const meta: Record<string, TokenMeta> = {};
      
      if (response.ok) {
        const data = await response.json();
        
        if (data.pairs) {
          for (const pair of data.pairs) {
            const mint = pair.baseToken?.address;
            if (mint && mints.includes(mint)) {
              meta[mint] = {
                symbol: pair.baseToken?.symbol,
                name: pair.baseToken?.name,
                marketCap: parseFloat(pair.marketCap || 0),
                priceChange24h: parseFloat(pair.priceChange?.h24 || 0),
                // Include any available logoURI from DexScreener if it exists
                ...(pair.baseToken?.info?.imageUrl ? { logoURI: pair.baseToken.info.imageUrl } : {}),
                ...(pair.baseToken?.info?.imageHash ? { logoURI: `https://cdn.dexscreener.com/cms/images/${pair.baseToken.info.imageHash}?width=800&height=800&fit=crop&quality=95&format=auto` } : {})
              };
            }
          }
        }
      }
      
      setTokenMeta(meta);
      
      // Now fetch images for each token individually
      for (const mint of mints) {
        try {
          let logoURI = null;
          
          // Fetch image based on token type
          if (isValidMint(mint)) {
            console.log('🖼️ Fetching Solana token image for mint:', mint);
            logoURI = await fetchPumpFunImages(mint);
            console.log('🖼️ Solana token image result:', logoURI);
          } else if (isValidBNBAddress(mint)) {
            console.log('🖼️ Fetching BNB token image for address:', mint);
            logoURI = await fetchBNBTokenImage(mint);
            console.log('🖼️ BNB token image result:', logoURI);
          }
          
          console.log('🖼️ Individual image result for', mint, ':', logoURI);
          
          setExtraMeta(prev => {
            // Only update logoURI if we have a valid URL, never override with null/undefined
            // Also preserve any existing valid logoURI
            const existingLogoURI = prev[mint]?.logoURI;
            const hasValidExistingURL = existingLogoURI && existingLogoURI.trim() !== '';
            const hasValidNewURL = logoURI && logoURI.trim() !== '';
            
            const newMeta = {
              ...prev,
              [mint]: {
                ...prev[mint],
                // Only set logoURI if we have a valid new URL, preserve existing valid URLs
                ...(hasValidNewURL ? { logoURI } : hasValidExistingURL ? { logoURI: existingLogoURI } : {})
              }
            };
            console.log('🔄 Setting extraMeta for', mint, ':', newMeta[mint]);
            console.log('🔄 URL preservation check - existing:', hasValidExistingURL, 'new:', hasValidNewURL);
            return newMeta;
          });
        } catch (error) {
          console.error('Error fetching image for mint:', mint, error);
        }
      }
    } catch (error) {
      console.error('Error fetching token metadata:', error);
    }
  };

  const formatMarketCap = (marketCap: number): string => {
    if (marketCap >= 1e9) {
      return `$${(marketCap / 1e9).toFixed(1)}B`;
    } else if (marketCap >= 1e6) {
      return `$${(marketCap / 1e6).toFixed(1)}M`;
    } else if (marketCap >= 1e3) {
      return `$${(marketCap / 1e3).toFixed(1)}K`;
    } else {
      return `$${marketCap.toFixed(0)}`;
    }
  };

  const portfolioStats = useMemo(() => {
    return portfolios.map(portfolio => {
      const portfolioMints = portfolio.rows.map(r => r.mint);
      
      // Calculate average change using both priceChanges24h and extraMeta
      const portfolioChanges = portfolioMints.map(mint => {
        const tokenMetaData = tokenMeta[mint] || {};
        const extraMetaData = extraMeta[mint] || {};
        const meta = {
          ...tokenMetaData,
          ...extraMetaData,
          priceChange24h: extraMetaData.priceChange24h || tokenMetaData.priceChange24h
        };
        return meta?.priceChange24h || 0;
      });
      const avgChange = portfolioChanges.length > 0 
        ? portfolioChanges.reduce((sum, change) => sum + change, 0) / portfolioChanges.length 
        : 0;

      // Calculate average market cap
      const portfolioMarketCaps = portfolioMints.map(mint => {
        const tokenMetaData = tokenMeta[mint] || {};
        const extraMetaData = extraMeta[mint] || {};
        const meta = {
          ...tokenMetaData,
          ...extraMetaData,
          marketCap: extraMetaData.marketCap || tokenMetaData.marketCap
        };
        return meta?.marketCap || 0;
      });
      const avgMarketCap = portfolioMarketCaps.length > 0 
        ? portfolioMarketCaps.reduce((sum, cap) => sum + cap, 0) / portfolioMarketCaps.length 
        : 0;

      return {
        avgChange,
        avgMarketCap
      };
    });
  }, [portfolios, extraMeta, tokenMeta]);

  if (isLoading) {
    return (
      <div className="min-h-screen p-6 sm:p-8 md:p-12 pb-16" style={{ fontFamily: 'Golos Text, sans-serif' }}>
        <div className="mx-auto w-full max-w-6xl">
          <div className="flex items-center justify-center h-64">
            <div className="text-white text-xl">Loading portfolio...</div>
          </div>
        </div>
      </div>
    );
  }

  if (error || portfolios.length === 0) {
    return (
      <div className="min-h-screen p-6 sm:p-8 md:p-12 pb-16" style={{ fontFamily: 'Golos Text, sans-serif' }}>
        <div className="mx-auto w-full max-w-6xl">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="text-white text-xl mb-4">Portfolio Not Found</div>
              <div className="text-white/60">The portfolio you&apos;re looking for doesn&apos;t exist or has been removed.</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 sm:p-8 md:p-12 pb-16" style={{ fontFamily: 'Golos Text, sans-serif' }}>
      <div className="mx-auto w-full max-w-6xl">
        {/* Header with Logo */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <Logo />
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <span className="text-sm text-white/60">
                  Shared Portfolio • Read Only
                </span>
                <button
                  onClick={() => trackPortfolioAction('share')}
                  className="text-white/60 hover:text-white transition-colors"
                  title="Share this portfolio"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
                    <polyline points="16,6 12,2 8,6"/>
                    <line x1="12" y1="2" x2="12" y2="15"/>
                  </svg>
                </button>
              </div>
              {currentUserSession ? (
                <button 
                  onClick={() => window.location.href = '/profile'}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg border border-white/20 bg-white/5 hover:bg-white/10 text-white text-sm transition-colors"
                >
                  {currentUserSession.profilePicture ? (
                    <Image
                      src={currentUserSession.profilePicture}
                      alt="Profile"
                      width={20}
                      height={20}
                      className="w-5 h-5 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-5 h-5 rounded-full bg-gradient-to-r from-[var(--brand-start)] to-[var(--brand-end)] flex items-center justify-center text-white font-bold text-xs">
                      {currentUserSession.username.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span>{currentUserSession.username}</span>
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowSignInModal(true)}
                    className="text-sm text-white/60 hover:text-white transition-colors"
                  >
                    Sign In
                  </button>
                  <span className="text-white/40">•</span>
                  <button
                    onClick={() => setShowAccountModal(true)}
                    className="text-sm text-white/60 hover:text-white transition-colors"
                  >
                    Sign Up
                  </button>
                </div>
              )}
            </div>
          </div>
          
          {/* Main Header - Similar to "Build your Bags!" */}
          <div className="flex items-center gap-4 mb-2">
            {portfolios.length > 0 && portfolios[0].profilePicture && (
              <div className="w-12 h-12 rounded-full overflow-hidden">
                <Image
                  src={portfolios[0].profilePicture}
                  alt={portfolios[0].username || 'User'}
                  width={48}
                  height={48}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            <h1 className="text-3xl font-semibold">
              {portfolios.length > 0 && portfolios[0].username 
                ? `${portfolios[0].username}'s Portfolio` 
                : "Shared Portfolio"}
            </h1>
          </div>
          <p className="text-white/60">
            Viewing a shared portfolio. Sign in to create and edit your own portfolios.
          </p>
        </div>

        {/* Portfolio List - Read Only Version */}
        {portfolios.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-white/60 text-lg mb-4">No portfolios to display</div>
          </div>
        ) : (
          portfolios.map((portfolio, portfolioIndex) => {
            const stats = portfolioStats[portfolioIndex];
            return (
              <div key={portfolio.id} className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6 mb-6">
                {/* Portfolio Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-4 flex-1">
                    <div className="flex items-center gap-3">
                      <span className="text-white/60 text-lg">📊</span>
                      <div>
                        <h2 className="text-xl font-semibold text-white">{portfolio.name}</h2>
                        <div className="text-sm text-white/60">
                          {portfolio.rows.length} token{portfolio.rows.length !== 1 ? 's' : ''}
                          {stats && (
                            <>
                              {' • '}
                              <span className={stats.avgChange >= 0 ? 'text-green-400' : 'text-red-400'}>
                                {stats.avgChange >= 0 ? '+' : ''}{stats.avgChange.toFixed(2)}%
                              </span>
                              {' • '}
                              <span className="text-blue-400">
                                {formatMarketCap(stats.avgMarketCap)} Avg MCap
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Token List - Always Expanded for Shared View */}
                <div className="space-y-3">
                  {portfolio.rows.length === 0 ? (
                    <div className="text-center py-8 text-white/60">
                      No tokens in this portfolio
                    </div>
                  ) : (
                    portfolio.rows.map((row) => {
                      // Merge metadata, prioritizing valid logoURI from extraMeta over tokenMeta
                      const tokenMetaData = tokenMeta[row.mint] || {};
                      const extraMetaData = extraMeta[row.mint] || {};
                      const meta = {
                        ...tokenMetaData,
                        ...extraMetaData,
                        // Ensure logoURI from extraMeta takes priority if it's valid
                        logoURI: extraMetaData.logoURI || tokenMetaData.logoURI
                      };
                      console.log('🎨 Rendering TokenImage for', row.mint, 'with meta:', meta);
                      console.log('🎨 TokenMeta logoURI:', tokenMetaData.logoURI, 'ExtraMeta logoURI:', extraMetaData.logoURI, 'Final logoURI:', meta.logoURI);
                      return (
                        <div key={row.mint} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                          <div className="flex items-center gap-3">
                            <TokenImage
                              src={meta?.logoURI || undefined}
                              alt={meta?.symbol || "Token"}
                              className="w-12 h-12 rounded-lg"
                              fallbackSrc="/placeholder-token.svg?v=2"
                            />
                            <div>
                              <div className="font-medium text-white">
                                {meta?.symbol || 'Unknown'}
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="text-sm text-white/60">
                                  {meta?.name || row.mint.slice(0, 8) + '...'}
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
                          
                          <div className="text-right">
                            {meta?.marketCap && (
                              <div className="text-blue-400 font-semibold text-sm">
                                {formatMarketCap(meta.marketCap)}
                              </div>
                            )}
                            {meta?.priceChange24h !== undefined && (
                              <div className={`text-xs ${meta.priceChange24h >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                {meta.priceChange24h >= 0 ? '+' : ''}{meta.priceChange24h.toFixed(2)}%
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })
        )}

        {/* Footer */}
        <div className="text-center mt-8">
          <div className="text-white/60 text-sm">
            Portfolio shared via <span className="text-white font-semibold">onPort</span>
          </div>
        </div>
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
            window.location.href = `/${username}`;
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
            window.location.href = `/${username}`;
          }}
          onSwitchToSignIn={() => {
            setShowAccountModal(false);
            setShowSignInModal(true);
          }}
        />
      )}
    </div>
  );
}
