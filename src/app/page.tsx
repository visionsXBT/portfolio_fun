"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Logo from "@/components/Logo";
import Image from "next/image";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrophy } from '@fortawesome/free-solid-svg-icons';
import SignInModal from '@/components/SignInModal';
import AccountModal from '@/components/AccountModal';

export default function Home() {
  const router = useRouter();
  const [showSignInModal, setShowSignInModal] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);

  // Check user session and redirect if logged in
  useEffect(() => {
    const checkUserSession = async () => {
      try {
        console.log('🔍 Checking user session on landing page...');
        const sessionResponse = await fetch('/api/session');
        
        if (sessionResponse.ok) {
          const sessionData = await sessionResponse.json();
          if (sessionData.success && sessionData.user?.username) {
            console.log('✅ User is logged in, redirecting to profile:', sessionData.user.username);
            // Redirect to user's profile page
            router.push(`/${sessionData.user.username}`);
            return;
          }
        }
        
        console.log('👤 No valid session found, staying on landing page');
        setIsCheckingSession(false);
      } catch (error) {
        console.error('❌ Failed to check user session:', error);
        setIsCheckingSession(false);
      }
    };

    // Warm up database connection and check session
    const initializePage = async () => {
      try {
        console.log('🔥 Starting database warmup from landing page...');
        const response = await fetch('/api/warmup-db');
        const result = await response.json();
        
        if (result.success) {
          console.log('✅ Database connection warmed up successfully');
        } else {
          console.warn('⚠️ Database warmup failed:', result.error);
        }
      } catch (error) {
        console.warn('⚠️ Database warmup request failed:', error);
      }

      // Check user session after database warmup
      await checkUserSession();
    };

    initializePage();
  }, [router]);

  // Show loading state while checking session
  if (isCheckingSession) {
    return (
      <div className="h-screen flex flex-col items-center justify-center overflow-hidden">
        <div className="text-white/60">Loading...</div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col items-center justify-center overflow-hidden">
      {/* Header with Logo */}
      <div className="absolute top-0 left-0 p-3 sm:p-6 md:p-8 z-10">
        <Logo size="large" />
      </div>
      {/* Hero section */}
      <section className="flex-1 flex flex-col items-center justify-center px-4 sm:px-8 md:px-12 lg:px-16 xl:px-20 py-4 sm:py-8 md:py-12 lg:py-16 xl:py-20 w-full max-w-7xl mx-auto">
        <div className="w-full text-center flex flex-col items-center justify-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm md:text-base mb-4 sm:mb-6 md:mb-8">
            <span className="inline-block h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-green-500 led-pulse" />
            Build portfolios of any kind with onPort
          </div>
          
          {/* Hero Image */}
          <div className="mb-8 md:mb-12 flex justify-center w-full">
            <div className="w-full max-w-4xl">
              <Image
                src="/header_text.png"
                alt="Shill your bags in a fun way. No matter the chain."
                width={1200}
                height={600}
                className="w-full h-auto object-contain"
                priority
              />
            </div>
          </div>
          
          <div className="flex flex-col items-center justify-center gap-4 md:gap-6 w-full max-w-md">
            <div className="flex flex-col sm:flex-row items-center gap-3 md:gap-4 w-full">
              <button 
                onClick={() => setShowSignInModal(true)}
                className="w-full sm:flex-1 rounded-lg border border-white/20 bg-white/5 hover:bg-white/10 px-6 py-3 md:px-8 md:py-4 text-sm md:text-base font-medium text-white transition-colors"
              >
                Sign In
              </button>
              <button 
                onClick={() => setShowAccountModal(true)}
                className="w-full sm:flex-1 rounded-lg gradient-button px-6 py-3 md:px-8 md:py-4 text-sm md:text-base font-medium text-white"
              >
                Create Account
              </button>
            </div>
            <Link href="/leaderboard" className="w-full rounded-lg border border-white/20 bg-white/5 hover:bg-white/10 px-6 py-3 md:px-8 md:py-4 text-sm md:text-base font-medium text-white transition-colors text-center">
              <FontAwesomeIcon icon={faTrophy} /> View Leaderboard
            </Link>
          </div>
        </div>
      </section>

      {/* Modals */}
      {showSignInModal && (
        <SignInModal
          isOpen={showSignInModal}
          onClose={() => setShowSignInModal(false)}
          onSuccess={(username, userId) => {
            setShowSignInModal(false);
            // Redirect to user's profile page after successful sign in
            router.push(`/${username}`);
          }}
          onSwitchToSignUp={() => {
            setShowSignInModal(false);
            setShowAccountModal(true);
          }}
        />
      )}

      {showAccountModal && (
        <AccountModal
          isOpen={showAccountModal}
          onClose={() => setShowAccountModal(false)}
          onSuccess={(username, userId) => {
            setShowAccountModal(false);
            // Redirect to user's profile page after successful account creation
            router.push(`/${username}`);
          }}
          onSwitchToSignIn={() => {
            setShowAccountModal(false);
            setShowSignInModal(true);
          }}
        />
      )}
    </div>
  );
}