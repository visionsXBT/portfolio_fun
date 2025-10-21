"use client";

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

interface PageTransitionProps {
  children: React.ReactNode;
}

export default function PageTransition({ children }: PageTransitionProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [animationKey, setAnimationKey] = useState(0);
  const pathname = usePathname();

  useEffect(() => {
    // Reset visibility when pathname changes
    setIsVisible(false);
    setAnimationKey(prev => prev + 1);
    
    // Reduced delay for smoother transition
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 50); // Reduced from 150ms to 50ms

    return () => clearTimeout(timer);
  }, [pathname]);

  return (
    <div 
      key={animationKey}
      className={`transition-all duration-400 ease-out ${ // Reduced duration from 800ms to 400ms
        isVisible 
          ? 'opacity-100 translate-y-0' 
          : 'opacity-0 translate-y-4' // Reduced translateY from 8 to 4
      }`}
      style={{ willChange: 'opacity, transform' }} // Added will-change for better performance
    >
      <div className="animate-fade-in-up">
        {children}
      </div>
    </div>
  );
}