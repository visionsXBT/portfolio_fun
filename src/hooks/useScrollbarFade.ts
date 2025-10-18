import { useEffect, useRef } from 'react';

export const useScrollbarFade = () => {
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const elementRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const handleScroll = () => {
      if (elementRef.current) {
        // Add scrolling class to show scrollbar
        elementRef.current.classList.add('scrolling');
        
        // Clear existing timeout
        if (scrollTimeoutRef.current) {
          clearTimeout(scrollTimeoutRef.current);
        }
        
        // Set timeout to hide scrollbar after scrolling stops
        scrollTimeoutRef.current = setTimeout(() => {
          if (elementRef.current) {
            elementRef.current.classList.remove('scrolling');
          }
        }, 1000); // Hide after 1 second of no scrolling
      }
    };

    // Use document.body as the default element
    elementRef.current = document.body;
    
    // Add scrollbar-fade class to body
    document.body.classList.add('scrollbar-fade');
    
    // Add scroll event listener
    document.addEventListener('scroll', handleScroll, { passive: true });
    
    // Cleanup
    return () => {
      document.removeEventListener('scroll', handleScroll);
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
      document.body.classList.remove('scrollbar-fade', 'scrolling');
    };
  }, []);

  return elementRef;
};
