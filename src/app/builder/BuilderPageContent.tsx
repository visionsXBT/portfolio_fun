"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";
import { PublicKey } from "@solana/web3.js";
import Logo from "@/components/Logo";
import AccountModal from "@/components/AccountModal";
import SignInModal from "@/components/SignInModal";
import TokenImage from "@/components/TokenImage";
import ShareModal from "@/components/ShareModal";

type PortfolioRow = {
  mint: string;
};

type Portfolio = {
  id: string;
  name: string;
  rows: PortfolioRow[];
  isExpanded: boolean;
};

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

function isValidTokenAddress(value: string): boolean {
  return isValidMint(value) || isValidBNBAddress(value);
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
  
  // Try to extract BNB address from text
  const bnbRe = /0x[a-fA-F0-9]{40}/g;
  const bnbMatches = trimmed.match(bnbRe);
  if (bnbMatches) {
    for (const match of bnbMatches) {
      if (isValidBNBAddress(match)) return match;
    }
  }
  
  return null;
}

function formatMarketCap(marketCap: number): string {
  if (marketCap >= 1e9) {
    return `${(marketCap / 1e9).toFixed(1)}B`;
  } else if (marketCap >= 1e6) {
    return `${(marketCap / 1e6).toFixed(1)}M`;
  } else if (marketCap >= 1e3) {
    return `${(marketCap / 1e3).toFixed(1)}K`;
  } else {
    return marketCap.toFixed(0);
  }
}

