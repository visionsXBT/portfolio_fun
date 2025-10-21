"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Logo from "@/components/Logo";
import Image from "next/image";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrophy, faQuestionCircle } from '@fortawesome/free-solid-svg-icons';
import SignInModal from '@/components/SignInModal';
import AccountModal from '@/components/AccountModal';

export default function Home() {
  const router = useRouter();
  const [showSignInModal, setShowSignInModal] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [showFAQModal, setShowFAQModal] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);

  // Check user session and redirect if logged in
  useEffect(() => {
    const checkUserSession = async () => {
      try {
        const sessionResponse = await fetch('/api/session');
        
        if (sessionResponse.ok) {
          const sessionData = await sessionResponse.json();
          if (sessionData.success && sessionData.user?.username) {
            // Redirect to user's profile page
            router.push(`/${sessionData.user.username}`);
            return;
          }
        }
        
        setIsCheckingSession(false);
      } catch (error) {
        setIsCheckingSession(false);
      }
    };

    // Warm up database connection and check session
    const initializePage = async () => {
      try {
        const response = await fetch('/api/warmup-db');
        const result = await response.json();
      } catch (error) {
        // Silent fail
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
      {/* Header with Logo and FAQs */}
      <div className="absolute top-0 left-0 right-0 p-3 sm:p-6 md:p-8 z-10 flex items-center justify-between animate-fade-in animate-delay-100">
        <Logo size="large" />
        <button 
          onClick={() => setShowFAQModal(true)}
          className="rounded-lg border border-[#eaeaea] bg-white/20 backdrop-blur-md hover:bg-[#e2e4e5]/30 px-3 py-2 text-sm font-medium text-gray-800 transition-colors shadow-lg shadow-gray-800/30"
        >
          <FontAwesomeIcon icon={faQuestionCircle} className="mr-2" />
          FAQs
        </button>
      </div>
      {/* Hero section */}
      <section className="flex-1 flex flex-col items-center justify-center px-4 sm:px-8 md:px-12 lg:px-16 xl:px-20 py-4 sm:py-8 md:py-12 lg:py-16 xl:py-20 w-full max-w-7xl mx-auto">
        <div className="w-full text-center flex flex-col items-center justify-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#eaeaea] bg-white/20 backdrop-blur-md px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm md:text-base mb-4 sm:mb-6 md:mb-8 shadow-md shadow-gray-800/20 animate-fade-in-up animate-delay-200">
            <span className="inline-block h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-green-500 led-pulse" />
            Build portfolios of any kind with goPort
          </div>
          
          {/* Hero Image */}
          <div className="mb-8 md:mb-12 flex justify-center w-full animate-scale-in animate-delay-300">
            <div className="w-full max-w-6xl">
              <Image
                src="/header_text.png"
                alt="Shill your bags in a fun way. No matter the chain."
                width={1500}
                height={900}
                className="w-full h-auto object-contain"
                priority
              />
            </div>
          </div>
          
          <div className="flex flex-col items-center justify-center gap-4 md:gap-6 w-full max-w-md animate-fade-in-up animate-delay-400">
            <div className="flex flex-col sm:flex-row items-center gap-3 md:gap-4 w-full">
              <button 
                onClick={() => setShowSignInModal(true)}
                className="w-full sm:flex-1 rounded-lg border border-[#eaeaea] bg-white/20 backdrop-blur-md hover:bg-[#e2e4e5]/30 px-6 py-3 md:px-8 md:py-4 text-sm md:text-base font-medium text-gray-800 transition-colors shadow-lg shadow-gray-800/30"
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
            <Link href="/leaderboard" className="w-full rounded-lg border border-[#eaeaea] bg-white/20 backdrop-blur-md hover:bg-[#e2e4e5]/30 px-6 py-3 md:px-8 md:py-4 text-sm md:text-base font-medium text-gray-800 transition-colors text-center shadow-lg shadow-gray-800/30">
              <FontAwesomeIcon icon={faTrophy} /> View Leaderboard
            </Link>
          </div>
        </div>
      </section>

      {/* Modals */}
      {showSignInModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <SignInModal
            isOpen={showSignInModal}
            onClose={() => setShowSignInModal(false)}
            onSuccess={(username, userId) => {
              setShowSignInModal(false);
              // Redirect to user's profile page after successful sign in
              window.location.href = `/${username}`;
            }}
            onSwitchToSignUp={() => {
              setShowSignInModal(false);
              setShowAccountModal(true);
            }}
          />
        </div>
      )}

      {showAccountModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <AccountModal
            isOpen={showAccountModal}
            onClose={() => setShowAccountModal(false)}
            onSuccess={(username, userId) => {
              setShowAccountModal(false);
              // Redirect to user's profile page after successful account creation
              window.location.href = `/${username}`;
            }}
            onSwitchToSignIn={() => {
              setShowAccountModal(false);
              setShowSignInModal(true);
            }}
          />
        </div>
      )}

      {/* FAQ Modal */}
      {showFAQModal && (
        <div 
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
          onClick={() => setShowFAQModal(false)}
        >
          <div 
            className="bg-white/20 backdrop-blur-md rounded-xl border border-[#eaeaea] p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto shadow-2xl shadow-gray-900/50"
            onClick={(e) => e.stopPropagation()}
            style={{ fontFamily: 'Golos Text, sans-serif' }}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.8)' }}>Frequently Asked Questions</h2>
              <button
                onClick={() => setShowFAQModal(false)}
                className="text-white/60 hover:text-white text-2xl"
                style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.8)' }}
              >
                ×
              </button>
            </div>

            <div className="space-y-6 animate-fade-in-up animate-delay-100">
              {/* FAQ 1 */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-2" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.8)' }}>What is goPort?</h3>
                <p className="text-white/80" style={{ textShadow: '1px 1px 3px rgba(0,0,0,0.8)' }}>
                  goPort is a platform that allows you to build and share cryptocurrency portfolios in a fun, visual way. 
                  You can create portfolios of tokens from different chains (Solana, BNB Smart Chain) and share them with others.
                </p>
              </div>

              {/* FAQ 2 */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-2" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.8)' }}>How do I create a portfolio?</h3>
                <p className="text-white/80" style={{ textShadow: '1px 1px 3px rgba(0,0,0,0.8)' }}>
                  Simply sign up for an account, then paste token contract addresses into your portfolio. 
                  goPort will automatically fetch token metadata, prices, and images to display your portfolio beautifully.
                </p>
              </div>

              {/* FAQ 3 */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-2" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.8)' }}>Which blockchains are supported?</h3>
                <p className="text-white/80" style={{ textShadow: '1px 1px 3px rgba(0,0,0,0.8)' }}>
                  Currently, goPort supports Solana and BNB Smart Chain tokens. You can mix tokens from both chains in the same portfolio.
                </p>
              </div>

              {/* FAQ 4 */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-2" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.8)' }}>How do I share my portfolio?</h3>
                <p className="text-white/80" style={{ textShadow: '1px 1px 3px rgba(0,0,0,0.8)' }}>
                  Each portfolio has a unique shareable link that you can send to others. The shared view shows your portfolio 
                  with real-time price data and beautiful visuals that are perfect for social media.
                </p>
              </div>

              {/* FAQ 5 - Leaderboard Rewards */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-2" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.8)' }}>What are the leaderboard rewards?</h3>
                <p className="text-white/80" style={{ textShadow: '1px 1px 3px rgba(0,0,0,0.8)' }}>
                  The most viewed portfolio on the leaderboards receives a reward equal to 20% of the weekly claim from pump.fun creator rewards. 
                  This incentivizes creating engaging and popular portfolios that others want to view.
                </p>
              </div>

              {/* FAQ 6 - Token Buyback */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-2" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.8)' }}>What happens to the remaining 80%?</h3>
                <p className="text-white/80" style={{ textShadow: '1px 1px 3px rgba(0,0,0,0.8)' }}>
                  80% of the weekly pump.fun creator rewards claim is used to buy back tokens, creating a deflationary mechanism 
                  that benefits all token holders by reducing the circulating supply.
                </p>
              </div>

              {/* FAQ 7 */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-2" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.8)' }}>How do I get on the leaderboard?</h3>
                <p className="text-white/80" style={{ textShadow: '1px 1px 3px rgba(0,0,0,0.8)' }}>
                  Portfolios are ranked by the number of views they receive. Create compelling portfolios with interesting token combinations 
                  and share them widely to increase your view count and climb the leaderboard.
                </p>
              </div>

              {/* FAQ 8 */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-2" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.8)' }}>Is goPort free to use?</h3>
                <p className="text-white/80" style={{ textShadow: '1px 1px 3px rgba(0,0,0,0.8)' }}>
                  Yes! Creating accounts, building portfolios, and sharing them is completely free. We believe in making portfolio 
                  management accessible to everyone in the crypto community.
                </p>
              </div>

              {/* FAQ 9 */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-2" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.8)' }}>How often are prices updated?</h3>
                <p className="text-white/80" style={{ textShadow: '1px 1px 3px rgba(0,0,0,0.8)' }}>
                  Token prices and market data are updated in real-time using data from DexScreener and other reliable sources. 
                  Your portfolio will always show the most current information.
                </p>
              </div>

              {/* FAQ 10 */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-2" style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.8)' }}>Can I edit my portfolio after creating it?</h3>
                <p className="text-white/80" style={{ textShadow: '1px 1px 3px rgba(0,0,0,0.8)' }}>
                  Absolutely! You can add or remove tokens from your portfolios at any time. Changes are saved automatically 
                  and will be reflected in your shared portfolio links immediately.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}