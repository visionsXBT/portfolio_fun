'use client';

import { PrivyProvider as PrivyProviderBase } from '@privy-io/react-auth';

export default function PrivyProvider({ children }: { children: React.ReactNode }) {
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
  
  // If no app ID is provided, return children without Privy provider
  // This allows the app to build and run without Privy functionality
  if (!appId) {
    console.warn('NEXT_PUBLIC_PRIVY_APP_ID not found. Privy authentication will be disabled.');
    return <>{children}</>;
  }
  
  return (
    <PrivyProviderBase
      appId={appId}
      config={{
        // Configure supported login methods - wallet only
        loginMethods: ['wallet'],
        // Configure supported wallets
        appearance: {
          theme: 'dark',
          accentColor: '#676FFF',
          logo: '/favicon.png',
          // Only show specific wallets in the order you want
          walletList: ['phantom', 'solflare'],
        },
        // Configure embedded wallets
        embeddedWallets: {
          solana: {
            createOnLogin: 'users-without-wallets',
          },
        },
        // Removed externalWallets to fix setWalletEntry error
        // Configure supported chains - Solana only
        defaultChain: {
          id: 101, // Solana mainnet chain ID
          name: 'Solana',
          network: 'mainnet',
          nativeCurrency: {
            name: 'Solana',
            symbol: 'SOL',
            decimals: 9,
          },
          rpcUrls: {
            default: { http: ['https://api.mainnet-beta.solana.com'] },
            public: { http: ['https://api.mainnet-beta.solana.com'] },
          },
        },
        supportedChains: [
          {
            id: 101, // Solana mainnet chain ID
            name: 'Solana',
            network: 'mainnet',
            nativeCurrency: {
              name: 'Solana',
              symbol: 'SOL',
              decimals: 9,
            },
            rpcUrls: {
              default: { http: ['https://api.mainnet-beta.solana.com'] },
              public: { http: ['https://api.mainnet-beta.solana.com'] },
            },
          },
        ],
      }}
    >
      {children}
    </PrivyProviderBase>
  );
}