function encodePortfolios(portfolios: Portfolio[]): string {
  const data = portfolios.map((p) => ({
    id: p.id,
    name: p.name,
    rows: p.rows.map((r) => ({ mint: r.mint })),
  }));
  const json = JSON.stringify(data);
  const encoder = new TextEncoder();
  const bytes = encoder.encode(json);
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

function decodePortfolios(encoded: string | null): Portfolio[] | null {
  if (!encoded) return null;
  try {
    const padded = encoded.replace(/-/g, "+").replace(/_/g, "/");
    const paddedWithEquals = padded + "=".repeat((4 - (padded.length % 4)) % 4);
    const binaryString = atob(paddedWithEquals);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const decoder = new TextDecoder();
    const json = decoder.decode(bytes);
    const data = JSON.parse(json);
    return data.map((r: Portfolio) => ({
      id: r.id,
      name: r.name,
      rows: r.rows.filter((row: PortfolioRow) => isValidTokenAddress(row.mint)),
      isExpanded: false,
    }));
  } catch {
    return null;
  }
}

export default function BuilderPageContent() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [portfolioInputs, setPortfolioInputs] = useState<Record<string, string>>({});
  const [editingPortfolioId, setEditingPortfolioId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [priceChanges24h, setPriceChanges24h] = useState<Record<string, number>>({});
  const [marketCaps, setMarketCaps] = useState<Record<string, number>>({});
  const [tokenMeta, setTokenMeta] = useState<Record<string, { symbol?: string; name?: string; logoURI?: string | null; marketCap?: number; price?: number; priceChange24h?: number }>>({});
  const [extraMeta, setExtraMeta] = useState<Record<string, { symbol?: string; name?: string; logoURI?: string | null; marketCap?: number; price?: number; priceChange24h?: number }>>({});
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [showSignInModal, setShowSignInModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [selectedPortfolioForShare, setSelectedPortfolioForShare] = useState<Portfolio | null>(null);
  const [userAccount, setUserAccount] = useState<{ 
    username?: string; 
    walletAddress?: string;
    id: string; 
    accountType: 'email' | 'wallet';
  } | null>(null);
  const [isSharedPortfolio, setIsSharedPortfolio] = useState(false);
  const [hasLoadedUserPortfolios, setHasLoadedUserPortfolios] = useState(false);

  // Load user account and portfolios from localStorage on page load (run first)
  useEffect(() => {
    const savedUserAccount = localStorage.getItem('userAccount');
    if (savedUserAccount) {
      try {
        const userData = JSON.parse(savedUserAccount);
        console.log('👤 Loading user from localStorage:', userData.username);
        setUserAccount(userData);
        
        // Load portfolios from database
        const loadPortfolios = async () => {
          try {
            console.log('📂 Loading portfolios for user:', userData.id);
            const response = await fetch(`/api/user/${userData.id}/portfolios`);
            if (response.ok) {
              const userPortfolios = await response.json();
              if (userPortfolios.portfolios && userPortfolios.portfolios.length > 0) {
                console.log('📂 Loaded portfolios from database:', userPortfolios.portfolios.length);
                setPortfolios(userPortfolios.portfolios);
                
                // Trigger individual metadata fetching for tokens without logoURI
                const allMints: string[] = userPortfolios.portfolios.flatMap((p: Portfolio) => p.rows.map(r => r.mint));
                const uniqueMints: string[] = [...new Set(allMints)];
                
                // Fetch metadata for each token individually to ensure logoURI is preserved
                uniqueMints.forEach(async (mint: string) => {
                  try {
                    console.log('🔍 Fetching individual metadata for:', mint);
                    const dexResponse = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${mint}`, {
                      signal: AbortSignal.timeout(5000)
                    });
                    const dexData = await dexResponse.json();

                    let symbol = undefined;
                    let name = undefined;
                    
                    if (dexData && dexData.pairs && dexData.pairs.length > 0) {
                      const pair = dexData.pairs[0];
                      symbol = pair.baseToken?.symbol;
                      name = pair.baseToken?.name;
                      console.log('📊 Individual DexScreener metadata:', { symbol, name });
                    }

                    // Fetch image based on token type
                    let logoURI = null;
                    if (isValidMint(mint)) {
                      console.log('🖼️ Fetching Solana token image...');
                      logoURI = await fetchPumpFunImages(mint);
                    } else if (isValidBNBAddress(mint)) {
                      console.log('🖼️ Fetching BNB token image...');
                      logoURI = await fetchBNBTokenImage(mint);
                    }
                    
                    console.log('🖼️ Individual image result:', logoURI);

                    setExtraMeta(prev => {
                      const newMeta = {
                        ...prev,
                        [mint]: {
                          symbol,
                          name,
                          logoURI: logoURI || undefined, // Convert null to undefined to avoid overriding
                        }
                      };
                      console.log('📝 Setting individual extraMeta for', mint, ':', newMeta[mint]);
                      return newMeta;
                    });

                  } catch (error) {
                    console.warn('❌ Failed to fetch individual metadata for', mint, ':', error);
                  }
                });
              } else {
                console.log('📂 No portfolios found in database');
              }
            } else {
              console.log('📂 Failed to load portfolios from database:', response.status);
            }
          } catch (error) {
            console.warn('Failed to load portfolios on page refresh:', error);
          } finally {
            setHasLoadedUserPortfolios(true);
          }
        };
        
        loadPortfolios();
      } catch (error) {
        console.warn('Failed to parse saved user account:', error);
        localStorage.removeItem('userAccount');
        setHasLoadedUserPortfolios(true);
      }
    } else {
      console.log('👤 No saved user account found');
      setHasLoadedUserPortfolios(true);
    }
  }, []);

  // Hydrate from query param if present (only if no user portfolios loaded)
  useEffect(() => {
    if (!hasLoadedUserPortfolios) return;
    
    const encoded = searchParams.get("p");
    if (encoded) {
      const decoded = decodePortfolios(encoded);
      if (decoded) {
        setPortfolios(decoded);
        setIsSharedPortfolio(true); // Mark as shared/read-only
      }
    }
  }, [searchParams, hasLoadedUserPortfolios]);

  const addPortfolio = useCallback(() => {
    // Generate a unique ID based on timestamp to avoid conflicts
    const newId = Date.now().toString();
    setPortfolios((prev) => [
      ...prev,
      { id: newId, name: `Portfolio ${prev.length + 1}`, rows: [], isExpanded: true }
    ]);
  }, []);

  const handleCreateAccount = useCallback((username: string, userId: string) => {
    const userData = { username, id: userId, accountType: 'email' as const };
    setUserAccount(userData);
    localStorage.setItem('userAccount', JSON.stringify(userData));
    setShowAccountModal(false);
    
    // Create first portfolio after account creation
    const newId = "1";
    setPortfolios([{ id: newId, name: `Portfolio ${newId}`, rows: [], isExpanded: true }]);
    setHasLoadedUserPortfolios(true);
  }, []);

  const handleSignIn = useCallback(async (username: string, userId: string) => {
    const userData = { username, id: userId, accountType: 'email' as const };
    setUserAccount(userData);
    localStorage.setItem('userAccount', JSON.stringify(userData));
    setShowSignInModal(false);
    
    // Load user's portfolios from database
    try {
      const response = await fetch(`/api/user/${userId}/portfolios`);
      if (response.ok) {
        const userPortfolios = await response.json();
        if (userPortfolios.portfolios && userPortfolios.portfolios.length > 0) {
          setPortfolios(userPortfolios.portfolios);
        } else {
          // Create first portfolio if none exist
          const newId = "1";
          setPortfolios([{ id: newId, name: `Portfolio ${newId}`, rows: [], isExpanded: true }]);
        }
      } else {
        // Fallback: create default portfolio
        const newId = "1";
        setPortfolios([{ id: newId, name: `Portfolio ${newId}`, rows: [], isExpanded: true }]);
      }
    } catch (error) {
      console.warn('Failed to load portfolios:', error);
      // Fallback: create default portfolio
      const newId = "1";
      setPortfolios([{ id: newId, name: `Portfolio ${newId}`, rows: [], isExpanded: true }]);
    } finally {
      setHasLoadedUserPortfolios(true);
    }
  }, []);

  const handleLogout = useCallback(() => {
    console.log('🚪 Logging out user...');
    // Clear portfolios when user logs out
    setPortfolios([]);
    setPortfolioInputs({});
    setUserAccount(null);
    localStorage.removeItem('userAccount');
    setHasLoadedUserPortfolios(false);
    setIsSharedPortfolio(false);
    console.log('✅ User logged out successfully');
  }, []);

  const handleSharePortfolio = useCallback((portfolio: Portfolio) => {
    setSelectedPortfolioForShare(portfolio);
    setShowShareModal(true);
  }, []);

  const handleCloseShareModal = useCallback(() => {
    setShowShareModal(false);
    setSelectedPortfolioForShare(null);
  }, []);

  const handleCreatePortfolio = useCallback(() => {
    if (!userAccount) {
      setShowSignInModal(true);
    } else {
      // Generate a unique ID based on timestamp to avoid conflicts
      const newId = Date.now().toString();
      setPortfolios((prev) => [
        ...prev,
        { id: newId, name: `Portfolio ${prev.length + 1}`, rows: [], isExpanded: true }
      ]);
    }
  }, [userAccount]);

  const removePortfolio = useCallback((portfolioId: string) => {
    setPortfolios((prev) => prev.filter((p) => p.id !== portfolioId));
  }, []);

  const togglePortfolio = useCallback((portfolioId: string) => {
    setPortfolios((prev) => prev.map((p) => 
      p.id === portfolioId ? { ...p, isExpanded: !p.isExpanded } : p
    ));
  }, []);

  const updatePortfolioName = useCallback((portfolioId: string, name: string) => {
    setPortfolios((prev) => prev.map((p) => 
      p.id === portfolioId ? { ...p, name } : p
    ));
  }, []);

  // Dedicated function for pump.fun image fetching
  const fetchPumpFunImages = useCallback(async (mint: string): Promise<string | null> => {
    console.log('🔍 Trying image sources for Solana token:', mint);
    
    // For pump tokens, just return the URL directly without validation
    if (mint.toLowerCase().includes('pump')) {
      const pumpUrl = `https://images.pump.fun/coin-image/${mint}?variant=600x600`;
      console.log('✅ Returning pump.fun URL directly:', pumpUrl);
      return pumpUrl;
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
          
          console.log('❌ No imageUrl or imageHash in DexScreener response');
        } else {
          console.log('❌ No pairs found in DexScreener response');
        }
      } else {
        console.log('❌ DexScreener request failed:', response.status, response.statusText);
      }
    } catch (error) {
      console.log('❌ DexScreener image failed:', (error as Error).message);
    }
    
    // For non-pump tokens, try a few pump.fun URLs as fallback
    const urls = [
      `https://images.pump.fun/coin-image/${mint}?variant=600x600`,
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
        console.log('📊 URL response:', response.status, response.ok);
        
        if (response.ok) {
          console.log('✅ Found image from pump.fun URL:', url);
          return url;
        } else {
          console.log('❌ Pump.fun URL not found:', response.status);
        }
      } catch (error) {
        console.log('❌ Pump.fun URL failed:', url, (error as Error).message);
      }
    }
    
    // 3. Try Jupiter token list
    try {
      console.log('🔍 Trying Jupiter token list for image...');
      const response = await fetch('https://token.jup.ag/strict', {
        signal: AbortSignal.timeout(5000)
      });
      
      console.log('📊 Jupiter token list response status:', response.status, response.ok);
      
      if (response.ok) {
        const tokens = await response.json();
        console.log('📊 Jupiter token list loaded, searching for mint:', mint);
        
        const token = tokens.find((t: { address: string }) => t.address === mint);
        console.log('📊 Jupiter token search result:', token ? 'Found' : 'Not found');
        
        if (token?.logoURI) {
          console.log('✅ Found image from Jupiter token list:', token.logoURI);
          return token.logoURI;
        } else {
          console.log('❌ No logoURI in Jupiter token data');
        }
      } else {
        console.log('❌ Jupiter token list request failed:', response.status, response.statusText);
      }
    } catch (error) {
      console.log('❌ Jupiter token list failed:', (error as Error).message);
    }
    
    console.log('❌ No image found for Solana token:', mint);
    return null;
  }, []);

  // Function to fetch BNB token images
  // Function to fetch Four.meme market data
  const fetchFourMemeData = useCallback(async (address: string): Promise<{ marketCap?: number; priceChange24h?: number; price?: number } | null> => {
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
                Program
                Network
                Name
                Address
              }
              Block {
                Date
                Time
                Timestamp
              }
              Interval {
                Time {
                  Start
                  Duration
                  End
                }
              }
              Volume {
                Base
                Quote
                Usd
              }
              marketcap: calculate(expression: "Price_Average_Mean * 1000000000")
              Price {
                Average {
                  Mean
                }
                Ohlc {
                  Close
                  High
                  Low
                  Open
                }
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
      console.log('📊 Four.meme response data:', JSON.stringify(data, null, 2));

      if (data.data?.Trading?.Pairs && data.data.Trading.Pairs.length > 0) {
        const pair = data.data.Trading.Pairs[0];
        const result = {
          marketCap: pair.marketcap,
          price: pair.Price?.Average?.Mean,
          priceChange24h: undefined // Four.meme doesn't provide 24h change in this query
        };
        
        console.log('✅ Found Four.meme data:', result);
        return result;
      } else {
        console.log('❌ No Four.meme data found for address:', address);
        return null;
      }
    } catch (error) {
      console.log('❌ Four.meme data fetch failed:', (error as Error).message);
      return null;
    }
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
          console.log('🔄 Trying Four.meme URL:', pageUrl);
          
          const response = await fetch(pageUrl, {
            signal: AbortSignal.timeout(10000),
            headers: {
              'User-Agent': 'Mozilla/5.0 (compatible; onPort/1.0)',
              'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            }
          });
          
          if (response.ok) {
            const html = await response.text();
            console.log('📄 Four.meme page loaded, parsing HTML...');
            
            // Look for image URL patterns in the HTML
            const imagePatterns = [
              // Pattern 1: Direct static.four.meme URLs
              /https:\/\/static\.four\.meme\/market\/([a-f0-9-]+\.png)/gi,
              // Pattern 2: Encoded URLs in _next/image
              /https%3A%2F%2Fstatic\.four\.meme%2Fmarket%2F([a-f0-9-]+\.png)/gi,
              // Pattern 3: Background images
              /background-image:\s*url\(['"]?https:\/\/static\.four\.meme\/market\/([a-f0-9-]+\.png)['"]?\)/gi,
              // Pattern 4: Data attributes
              /data-src=['"]https:\/\/static\.four\.meme\/market\/([a-f0-9-]+\.png)['"]/gi,
              // Pattern 5: Src attributes
              /src=['"]https:\/\/static\.four\.meme\/market\/([a-f0-9-]+\.png)['"]/gi
            ];
            
            for (const pattern of imagePatterns) {
              const matches = html.match(pattern);
              if (matches && matches.length > 0) {
                // Extract the UUID from the first match
                const fullMatch = matches[0];
                const uuidMatch = fullMatch.match(/([a-f0-9-]+\.png)/i);
                
                if (uuidMatch) {
                  const uuid = uuidMatch[1];
                  const imageUrl = `https://four.meme/_next/image?url=https%3A%2F%2Fstatic.four.meme%2Fmarket%2F${uuid}&w=48&q=75`;
                  console.log('✅ Found Four.meme image UUID:', uuid);
                  console.log('✅ Generated Four.meme image URL:', imageUrl);
                  return imageUrl;
                }
              }
            }
            
            console.log('❌ No image UUID found in Four.meme HTML');
          } else {
            console.log('❌ Four.meme page not found:', response.status, response.statusText);
          }
        } catch (error) {
          console.log('❌ Four.meme page fetch failed:', pageUrl, (error as Error).message);
        }
      }
      
      console.log('❌ All Four.meme URL patterns failed');
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

  const addRow = useCallback(async (portfolioId: string) => {
    const inputValue = portfolioInputs[portfolioId] || "";
    const mint = extractMintFromInput(inputValue);
    if (!mint) return;

    console.log('➕ Adding token with mint:', mint);

    // Check if token already exists in this portfolio
    const portfolio = portfolios.find(p => p.id === portfolioId);
    if (portfolio && portfolio.rows.some(row => row.mint === mint)) {
      alert("This token has been added to this portfolio already.");
      return;
    }

    // Add the token immediately
    setPortfolios((prev) => prev.map((p) =>
      p.id === portfolioId
        ? { ...p, rows: [...p.rows, { mint }] }
        : p
    ));

    // Fetch metadata from DexScreener and image from pump.fun separately
    try {
      console.log('🔍 Fetching metadata from DexScreener...');
      const dexResponse = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${mint}`, {
        signal: AbortSignal.timeout(5000)
      });
      const dexData = await dexResponse.json();

      let symbol = undefined;
      let name = undefined;
      let fourMemeData = undefined; // Declare here for BNB price data
      
      if (dexData && dexData.pairs && dexData.pairs.length > 0) {
        const pair = dexData.pairs[0];
        symbol = pair.baseToken?.symbol;
        name = pair.baseToken?.name;
        console.log('📊 DexScreener metadata:', { symbol, name });
        
        // Extract price and market cap data from DexScreener for BNB tokens
        if (isValidBNBAddress(mint)) {
          const dexPrice = parseFloat(pair.priceUsd);
          const dexPriceChange = parseFloat(pair.priceChange?.h24);
          const dexMarketCap = parseFloat(pair.marketCap);
          
          if (dexPrice || dexPriceChange || dexMarketCap) {
            console.log('💰 DexScreener price data:', { 
              price: dexPrice, 
              priceChange24h: dexPriceChange, 
              marketCap: dexMarketCap 
            });
            
            // Store DexScreener price data for later use
            fourMemeData = {
              price: dexPrice || undefined,
              priceChange24h: dexPriceChange || undefined,
              marketCap: dexMarketCap || undefined
            };
          }
        }
      } else {
        console.log('❌ No DexScreener metadata found');
        
        // Try CoinGecko as fallback for BNB tokens
        if (isValidBNBAddress(mint)) {
          try {
            console.log('🔄 Trying CoinGecko for BNB token metadata...');
            const coinGeckoResponse = await fetch(`https://api.coingecko.com/api/v3/coins/binance-smart-chain/contract/${mint.toLowerCase()}`, {
              signal: AbortSignal.timeout(5000)
            });
            
            if (coinGeckoResponse.ok) {
              const coinGeckoData = await coinGeckoResponse.json();
              symbol = coinGeckoData.symbol?.toUpperCase();
              name = coinGeckoData.name;
              console.log('📊 CoinGecko metadata:', { symbol, name });
              
              // Extract price data from CoinGecko as well
              if (coinGeckoData.market_data) {
                const cgPrice = coinGeckoData.market_data.current_price?.usd;
                const cgPriceChange = coinGeckoData.market_data.price_change_percentage_24h;
                const cgMarketCap = coinGeckoData.market_data.market_cap?.usd;
                
                if (cgPrice || cgPriceChange || cgMarketCap) {
                  console.log('💰 CoinGecko price data:', { 
                    price: cgPrice, 
                    priceChange24h: cgPriceChange, 
                    marketCap: cgMarketCap 
                  });
                  
                  fourMemeData = {
                    price: cgPrice || undefined,
                    priceChange24h: cgPriceChange || undefined,
                    marketCap: cgMarketCap || undefined
                  };
                }
              }
            }
          } catch (error) {
            console.log('❌ CoinGecko metadata failed:', (error as Error).message);
          }
        }
      }

      // Fetch image and market data based on token type
      let logoURI = null;
      // fourMemeData is already declared above if DexScreener/CoinGecko provided data
      
      if (isValidMint(mint)) {
        // Solana token - try pump.fun for images
        console.log('🖼️ Fetching Solana token image from pump.fun...');
        logoURI = await fetchPumpFunImages(mint);
      } else if (isValidBNBAddress(mint)) {
        // BNB token - try BNB-specific sources and Four.meme data
        console.log('🖼️ Fetching BNB token image...');
        logoURI = await fetchBNBTokenImage(mint);
        
        // Only try Four.meme if we don't already have price data from DexScreener/CoinGecko
        if (!fourMemeData) {
          console.log('💰 Fetching Four.meme market data...');
          const fourMemeResult = await fetchFourMemeData(mint);
          if (fourMemeResult) {
            fourMemeData = fourMemeResult;
          }
        } else {
          console.log('💰 Using DexScreener/CoinGecko price data (skipping Four.meme)');
        }
      }
      
      console.log('🖼️ Image result:', logoURI);
      console.log('💰 Four.meme data result:', fourMemeData);

      setExtraMeta(prev => {
        const newMeta = {
          ...prev,
          [mint]: {
            symbol,
            name,
            logoURI: logoURI || undefined, // Convert null to undefined to avoid overriding
            // Include Four.meme market data if available
            ...(fourMemeData && {
              marketCap: fourMemeData.marketCap,
              price: fourMemeData.price,
              priceChange24h: fourMemeData.priceChange24h
            })
          }
        };
        console.log('📝 Setting extraMeta for', mint, ':', newMeta[mint]);
        return newMeta;
      });

    } catch (error) {
      console.warn('❌ Failed to fetch metadata:', error);
      // Still try to fetch image even if DexScreener fails
      try {
        let logoURI = null;
        if (isValidMint(mint)) {
          console.log('🖼️ Trying pump.fun image as fallback...');
          logoURI = await fetchPumpFunImages(mint);
        } else if (isValidBNBAddress(mint)) {
          console.log('🖼️ Trying BNB token image as fallback...');
          logoURI = await fetchBNBTokenImage(mint);
        }
        
        setExtraMeta(prev => {
          const newMeta = {
            ...prev,
            [mint]: {
              symbol: undefined,
              name: undefined,
              logoURI: logoURI || undefined, // Convert null to undefined
            }
          };
          console.log('📝 Setting extraMeta (fallback) for', mint, ':', newMeta[mint]);
          return newMeta;
        });
      } catch (imageError) {
        console.warn('❌ Image fetch also failed:', imageError);
        // Set empty metadata as last resort
        setExtraMeta(prev => {
          const newMeta = {
            ...prev,
            [mint]: {
              symbol: undefined,
              name: undefined,
              logoURI: undefined, // Use undefined instead of null
            }
          };
          console.log('📝 Setting empty extraMeta for', mint, ':', newMeta[mint]);
          return newMeta;
        });
      }
    }

    setPortfolioInputs(prev => ({ ...prev, [portfolioId]: "" }));
  }, [portfolioInputs, fetchPumpFunImages, fetchBNBTokenImage, portfolios]);

  const removeRow = useCallback((portfolioId: string, mint: string) => {
    setPortfolios((prev) => prev.map((p) => 
      p.id === portfolioId 
        ? { ...p, rows: p.rows.filter((r) => r.mint !== mint) }
        : p
    ));
  }, []);

  const copyShare = useCallback(() => {
    const encoded = encodePortfolios(portfolios);
    const url = `${window.location.origin}${pathname}?p=${encoded}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [portfolios, pathname]);

  // Fetch token metadata and prices
  useEffect(() => {
    // Don't run bulk metadata fetch until user portfolios are loaded
    if (!hasLoadedUserPortfolios) {
      console.log('⏳ Skipping bulk metadata fetch - user portfolios not loaded yet');
      return;
    }

    const allMints = portfolios.flatMap(p => p.rows.map(r => r.mint));
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

    // Fetch Jupiter prices (disabled due to DNS issues)
    // const idsParam = uniqueMints.join(",");
    // fetch(`https://price.jup.ag/v6/price?ids=${idsParam}`, { signal: controller.signal })
    //   .then((r) => r.json())
    //   .then((data) => {
    //     const nextPrices: Record<string, number> = {};
    //     if (data && data.data) {
    //       for (const mint of uniqueMints) {
    //         const entry = data.data[mint];
    //         if (entry && typeof entry.price === "number") {
    //           nextPrices[mint] = entry.price;
    //           // Jupiter doesn't provide 24h change, so we'll use DexScreener for that
    //         }
    //       }
    //     }
    //     setPrices(nextPrices);
    //   })
    //   .catch(() => {});

    // Skip Jupiter price API for now due to DNS issues
    console.log('⚠️ Skipping Jupiter price API due to DNS issues');

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
                  // Include price data for BNB tokens
                  ...(isValidBNBAddress(mint) && {
                    price: dexPrice || undefined,
                    priceChange24h: dexPriceChange || undefined,
                    marketCap: dexMarketCap || undefined
                  }),
                  // Don't set logoURI here - let individual fetch handle it
                };
                console.log('📝 Adding new token to bulk metadata (with price data):', mint, nextExtraMeta[mint]);
                
                // Note: Individual fetch will handle pump.fun images
              } else {
                console.log('⏭️ Skipping token in bulk fetch (already exists):', mint, {
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
            existing: Object.keys(prev).length, 
            new: Object.keys(nextExtraMeta).length,
            merged: Object.keys(merged).length,
            existingKeys: Object.keys(prev),
            newKeys: Object.keys(nextExtraMeta)
          });
          return merged;
        });
      })
      .catch(() => {});

    return () => controller.abort();
  }, [portfolios, tokenMeta, extraMeta, fetchPumpFunImages, fetchBNBTokenImage, scrapeFourMemeImage, hasLoadedUserPortfolios]);

  // Save portfolios to database when they change
  useEffect(() => {
    if (userAccount) {
      const savePortfolios = async () => {
        try {
          await fetch(`/api/user/${userAccount.id}/portfolios`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ portfolios })
          });
          console.log('✅ Portfolios saved to database:', portfolios.length);
        } catch (error) {
          console.warn('Failed to save portfolios:', error);
        }
      };
      
      // Debounce saves to avoid too many API calls
      const timeoutId = setTimeout(savePortfolios, 1000);
      return () => clearTimeout(timeoutId);
    }
  }, [portfolios, userAccount]);


  const portfolioStats = useMemo(() => {
    return portfolios.map(portfolio => {
      const portfolioMints = portfolio.rows.map(r => r.mint);
      
      // Calculate average change using both priceChanges24h and extraMeta
      const portfolioChanges = portfolioMints.map(mint => {
        const meta = extraMeta[mint] || tokenMeta[mint];
        return meta?.priceChange24h || priceChanges24h[mint] || 0;
      });
      const avgChange = portfolioChanges.length > 0 
        ? portfolioChanges.reduce((sum, change) => sum + change, 0) / portfolioChanges.length 
        : 0;
      
      // Calculate average market cap using both marketCaps and extraMeta
      const portfolioMarketCaps = portfolioMints.map(mint => {
        const meta = extraMeta[mint] || tokenMeta[mint];
        return meta?.marketCap || marketCaps[mint] || 0;
      });
      const avgMarketCap = portfolioMarketCaps.length > 0 
        ? portfolioMarketCaps.reduce((sum, marketCap) => sum + marketCap, 0) / portfolioMarketCaps.length 
        : 0;
      
      return {
        portfolio,
        value: 0, // No longer calculating portfolio value since we removed prices
        change24h: avgChange,
        avgMarketCap: avgMarketCap
      };
    });
  }, [portfolios, priceChanges24h, marketCaps, extraMeta, tokenMeta]);

  return (
    <div className="min-h-screen p-6 sm:p-8 md:p-12 pb-16" style={{ fontFamily: 'Golos Text, sans-serif' }}>
      <div className="mx-auto w-full max-w-6xl">
        {/* Header with Logo */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <Logo />
            <div className="flex items-center gap-4">
              {userAccount && (
                <div className="flex items-center gap-3">
                  <span className="text-sm text-white/60">
                    {userAccount.accountType === 'wallet' 
                      ? `Wallet: ${userAccount.walletAddress?.slice(0, 6)}...${userAccount.walletAddress?.slice(-4)}`
                      : `Welcome, ${userAccount.username}`
                    }
                  </span>
                  <button
                    onClick={handleLogout}
                    className="text-sm text-white/40 hover:text-white/60 transition-colors"
                    title="Sign out"
                  >
                    Sign out
                  </button>
                </div>
              )}
              <Link href="/" className="text-sm text-white/60 hover:text-white">← Home </Link>
            </div>
          </div>
          <h1 className="text-3xl font-semibold mb-2">
            {isSharedPortfolio ? "Shared Portfolio" : "Build your Bags!"}
          </h1>
          <p className="text-white/60">
            {isSharedPortfolio 
              ? "Viewing a shared portfolio. Sign in to create and edit your own portfolios."
              : "Create multiple portfolios. Click on a portfolio to expand and add tokens."
            }
          </p>
        </div>

        {portfolios.length === 0 ? (
          <div className="text-center py-16">
            <div className="mb-8">
              <h2 className="text-2xl font-semibold text-white mb-4">
                {userAccount ? "No portfolios yet" : "Welcome to Portfolio Builder"}
              </h2>
              <p className="text-white/60 mb-8">
                {userAccount 
                  ? "Create your first portfolio to start building and sharing your token collections."
                  : "Sign in to access your existing portfolios or create a new account to get started."
                }
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                {!userAccount ? (
                  <>
                    <button
                      onClick={() => setShowSignInModal(true)}
                      className="rounded-lg bg-[var(--brand-end)] hover:bg-[var(--brand-start)] px-8 py-4 text-lg font-medium text-white transition-colors"
                    >
                      Sign In
                    </button>
                    <button
                      onClick={() => setShowAccountModal(true)}
                      className="rounded-lg border border-white/20 bg-white/5 hover:bg-white/10 px-8 py-4 text-lg font-medium text-white transition-colors"
                    >
                      Create Account
                    </button>
                  </>
                ) : (
                  <button
                    onClick={handleCreatePortfolio}
                    className="rounded-lg bg-[var(--brand-end)] hover:bg-[var(--brand-start)] px-8 py-4 text-lg font-medium text-white transition-colors"
                  >
                    Create Portfolio
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {portfolios.map((portfolio) => {
              const stats = portfolioStats.find(s => s.portfolio.id === portfolio.id);
              const visibleTokens = portfolio.rows.slice(0, 4);
              const hiddenCount = portfolio.rows.length - 4;
              
              return (
                <div key={portfolio.id} className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6">
                  {/* Portfolio Header */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-4 flex-1">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => togglePortfolio(portfolio.id)}
                          className="text-white/60 hover:text-white transition-colors"
                        >
                          {portfolio.isExpanded ? "▼" : "▶"}
                        </button>
                        
                        {editingPortfolioId === portfolio.id && !isSharedPortfolio ? (
                          <input
                            type="text"
                            value={portfolio.name}
                            onChange={(e) => updatePortfolioName(portfolio.id, e.target.value)}
                            onBlur={() => setEditingPortfolioId(null)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") setEditingPortfolioId(null);
                            }}
                            className="bg-transparent border-none outline-none text-white font-medium text-lg"
                            autoFocus
                          />
                        ) : (
                          <h3 className="text-lg font-medium text-white">{portfolio.name}</h3>
                        )}
                        
                        {!isSharedPortfolio && (
                          <button
                            onClick={() => setEditingPortfolioId(portfolio.id)}
                            className="text-white/40 hover:text-white/60 transition-colors"
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                              <path d="m18.5 2.5 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                            </svg>
                          </button>
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
                                ${formatMarketCap(stats.avgMarketCap)}
                              </span>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      {/* Token Images */}
                      <div className="flex items-center gap-1">
                        {visibleTokens.map((row) => {
                          const meta = extraMeta[row.mint] || tokenMeta[row.mint];
                          console.log('🖼️ Rendering TokenImage for', row.mint, 'with meta:', meta);
                          return (
                            <div key={row.mint} className="relative group">
                              <TokenImage
                                src={meta?.logoURI || undefined}
                                alt={meta?.symbol || "Token"}
                                className="w-8 h-8 rounded-lg border border-white/20"
                                fallbackSrc="/placeholder-token.svg"
                              />
                              {!isSharedPortfolio && (
                                <button
                                  onClick={() => removeRow(portfolio.id, row.mint)}
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
                      
                      {!isSharedPortfolio && (
                        <button
                          onClick={() => handleSharePortfolio(portfolio)}
                          className="text-white/60 hover:text-white transition-colors"
                          title="Share this portfolio"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
                            <polyline points="16,6 12,2 8,6"/>
                            <line x1="12" y1="2" x2="12" y2="15"/>
                          </svg>
                        </button>
                      )}
                      
                      {!isSharedPortfolio && (
                        <button
                          onClick={() => removePortfolio(portfolio.id)}
                          className="text-red-400 hover:text-red-300 transition-colors"
                          title="Delete portfolio"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Portfolio Content */}
                  {portfolio.isExpanded && (
                    <div className="space-y-4">
                      {/* Add Token Input */}
                      {!isSharedPortfolio && (
                        <div className="flex gap-3">
                          <input
                            type="text"
                            value={portfolioInputs[portfolio.id] || ""}
                            onChange={(e) => setPortfolioInputs(prev => ({ ...prev, [portfolio.id]: e.target.value }))}
                            placeholder="Paste Solana or BNB token contract address..."
                            className="flex-1 rounded-md border border-white/20 bg-white/5 text-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--brand-end)]"
                            onKeyDown={(e) => {
                              if (e.key === "Enter") addRow(portfolio.id);
                            }}
                          />
                          <button
                            onClick={() => addRow(portfolio.id)}
                            disabled={!extractMintFromInput(portfolioInputs[portfolio.id] || "")}
                            className="rounded-md bg-[var(--brand-end)] hover:bg-[var(--brand-start)] px-4 py-2 text-sm text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Add Token
                          </button>
                        </div>
                      )}

                      {/* Token List */}
                      {portfolio.rows.length > 0 && (
                        <div className="space-y-2">
                          {portfolio.rows.map((row) => {
                            const meta = extraMeta[row.mint] || tokenMeta[row.mint];
                            const change24h = meta?.priceChange24h || priceChanges24h[row.mint];
                            const marketCap = meta?.marketCap || marketCaps[row.mint];
                            
                            return (
                              <div key={row.mint} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                                <div className="flex items-center gap-3">
                                  <TokenImage
                                    src={meta?.logoURI || undefined}
                                    alt={meta?.symbol || "Token"}
                                    className="w-8 h-8 rounded-lg"
                                    fallbackSrc="/placeholder-token.svg"
                                  />
                                  <div>
                                    <div className="font-medium text-white">
                                      {meta?.symbol || "Unknown"}
                                    </div>
                                    <div className="text-sm text-white/60">
                                      {meta?.name || row.mint.slice(0, 8) + "..."}
                                    </div>
                                  </div>
                                </div>
                                
                                <div className="flex items-center gap-4">
                                  <div className="text-right">
                                    {typeof change24h === "number" && (
                                      <div className={`text-sm ${change24h >= 0 ? "text-green-400" : "text-red-400"}`}>
                                        {change24h >= 0 ? "+" : ""}{change24h.toFixed(2)}%
                                      </div>
                                    )}
                                    {marketCap && marketCap > 0 && (
                                      <div className="text-sm text-blue-400">
                                        ${formatMarketCap(marketCap)}
                                      </div>
                                    )}
                                  </div>
                                  
                                  {!isSharedPortfolio && (
                                    <button
                                      onClick={() => removeRow(portfolio.id, row.mint)}
                                      className="text-red-400 hover:text-red-300 transition-colors"
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
                  )}
                </div>
              );
            })}
          </div>
        )}

        {portfolios.length > 0 && !isSharedPortfolio && (
          <div className="flex gap-4 mt-8">
            <button
              onClick={addPortfolio}
              className="rounded-md border border-white/20 bg-white/5 text-white px-6 py-3 text-sm hover:bg-white/10"
            >
              + Add Portfolio
            </button>
            <button
              onClick={copyShare}
              className="rounded-md bg-[var(--brand-end)] hover:bg-[var(--brand-start)] px-6 py-3 text-sm text-white"
            >
              {copied ? "Copied!" : "Copy all portfolios"}
            </button>
          </div>
        )}

      </div>

      <AccountModal
        isOpen={showAccountModal}
        onClose={() => setShowAccountModal(false)}
        onSuccess={handleCreateAccount}
        onSwitchToSignIn={() => {
          setShowAccountModal(false);
          setShowSignInModal(true);
        }}
      />

      <SignInModal
        isOpen={showSignInModal}
        onClose={() => setShowSignInModal(false)}
        onSuccess={handleSignIn}
        onSwitchToSignUp={() => {
          setShowSignInModal(false);
          setShowAccountModal(true);
        }}
      />

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
        />
      )}
    </div>
  );
}
