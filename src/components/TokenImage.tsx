"use client";

import { useState, useCallback, useEffect } from 'react';

interface TokenImageProps {
  src?: string | null;
  alt: string;
  className?: string;
  fallbackSrc?: string;
}

export default function TokenImage({ 
  src, 
  alt, 
  className = "w-8 h-8 rounded-lg", 
  fallbackSrc = "/placeholder-token.svg" 
}: TokenImageProps) {
  console.log('🖼️ TokenImage rendered with src:', src, 'alt:', alt);
  
  const [imgSrc, setImgSrc] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  const handleError = useCallback(() => {
    console.log('❌ Image failed to load:', imgSrc, 'retry count:', retryCount);
    
    if (retryCount < 2 && imgSrc && !imgSrc.includes('placeholder')) {
      // Retry up to 2 times for non-placeholder images
      console.log('🔄 Retrying image load...');
      setRetryCount(prev => prev + 1);
      setIsLoading(true);
      // Force a fresh request by adding a small delay and updating the src
      setTimeout(() => {
        setImgSrc(prev => prev ? `${prev}${prev.includes('?') ? '&' : '?'}retry=${retryCount + 1}` : prev);
      }, 100);
    } else {
      // Give up and use fallback
      setIsLoading(false);
      setImgSrc(fallbackSrc);
    }
  }, [fallbackSrc, imgSrc, retryCount]);

  const handleLoad = useCallback(() => {
    console.log('✅ Image loaded successfully:', imgSrc);
    setIsLoading(false);
    setRetryCount(0); // Reset retry count on successful load
  }, [imgSrc]);

  // Convert pump.fun URLs and other external URLs to use image proxy to avoid CORS issues
  const getProxiedUrl = useCallback((url: string) => {
    if (url && (url.includes('pump.fun') || url.includes('coingecko.com') || url.includes('moralis.io') || url.includes('dexscreener.com') || url.includes('cdn.dexscreener.com') || url.includes('dd.dexscreener.com') || url.includes('four.meme'))) {
      return `/api/image-proxy?url=${encodeURIComponent(url)}`;
    }
    return url;
  }, []);

  // Update imgSrc when src prop changes
  useEffect(() => {
    if (src && src.trim() !== '') {
      console.log('🔄 TokenImage src provided:', src);
      const proxiedSrc = getProxiedUrl(src);
      console.log('🔄 TokenImage proxied src:', proxiedSrc);
      
      // Always set loading state and reset error when src changes
      setIsLoading(true);
      setRetryCount(0);
      setImgSrc(proxiedSrc);
    } else {
      console.log('🔄 TokenImage src is empty, using fallback');
      setImgSrc(fallbackSrc);
      setIsLoading(false);
      setRetryCount(0);
    }
  }, [src, fallbackSrc, getProxiedUrl]);

  // If no src provided, use fallback immediately
  if (!src || src === '') {
    return (
      <div className={`${className} bg-gray-600 flex items-center justify-center text-white text-xs font-medium`}>
        ?
      </div>
    );
  }

  return (
    <div className={`${className} relative overflow-hidden bg-gray-600`}>
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
        </div>
      )}
      <img
        src={imgSrc || fallbackSrc}
        alt={alt}
        className={`w-full h-full object-cover ${isLoading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-200`}
        onError={handleError}
        onLoad={handleLoad}
        loading="lazy"
        crossOrigin="anonymous"
        key={`${imgSrc}-${retryCount}`} // Force re-render when imgSrc or retry count changes
      />
    </div>
  );
}