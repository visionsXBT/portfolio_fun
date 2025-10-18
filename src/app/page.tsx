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

  // Warm up database connection on landing page load
  useEffect(() => {
    const warmupDatabase = async () => {
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
    };

    // Warm up database connection
    warmupDatabase();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center pb-16">
      {/* Header with Logo */}
      <div className="absolute top-0 left-0 p-4 sm:p-6 md:p-8">
        <Logo size="large" />
      </div>
      {/* Hero section */}
      <section className="px-6 sm:px-8 md:px-12 lg:px-16 xl:px-20 py-8 sm:py-12 md:py-16 lg:py-20">
        <div className="mx-auto max-w-4xl lg:max-w-5xl xl:max-w-6xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm sm:text-base mb-6 sm:mb-8">
            <span className="inline-block h-2 w-2 rounded-full bg-green-500 led-pulse" />
            Build portfolios of any kind with onPort
          </div>
          
          {/* Hero Image */}
          <div className="mb-8 sm:mb-10 md:mb-12 lg:mb-16 flex justify-center">
            <Image
              src="/header_text.png"
              alt="Shill your bags in a fun way. No matter the chain."
              width={1200}
              height={600}
              className="max-w-full h-auto w-full max-w-4xl ml-24"
              priority
            />
          </div>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6">
            <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4">
              <button 
                onClick={() => setShowSignInModal(true)}
                className="rounded-lg border border-white/20 bg-white/5 hover:bg-white/10 px-6 py-3 sm:px-8 sm:py-4 md:px-10 md:py-5 text-sm sm:text-base md:text-lg font-medium text-white transition-colors"
              >
                Sign In
              </button>
              <button 
                onClick={() => setShowAccountModal(true)}
                className="rounded-lg gradient-button px-6 py-3 sm:px-8 sm:py-4 md:px-10 md:py-5 text-sm sm:text-base md:text-lg font-medium text-white"
              >
                Create Account
              </button>
            </div>
            <Link href="/leaderboard" className="rounded-lg border border-white/20 bg-white/5 hover:bg-white/10 px-6 py-3 sm:px-8 sm:py-4 md:px-10 md:py-5 text-sm sm:text-base md:text-lg font-medium text-white transition-colors">
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