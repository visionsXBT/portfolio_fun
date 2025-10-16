"use client";

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import TokenImage from '@/components/TokenImage';

interface PortfolioRow {
  mint: string;
}

interface Portfolio {
  id: string;
  name: string;
  rows: PortfolioRow[];
}

interface TokenMeta {
  symbol?: string;
  name?: string;
  logoURI?: string | null;
  marketCap?: number;
  price?: number;
  priceChange24h?: number;
}

export default function PublicPortfolioView() {
  const params = useParams();
  const portfolioId = params?.id as string;
  
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [tokenMeta, setTokenMeta] = useState<Record<string, TokenMeta>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!portfolioId) return;

    const loadPortfolio = async () => {
      try {
        // Try to load from localStorage first (for shared portfolios)
        const sharedPortfolios = localStorage.getItem('sharedPortfolios');
        if (sharedPortfolios) {
          const portfolios = JSON.parse(sharedPortfolios);
          const foundPortfolio = portfolios.find((p: Portfolio) => p.id === portfolioId);
          if (foundPortfolio) {
            setPortfolio(foundPortfolio);
            await fetchTokenMetadata(foundPortfolio.rows.map((r: PortfolioRow) => r.mint));
            setIsLoading(false);
            return;
          }
        }

        // If not found in localStorage, try to fetch from API
        const response = await fetch(`/api/portfolio/${portfolioId}`);
        if (response.ok) {
          const portfolioData = await response.json();
          setPortfolio(portfolioData);
          await fetchTokenMetadata(portfolioData.rows.map((r: PortfolioRow) => r.mint));
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
  }, [portfolioId]);

  const fetchTokenMetadata = async (mints: string[]) => {
    try {
      // Fetch metadata from DexScreener
      const dexScreenerIds = mints.join(",");
      const response = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${dexScreenerIds}`);
      
      if (response.ok) {
        const data = await response.json();
        const meta: Record<string, TokenMeta> = {};
        
        if (data.pairs) {
          for (const pair of data.pairs) {
            const mint = pair.baseToken?.address;
            if (mint && mints.includes(mint)) {
              meta[mint] = {
                symbol: pair.baseToken?.symbol,
                name: pair.baseToken?.name,
                marketCap: parseFloat(pair.marketCap),
                priceChange24h: parseFloat(pair.priceChange?.h24)
              };
            }
          }
        }
        
        setTokenMeta(meta);
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading portfolio...</div>
      </div>
    );
  }

  if (error || !portfolio) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-white text-xl mb-4">Portfolio Not Found</div>
          <div className="text-white/60">The portfolio you&apos;re looking for doesn&apos;t exist or has been removed.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">{portfolio.name}</h1>
          <p className="text-white/60">Public Portfolio View</p>
        </div>

        {/* Portfolio Stats */}
        <div className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 p-6 mb-8">
          <div className="grid grid-cols-3 gap-6 text-center">
            <div>
              <div className="text-white/60 text-sm mb-1">Tokens</div>
              <div className="text-2xl font-bold text-white">{portfolio.rows.length}</div>
            </div>
            <div>
              <div className="text-white/60 text-sm mb-1">Average Market Cap</div>
              <div className="text-2xl font-bold text-blue-400">
                {portfolio.rows.length > 0 ? formatMarketCap(
                  portfolio.rows.reduce((sum, row) => {
                    const meta = tokenMeta[row.mint];
                    return sum + (meta?.marketCap || 0);
                  }, 0) / portfolio.rows.length
                ) : 'N/A'}
              </div>
            </div>
            <div>
              <div className="text-white/60 text-sm mb-1">Average 24h Change</div>
              <div className="text-2xl font-bold text-green-400">
                {portfolio.rows.length > 0 ? 
                  `${(portfolio.rows.reduce((sum, row) => {
                    const meta = tokenMeta[row.mint];
                    return sum + (meta?.priceChange24h || 0);
                  }, 0) / portfolio.rows.length).toFixed(2)}%` : 'N/A'}
              </div>
            </div>
          </div>
        </div>

        {/* Token List */}
        <div className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Tokens</h2>
          <div className="space-y-3">
            {portfolio.rows.map((row, index) => {
              const meta = tokenMeta[row.mint];
              return (
                <div key={row.mint} className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center text-white/60 text-sm font-bold">
                      {index + 1}
                    </div>
                    <TokenImage
                      src={meta?.logoURI || undefined}
                      alt={meta?.symbol || "Token"}
                      className="w-10 h-10 rounded-lg"
                      fallbackSrc="/placeholder-token.svg"
                    />
                    <div>
                      <div className="text-white font-semibold">
                        {meta?.symbol || 'Unknown'}
                      </div>
                      <div className="text-white/60 text-sm">
                        {meta?.name || row.mint.slice(0, 8) + '...'}
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    {meta?.marketCap && (
                      <div className="text-blue-400 font-semibold">
                        {formatMarketCap(meta.marketCap)}
                      </div>
                    )}
                    {meta?.priceChange24h !== undefined && (
                      <div className={`text-sm ${meta.priceChange24h >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {meta.priceChange24h >= 0 ? '+' : ''}{meta.priceChange24h.toFixed(2)}%
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-white/60">
          <p>Portfolio shared via onPort</p>
        </div>
      </div>
    </div>
  );
}
