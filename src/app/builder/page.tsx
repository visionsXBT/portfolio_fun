"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function BuilderPage() {
  const router = useRouter();

  useEffect(() => {
    // Check if user is logged in and redirect to their profile page
    const checkSessionAndRedirect = async () => {
      try {
        const response = await fetch('/api/session');
        if (response.ok) {
          const sessionData = await response.json();
          if (sessionData.success && sessionData.user?.username) {
            router.replace(`/${sessionData.user.username}`);
            return;
          }
        }
        // If no session, redirect to landing page
        router.replace('/');
      } catch (error) {
        console.error('Failed to check session:', error);
        router.replace('/');
      }
    };
    
    checkSessionAndRedirect();
  }, [router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
      <div className="text-white text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
        <p>Redirecting to your profile...</p>
      </div>
    </div>
  );
}