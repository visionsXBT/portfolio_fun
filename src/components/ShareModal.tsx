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
}

export default function ShareModal({ isOpen, onClose, portfolio, portfolioStats, tokenMeta = {}, extraMeta = {} }: ShareModalProps) {
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [shareLink, setShareLink] = useState<string>('');
  const [isClosing, setIsClosing] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  const generateShareLink = () => {
    // Create a public shareable link using the portfolio ID
    const baseUrl = window.location.origin;
    const shareUrl = `${baseUrl}/share/${portfolio.id}`;
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

  const downloadImage = () => {
    if (!generatedImage) return;
    
    const link = document.createElement('a');
    link.download = `${portfolio.name}-portfolio.png`;
    link.href = generatedImage;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const copyImageToClipboard = async () => {
    if (!generatedImage) return;
    
    try {
      // Convert data URL to blob
      const response = await fetch(generatedImage);
      const blob = await response.blob();
      
      // Copy to clipboard
      await navigator.clipboard.write([
        new ClipboardItem({
          [blob.type]: blob
        })
      ]);
      
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy image:', error);
      // Fallback: download the image
      downloadImage();
    }
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
        <div className="relative" style={{ fontFamily: 'Golos Text, sans-serif' }}>
          {/* Base sharing.png image - 800x450 */}
          <img 
            src="/sharing.png" 
            alt="Share Card" 
            className="w-[800px] h-[450px] shadow-2xl object-cover select-none" 
            draggable={false}
            onContextMenu={(e) => {
              e.preventDefault();
              // Allow right-click context menu for copying
            }}
          />
          
          {/* Overlay Content */}
          <div className="absolute inset-0 p-8 flex flex-col justify-end">
            {/* Main Content - Moved to Bottom */}
            <div className="flex flex-col">
              {/* Token Pictures - Top */}
              <div className="flex gap-4 mb-4">
                {portfolio.rows.slice(0, 4).map((row) => {
                  const meta = tokenMeta[row.mint] || extraMeta[row.mint];
                  return (
                    <div key={row.mint} className="w-32 h-32 overflow-hidden">
                      <img 
                        src={meta?.logoURI || '/placeholder-token.svg'} 
                        alt={meta?.symbol || 'Token'} 
                        className="w-full h-full object-cover"
                      />
                    </div>
                  );
                })}
                {portfolio.rows.length > 4 && (
                  <div className="w-32 h-32 bg-white/20 flex items-center justify-center text-white text-sm font-bold">
                    +{portfolio.rows.length - 4}
                  </div>
                )}
              </div>

              {/* Text Content - Left Aligned */}
              <div className="text-left">
                {/* Portfolio Name - Largest Font */}
                <div className="text-white text-2xl font-bold mb-4">
                  {portfolio.name}
                </div>
                
                {/* Statistics */}
                <div className="text-white/90 text-base mb-2">
                  24H change: <span className={`font-semibold ${portfolioStats.change24h >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {portfolioStats.change24h >= 0 ? '+' : ''}{portfolioStats.change24h.toFixed(2)}%
                  </span>
                </div>
                <div className="text-white/90 text-base mb-3">
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
                <div className="flex items-center gap-3">
                  <span className="text-white/90 text-base">Chain</span>
                  <div className="flex gap-3">
                    {chains.includes('solana') && (
                      <img src="/sol-logo.png" alt="Solana" className="w-6 h-6" />
                    )}
                    {chains.includes('bnb') && (
                      <img src="/bnb logo.png" alt="BNB" className="w-6 h-6" />
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* External Action Buttons - Below Share Card, Right Justified */}
        <div className="flex gap-3 justify-end w-full max-w-[800px]">
          <button
            onClick={downloadImage}
            disabled={!generatedImage}
            className="flex items-center gap-2 rounded-lg border border-white/20 bg-white/5 text-white px-4 py-2 text-xs hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <img src="/downloading.png" alt="Download" className="w-4 h-4" />
            <span>Download</span>
          </button>
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
            tokenCount: portfolio.rows.length
          }}
          onImageGenerated={handleImageGenerated}
        />
      </div>
    </div>
  );
}
