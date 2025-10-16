"use client";

import { useState, useRef, useEffect } from 'react';

interface PortfolioShareData {
  portfolioName: string;
  avgMarketCap: number;
  avgPriceChange: number;
  tokenCount: number;
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

      // Portfolio name - centered and prominent
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 48px Golos Text, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(portfolioData.portfolioName, 600, 200);

      // Stats container - positioned below the portfolio name
      const statsY = 280;
      const statsSpacing = 300;

      // Average Market Cap
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 24px Golos Text, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('Average Market Cap:', 150, statsY);
      
      ctx.fillStyle = '#60a5fa';
      ctx.font = 'bold 32px Golos Text, sans-serif';
      ctx.fillText(formatMarketCap(portfolioData.avgMarketCap), 150, statsY + 40);

      // Average Price Change
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 24px Golos Text, sans-serif';
      ctx.fillText('24h Change:', 150 + statsSpacing, statsY);
      
      const changeColor = portfolioData.avgPriceChange >= 0 ? '#4ade80' : '#f87171';
      ctx.fillStyle = changeColor;
      ctx.font = 'bold 32px Golos Text, sans-serif';
      const changeText = `${portfolioData.avgPriceChange >= 0 ? '+' : ''}${portfolioData.avgPriceChange.toFixed(2)}%`;
      ctx.fillText(changeText, 150 + statsSpacing, statsY + 40);

      // Token Count
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 24px Golos Text, sans-serif';
      ctx.fillText('Tokens:', 150 + statsSpacing * 2, statsY);
      
      ctx.fillStyle = '#fbbf24';
      ctx.font = 'bold 32px Golos Text, sans-serif';
      ctx.fillText(`${portfolioData.tokenCount}`, 150 + statsSpacing * 2, statsY + 40);

      // Convert to data URL
      const dataUrl = canvas.toDataURL('image/png');
      onImageGenerated(dataUrl);
      
    } catch (error) {
      console.error('Error generating share image:', error);
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
