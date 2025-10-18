"use client";

import { useRef, useEffect } from 'react';

interface PortfolioShareData {
  portfolioName: string;
  avgMarketCap: number;
  avgPriceChange: number;
  tokenCount: number;
  tokenImages: Array<{
    src: string | null;
    symbol: string;
    mint: string;
  }>;
  chain: 'Solana' | 'BNB' | 'Mixed';
}

interface ShareImageGeneratorProps {
  portfolioData: PortfolioShareData;
  onImageGenerated: (imageDataUrl: string) => void;
}

export default function ShareImageGenerator({ portfolioData, onImageGenerated }: ShareImageGeneratorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const generateShareImage = async () => {
    try {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Set canvas size (Twitter/X optimized: 1200x630)
      canvas.width = 1200;
      canvas.height = 630;

      // Load and draw the base sharing.png image
      const baseImage = new Image();
      baseImage.crossOrigin = 'anonymous';
      
      await new Promise((resolve, reject) => {
        baseImage.onload = () => {
          // Draw the base image to fill the entire canvas
          ctx.drawImage(baseImage, 0, 0, 1200, 630);
          resolve(void 0);
        };
        baseImage.onerror = reject;
        baseImage.src = '/sharing.png';
      });

      // Add a subtle overlay to ensure text readability
      ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.fillRect(0, 0, 1200, 630);

      // Portfolio name - left-aligned to match site
      ctx.fillStyle = '#FFFFFF'; // Accent - White
      ctx.font = 'bold 48px Golos Text, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(portfolioData.portfolioName, 150, 150);

      // Token Images - positioned below title
      const tokenImageY = 200;
      const tokenImageSize = 40;
      const tokenImageSpacing = 50;
      const maxVisibleTokens = 5;
      
      // Draw token images
      const visibleTokens = portfolioData.tokenImages.slice(0, maxVisibleTokens);
      const startX = 150; // Start from left side
      
      for (let i = 0; i < visibleTokens.length; i++) {
        const token = visibleTokens[i];
        const x = startX + i * tokenImageSpacing;
        
        if (token.src) {
          // Load and draw token image
          const tokenImg = new Image();
          tokenImg.crossOrigin = 'anonymous';
          
          await new Promise((resolve) => {
            tokenImg.onload = () => {
              // Draw rounded rectangle background
              ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
              ctx.beginPath();
              ctx.roundRect(x - tokenImageSize/2, tokenImageY - tokenImageSize/2, tokenImageSize, tokenImageSize, 8);
              ctx.fill();
              
              // Draw token image
              ctx.save();
              ctx.beginPath();
              ctx.roundRect(x - tokenImageSize/2, tokenImageY - tokenImageSize/2, tokenImageSize, tokenImageSize, 8);
              ctx.clip();
              ctx.drawImage(tokenImg, x - tokenImageSize/2, tokenImageY - tokenImageSize/2, tokenImageSize, tokenImageSize);
              ctx.restore();
              
              resolve(void 0);
            };
            tokenImg.onerror = () => {
              // Draw fallback circle
              ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
              ctx.beginPath();
              ctx.roundRect(x - tokenImageSize/2, tokenImageY - tokenImageSize/2, tokenImageSize, tokenImageSize, 8);
              ctx.fill();
              
              ctx.fillStyle = '#FFFFFF';
              ctx.font = 'bold 16px Golos Text, sans-serif';
              ctx.textAlign = 'center';
              ctx.fillText('?', x, tokenImageY + 5);
              resolve(void 0);
            };
            tokenImg.src = token.src!; // Non-null assertion since we checked above
          });
        } else {
          // Draw fallback circle
          ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
          ctx.beginPath();
          ctx.roundRect(x - tokenImageSize/2, tokenImageY - tokenImageSize/2, tokenImageSize, tokenImageSize, 8);
          ctx.fill();
          
          ctx.fillStyle = '#FFFFFF';
          ctx.font = 'bold 16px Golos Text, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('?', x, tokenImageY + 5);
        }
      }
      
      // Show "+X more" if there are more tokens
      if (portfolioData.tokenImages.length > maxVisibleTokens) {
        const moreCount = portfolioData.tokenImages.length - maxVisibleTokens;
        const moreX = startX + maxVisibleTokens * tokenImageSpacing;
        
        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.beginPath();
        ctx.roundRect(moreX - tokenImageSize/2, tokenImageY - tokenImageSize/2, tokenImageSize, tokenImageSize, 8);
        ctx.fill();
        
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 12px Golos Text, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`+${moreCount}`, moreX, tokenImageY + 3);
      }

      // Stats container - positioned below token images, left-aligned
      const statsY = 280;
      const statsSpacing = 200; // Reduced spacing for left alignment

      // 24H Change - first stat, left-aligned
      ctx.fillStyle = '#FFFFFF'; // Accent - White
      ctx.font = 'bold 24px Golos Text, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('24H change:', 150, statsY);
      
      const changeColor = portfolioData.avgPriceChange >= 0 ? '#4ade80' : '#f87171'; // Keep green/red for gains/losses
      ctx.fillStyle = changeColor;
      ctx.font = 'bold 32px Golos Text, sans-serif';
      const changeText = `${portfolioData.avgPriceChange >= 0 ? '+' : ''}${portfolioData.avgPriceChange.toFixed(2)}%`;
      ctx.fillText(changeText, 150, statsY + 40);

      // Average Market Cap - second stat, left-aligned
      ctx.fillStyle = '#FFFFFF'; // Accent - White
      ctx.font = 'bold 24px Golos Text, sans-serif';
      ctx.fillText('Avg. Mcap:', 150 + statsSpacing, statsY);
      
      ctx.fillStyle = '#00C2FF'; // Primary - Cyan Blue
      ctx.font = 'bold 32px Golos Text, sans-serif';
      ctx.fillText(`$${formatMarketCap(portfolioData.avgMarketCap)}`, 150 + statsSpacing, statsY + 40);

      // Chain Information - positioned below stats with actual logo
      const chainY = statsY + 80;
      ctx.fillStyle = '#FFFFFF'; // Accent - White
      ctx.font = 'bold 24px Golos Text, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('Chain', 150, chainY);
      
      // Draw actual chain logo
      const chainLogoSize = 32;
      const chainLogoX = 150;
      const chainLogoY = chainY + 10;
      
      if (portfolioData.chain === 'Solana') {
        // Load and draw Solana logo
        const solLogo = new Image();
        solLogo.crossOrigin = 'anonymous';
        
        await new Promise((resolve) => {
          solLogo.onload = () => {
            ctx.drawImage(solLogo, chainLogoX, chainLogoY, chainLogoSize, chainLogoSize);
            resolve(void 0);
          };
          solLogo.onerror = () => {
            // Fallback to text if image fails
            ctx.fillStyle = '#9945FF'; // Solana purple
            ctx.font = 'bold 24px Golos Text, sans-serif';
            ctx.textAlign = 'left';
            ctx.fillText('SOL', chainLogoX, chainLogoY + 20);
            resolve(void 0);
          };
          solLogo.src = '/sol-logo.png';
        });
      } else if (portfolioData.chain === 'BNB') {
        // Load and draw BNB logo
        const bnbLogo = new Image();
        bnbLogo.crossOrigin = 'anonymous';
        
        await new Promise((resolve) => {
          bnbLogo.onload = () => {
            ctx.drawImage(bnbLogo, chainLogoX, chainLogoY, chainLogoSize, chainLogoSize);
            resolve(void 0);
          };
          bnbLogo.onerror = () => {
            // Fallback to text if image fails
            ctx.fillStyle = '#F3BA2F'; // BNB yellow
            ctx.font = 'bold 24px Golos Text, sans-serif';
            ctx.textAlign = 'left';
            ctx.fillText('BNB', chainLogoX, chainLogoY + 20);
            resolve(void 0);
          };
          bnbLogo.src = '/bnb-logo.png';
        });
      } else {
        // Mixed chains - show both logos side by side
        const solLogo = new Image();
        const bnbLogo = new Image();
        
        await Promise.all([
          new Promise((resolve) => {
            solLogo.onload = () => {
              ctx.drawImage(solLogo, chainLogoX, chainLogoY, chainLogoSize/2, chainLogoSize/2);
              resolve(void 0);
            };
            solLogo.onerror = () => resolve(void 0);
            solLogo.src = '/sol-logo.png';
          }),
          new Promise((resolve) => {
            bnbLogo.onload = () => {
              ctx.drawImage(bnbLogo, chainLogoX + chainLogoSize/2, chainLogoY, chainLogoSize/2, chainLogoSize/2);
              resolve(void 0);
            };
            bnbLogo.onerror = () => resolve(void 0);
            bnbLogo.src = '/bnb-logo.png';
          })
        ]);
      }

      // Convert to data URL
      const dataUrl = canvas.toDataURL('image/png');
      onImageGenerated(dataUrl);
      
    } catch (error) {
      console.error('Error generating share image:', error);
    }
  };

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

  useEffect(() => {
    generateShareImage();
  }, [portfolioData, generateShareImage]);

  return (
    <div className="hidden">
      <canvas ref={canvasRef} />
    </div>
  );
}

// Extend CanvasRenderingContext2D to support roundRect
declare global {
  interface CanvasRenderingContext2D {
    roundRect(x: number, y: number, width: number, height: number, radius: number): void;
  }
}

if (typeof CanvasRenderingContext2D !== 'undefined') {
  CanvasRenderingContext2D.prototype.roundRect = function(x: number, y: number, width: number, height: number, radius: number) {
    this.beginPath();
    this.moveTo(x + radius, y);
    this.lineTo(x + width - radius, y);
    this.quadraticCurveTo(x + width, y, x + width, y + radius);
    this.lineTo(x + width, y + height - radius);
    this.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    this.lineTo(x + radius, y + height);
    this.quadraticCurveTo(x, y + height, x, y + height - radius);
    this.lineTo(x, y + radius);
    this.quadraticCurveTo(x, y, x + radius, y);
    this.closePath();
  };
}
