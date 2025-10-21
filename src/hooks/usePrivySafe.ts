'use client';

import { useWallets, usePrivy, useLogin, useLogout, useLoginWithSiws } from '@privy-io/react-auth';
import { useWallets as useSolanaWallets } from '@privy-io/react-auth/solana';

// Custom hooks that safely handle missing Privy provider
export function useSafePrivy() {
  try {
    return usePrivy();
  } catch (error) {
    return {
      authenticated: false,
      user: null,
      getAccessToken: undefined,
      connectWallet: undefined,
    };
  }
}

export function useSafeWallets() {
  try {
    return useWallets();
  } catch (error) {
    return { wallets: [] };
  }
}

export function useSafeSolanaWallets() {
  try {
    return useSolanaWallets();
  } catch (error) {
    return { wallets: [] };
  }
}

export function useSafeLogin() {
  try {
    return useLogin();
  } catch (error) {
    return { login: undefined };
  }
}

export function useSafeLogout() {
  try {
    return useLogout();
  } catch (error) {
    return { logout: undefined };
  }
}

export function useSafeLoginWithSiws() {
  try {
    return useLoginWithSiws();
  } catch (error) {
    return {
      generateSiwsMessage: undefined,
      loginWithSiws: undefined,
    };
  }
}
