"use client";

import { useState, useEffect } from 'react';
import ShareImageGenerator from './ShareImageGenerator';

interface Portfolio {
  id: string;
  name: string;
  rows: Array<{ mint: string }>;
}

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  portfolio: Portfolio;
  portfolioStats: {
    avgMarketCap: number;
    change24h: number;
  };
  tokenMeta?: Record<string, { symbol?: string; name?: string; logoURI?: string | null }>;
  extraMeta?: Record<string, { symbol?: string; name?: string; logoURI?: string | null }>;
  userId?: string; // Add userId for referral tracking
}

export default function ShareModal({ isOpen, onClose, portfolio, portfolioStats, tokenMeta = {}, extraMeta = {}, userId }: ShareModalProps) {
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [shareLink, setShareLink] = useState<string>('');
  const [isClosing, setIsClosing] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  const generateShareLink = () => {
    // Create a public shareable link using the portfolio ID with referral tracking
    const baseUrl = window.location.origin;
    const shareUrl = userId 
      ? `${baseUrl}/share/${portfolio.id}?ref=${userId}`
      : `${baseUrl}/share/${portfolio.id}`;
    setShareLink(shareUrl);
    return shareUrl;
  };

  const handleImageGenerated = (imageDataUrl: string) => {
    setGeneratedImage(imageDataUrl);
  };

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
      setIsClosing(false);
    }, 300);
  };

  const handleOpen = () => {
    generateShareLink();
  };

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      handleOpen();
    } else {
      setIsVisible(false);
    }
  }, [isOpen, generateShareLink]);

  if (!isOpen) return null;

  // Detect chains used in portfolio
  const detectChains = () => {
    const chains = new Set<string>();
    portfolio.rows.forEach(row => {
      // Check if it's a Solana address (base58, typically 32-44 characters)
      if (row.mint.length >= 32 && row.mint.length <= 44 && !row.mint.startsWith('0x')) {
        chains.add('solana');
      }
      // Check if it's a BNB address (0x format, 42 characters)
      if (row.mint.startsWith('0x') && row.mint.length === 42) {
        chains.add('bnb');
      }
    });
    return Array.from(chains);
  };

  const chains = detectChains();

  return (
    <div 
      className={`fixed inset-0 bg-black/50 flex flex-col items-center justify-center z-50 p-4 transition-all duration-500 ease-out ${
        isClosing ? 'opacity-0' : isVisible ? 'opacity-100' : 'opacity-0'
      }`}
      onClick={handleClose}
    >
      <div 
        className={`flex flex-col items-center gap-6 transition-all duration-500 ease-out ${
          isClosing ? 'translate-y-4 opacity-0 scale-95' : isVisible ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-8 opacity-0 scale-95'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Share Card */}
        <div className="relative w-full max-w-[800px]" style={{ fontFamily: 'Golos Text, sans-serif' }}>
          {/* Base sharing.png image - responsive */}
          <img 
            src="/sharing.png" 
            alt="Share Card" 
            className="w-full h-auto max-w-[800px] max-h-[450px] shadow-2xl object-cover select-none" 
            draggable={false}
            onContextMenu={(e) => {
              e.preventDefault();
              // Allow right-click context menu for copying
            }}
          />
          
          {/* Overlay Content */}
          <div className="absolute inset-0 p-4 sm:p-8 flex flex-col justify-end">
            {/* Main Content - Moved to Bottom */}
            <div className="flex flex-col">
              {/* Token Pictures - Top */}
              <div className="flex gap-2 sm:gap-4 mb-4">
                {portfolio.rows.slice(0, 4).map((row) => {
                  const meta = tokenMeta[row.mint] || extraMeta[row.mint];
                  return (
                    <div key={row.mint} className="w-16 h-16 sm:w-32 sm:h-32 overflow-hidden">
                      <img 
                        src={meta?.logoURI || '/placeholder-token.svg'} 
                        alt={meta?.symbol || 'Token'} 
                        className="w-full h-full object-cover"
                      />
                    </div>
                  );
                })}
                {portfolio.rows.length > 4 && (
                  <div className="w-16 h-16 sm:w-32 sm:h-32 bg-white/20 flex items-center justify-center text-white text-xs sm:text-sm font-bold">
                    +{portfolio.rows.length - 4}
                  </div>
                )}
              </div>

              {/* Text Content - Left Aligned */}
              <div className="text-left">
                {/* Portfolio Name - Responsive Font */}
                <div className="text-white text-lg sm:text-2xl font-bold mb-2 sm:mb-4">
                  {portfolio.name}
                </div>
                
                {/* Statistics */}
                <div className="text-white/90 text-sm sm:text-base mb-1 sm:mb-2">
                  24H change: <span className={`font-semibold ${portfolioStats.change24h >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {portfolioStats.change24h >= 0 ? '+' : ''}{portfolioStats.change24h.toFixed(2)}%
                  </span>
                </div>
                <div className="text-white/90 text-sm sm:text-base mb-2 sm:mb-3">
                  Avg. Mcap: <span className="font-semibold">
                    ${portfolioStats.avgMarketCap >= 1e9 
                      ? `${(portfolioStats.avgMarketCap / 1e9).toFixed(1)}B`
                      : portfolioStats.avgMarketCap >= 1e6 
                      ? `${(portfolioStats.avgMarketCap / 1e6).toFixed(1)}M`
                      : `${(portfolioStats.avgMarketCap / 1e3).toFixed(1)}K`
                    }
                  </span>
                </div>

                {/* Chain Logos */}
                <div className="flex items-center gap-2 sm:gap-3">
                  <span className="text-white/90 text-sm sm:text-base">Chain</span>
                  <div className="flex gap-2 sm:gap-3">
                    {chains.includes('solana') && (
                      <img src="/sol-logo.png" alt="Solana" className="w-5 h-5 sm:w-6 sm:h-6" />
                    )}
                    {chains.includes('bnb') && (
                      <img src="/bnb logo.png" alt="BNB" className="w-5 h-5 sm:w-6 sm:h-6" />
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* External Action Buttons - Below Share Card, Right Justified */}
        <div className="flex flex-col sm:flex-row gap-3 justify-end w-full max-w-[800px]">
          <div className="text-center sm:text-right">
            <p className="text-white/80 text-sm sm:text-base mb-2">
              Flex your bags! Screenshot this and share it to the world.
            </p>
          </div>
          <button
            onClick={() => {
              navigator.clipboard.writeText(shareLink);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            }}
            className="flex items-center gap-2 rounded-lg border border-white/20 bg-white/5 text-white px-4 py-2 text-xs hover:bg-white/10 transition-colors"
          >
            <img src="/share-icon.png" alt="Share" className="w-4 h-4" />
            <span>{copied ? 'Copied!' : 'Share'}</span>
          </button>
        </div>

        {/* Image Generator (hidden) */}
        <ShareImageGenerator
          portfolioData={{
            portfolioName: portfolio.name,
            avgMarketCap: portfolioStats.avgMarketCap,
            avgPriceChange: portfolioStats.change24h,
            tokenCount: portfolio.rows.length,
            tokenImages: portfolio.rows.map(row => {
              const meta = extraMeta[row.mint] || tokenMeta[row.mint];
              return {
                src: meta?.logoURI || null,
                symbol: meta?.symbol || 'Token',
                mint: row.mint
              };
            }),
            chain: (() => {
              const hasSolana = portfolio.rows.some(row => {
                try {
                  return row.mint.length >= 32 && row.mint.length <= 44 && /^[1-9A-HJ-NP-Za-km-z]+$/.test(row.mint);
                } catch {
                  return false;
                }
              });
              const hasBNB = portfolio.rows.some(row => {
                return row.mint.startsWith('0x') && row.mint.length === 42;
              });
              
              if (hasSolana && hasBNB) return 'Mixed';
              if (hasSolana) return 'Solana';
              if (hasBNB) return 'BNB';
              return 'Solana'; // Default to Solana
            })()
          }}
          onImageGenerated={handleImageGenerated}
        />
      </div>
    </div>
  );
}
