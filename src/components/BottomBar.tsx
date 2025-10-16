"use client";

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';

interface PriceData {
  price: number;
  change24h: number;
}

export default function BottomBar() {
  const [solPrice, setSolPrice] = useState<PriceData | null>(null);
  const [bnbPrice, setBnbPrice] = useState<PriceData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchPrices = useCallback(async () => {
    setIsLoading(true);
    try {
      // Fetch SOL and BNB prices through our proxy
      const response = await fetch('/api/price-proxy?ids=solana,binancecoin&vs_currencies=usd&include_24hr_change=true');
      const data = await response.json();
      
      if (data.solana) {
        setSolPrice({
          price: data.solana.usd,
          change24h: data.solana.usd_24h_change,
        });
      }

      if (data.binancecoin) {
        setBnbPrice({
          price: data.binancecoin.usd,
          change24h: data.binancecoin.usd_24h_change,
        });
      }
    } catch (error) {
      console.error('Failed to fetch real-time prices:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPrices(); // Initial fetch
    const interval = setInterval(fetchPrices, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [fetchPrices]);

  const formatPrice = (price: number) => {
    if (price < 0.01) {
      return `$${price.toFixed(4)}`;
    }
    return `$${price.toFixed(2)}`;
  };

  const formatChange = (change: number) => {
    const sign = change >= 0 ? '+' : '';
    return `${sign}${change.toFixed(2)}%`;
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white/5 backdrop-blur-sm border-t border-white/10 z-50">
      <div className="max-w-7xl mx-auto px-4 py-2"> {/* py-2 for thinner bar */}
        <div className="flex items-center justify-between">
          {/* Left side - LED indicators with logos */}
          <div className="flex items-center gap-3">
            {/* Pump.fun LED */}
            <div className="flex items-center gap-1.5">
              <div className="relative">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse shadow-lg shadow-green-400/50"></div>
                <div className="absolute inset-0 w-2 h-2 bg-green-400 rounded-full animate-ping opacity-75"></div>
              </div>
              <Image
                src="/pump-logo.png"
                alt="Pump.fun"
                width={16} // Smaller logo
                height={16} // Smaller logo
                className="w-4 h-4"
              />
            </div>
            
            {/* Four LED */}
            <div className="flex items-center gap-1.5">
              <div className="relative">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse shadow-lg shadow-green-400/50"></div>
                <div className="absolute inset-0 w-2 h-2 bg-green-400 rounded-full animate-ping opacity-75"></div>
              </div>
              <Image
                src="/four-logo.png"
                alt="Four"
                width={16} // Smaller logo
                height={16} // Smaller logo
                className="w-4 h-4"
              />
            </div>
          </div>

          {/* Right side - SOL and BNB prices */}
          <div className="flex items-center gap-4">
            {/* SOL Price */}
            <div className="flex items-center gap-1.5">
              <Image
                src="/sol-logo.png"
                alt="Solana"
                width={16} // Smaller logo
                height={16} // Smaller logo
                className="w-4 h-4"
              />
              <div className="text-right">
                <div className="text-white font-medium text-xs"> {/* Smaller text */}
                  {isLoading ? '...' : solPrice ? formatPrice(solPrice.price) : 'N/A'}
                </div>
                {solPrice && (
                  <div className={`text-[10px] ${solPrice.change24h >= 0 ? 'text-green-400' : 'text-red-400'}`}> {/* Smaller text */}
                    {formatChange(solPrice.change24h)}
                  </div>
                )}
              </div>
            </div>

            {/* BNB Price */}
            <div className="flex items-center gap-1.5">
              <Image
                src="/bnb logo.png"
                alt="BNB"
                width={16} // Smaller logo
                height={16} // Smaller logo
                className="w-4 h-4"
              />
              <div className="text-right">
                <div className="text-white font-medium text-xs"> {/* Smaller text */}
                  {isLoading ? '...' : bnbPrice ? formatPrice(bnbPrice.price) : 'N/A'}
                </div>
                {bnbPrice && (
                  <div className={`text-[10px] ${bnbPrice.change24h >= 0 ? 'text-green-400' : 'text-red-400'}`}> {/* Smaller text */}
                    {formatChange(bnbPrice.change24h)}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
