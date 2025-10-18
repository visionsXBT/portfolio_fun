"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ProfilePage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkUserAndRedirect = async () => {
      try {
        // Check if user is logged in by checking database session
        const sessionResponse = await fetch('/api/session');
        
        if (sessionResponse.ok) {
          const sessionData = await sessionResponse.json();
          if (sessionData.success && sessionData.user?.username) {
            // Redirect to user's profile page
            router.replace(`/${sessionData.user.username}`);
            return;
          }
        }
        
        // If no user is logged in, redirect to landing page
        router.replace('/');
      } catch (error) {
        console.error('Error checking user status:', error);
        // Fallback to landing page
        router.replace('/');
      } finally {
        setIsLoading(false);
      }
    };

    checkUserAndRedirect();
  }, [router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  return null; // This component only handles redirects
}
