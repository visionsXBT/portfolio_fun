"use client";

import { useState, useCallback, useEffect } from 'react';

interface TokenImageProps {
  src?: string;
  alt: string;
  className?: string;
  fallbackSrc?: string;
}

export default function TokenImage({ 
  src, 
  alt, 
  className = "w-8 h-8 rounded-full", 
  fallbackSrc = "/placeholder-token.svg" 
}: TokenImageProps) {
  console.log('🖼️ TokenImage rendered with src:', src, 'alt:', alt);
  
  const [imgSrc, setImgSrc] = useState(src || fallbackSrc);
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(!!src);

  const handleError = useCallback(() => {
    if (!hasError) {
      setHasError(true);
      setIsLoading(false);
      setImgSrc(fallbackSrc);
    }
  }, [hasError, fallbackSrc]);

  const handleLoad = useCallback(() => {
    setIsLoading(false);
  }, []);

  // Convert pump.fun URLs to use image proxy to avoid CORS issues
  const getProxiedUrl = useCallback((url: string) => {
    if (url && url.includes('pump.fun')) {
      return `/api/image-proxy?url=${encodeURIComponent(url)}`;
    }
    return url;
  }, []);

  // Update imgSrc when src prop changes
  useEffect(() => {
    if (src && src !== imgSrc) {
      console.log('🔄 TokenImage src changed:', imgSrc, '->', src);
      const proxiedSrc = getProxiedUrl(src);
      setImgSrc(proxiedSrc);
      setIsLoading(true);
      setHasError(false); // Reset error state when src changes
    } else if (!src && imgSrc !== fallbackSrc) {
      console.log('🔄 TokenImage src is empty, using fallback');
      setImgSrc(fallbackSrc);
      setIsLoading(false);
      setHasError(false);
    }
  }, [src, imgSrc, fallbackSrc, getProxiedUrl]);

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
      />
    </div>
  );
}