"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";
import { PublicKey } from "@solana/web3.js";
import Logo from "@/components/Logo";
import AccountModal from "@/components/AccountModal";
import SignInModal from "@/components/SignInModal";

type PortfolioRow = {
  mint: string;
};

type Portfolio = {
  id: string;
  name: string;
  rows: PortfolioRow[];
  isExpanded: boolean;
};

function isValidMint(value: string): boolean {
  try {
    new PublicKey(value);
    return true;
  } catch {
    return false;
  }
}

function extractMintFromInput(raw: string): string | null {
  const trimmed = raw.trim();
  if (isValidMint(trimmed)) return trimmed;
  const base58Re = /[1-9A-HJ-NP-Za-km-z]{32,48}/g;
  const matches = trimmed.match(base58Re);
  if (matches) {
    for (const match of matches) {
      if (isValidMint(match)) return match;
    }
  }
  return null;
}

function encodePortfolios(portfolios: Portfolio[]): string {
  const data = portfolios.map((p) => ({
    id: p.id,
    name: p.name,
    rows: p.rows.map((r) => ({ mint: r.mint })),
  }));
  const json = JSON.stringify(data);
  const encoder = new TextEncoder();
  const bytes = encoder.encode(json);
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

function decodePortfolios(encoded: string | null): Portfolio[] | null {
  if (!encoded) return null;
  try {
    const padded = encoded.replace(/-/g, "+").replace(/_/g, "/");
    const paddedWithEquals = padded + "=".repeat((4 - (padded.length % 4)) % 4);
    const binaryString = atob(paddedWithEquals);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const decoder = new TextDecoder();
    const json = decoder.decode(bytes);
    const data = JSON.parse(json);
    return data.map((r: Portfolio) => ({
      id: r.id,
      name: r.name,
      rows: r.rows.filter((row: PortfolioRow) => isValidMint(row.mint)),
      isExpanded: false,
    }));
  } catch {
    return null;
  }
}

export default function BuilderPageContent() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [currentInput, setCurrentInput] = useState("");
  const [editingPortfolioId, setEditingPortfolioId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [priceChanges24h, setPriceChanges24h] = useState<Record<string, number>>({});
  const [tokenMeta, setTokenMeta] = useState<Record<string, { symbol?: string; name?: string; logoURI?: string }>>({});
  const [extraMeta, setExtraMeta] = useState<Record<string, { symbol?: string; name?: string; logoURI?: string }>>({});
  const [pumpStatus, setPumpStatus] = useState<"disconnected" | "connecting" | "connected">("disconnected");
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [showSignInModal, setShowSignInModal] = useState(false);
  const [userAccount, setUserAccount] = useState<{ username: string; id: string } | null>(null);

  // Hydrate from query param if present
  useEffect(() => {
    const encoded = searchParams.get("p");
    const decoded = decodePortfolios(encoded);
    if (decoded) {
      setPortfolios(decoded);
    }
  }, [searchParams]);

  const addPortfolio = useCallback(() => {
    const newId = (portfolios.length + 1).toString();
    setPortfolios((prev) => [
      ...prev,
      { id: newId, name: `Portfolio ${newId}`, rows: [], isExpanded: true }
    ]);
  }, [portfolios.length]);

  const handleCreateAccount = useCallback((username: string, userId: string) => {
    setUserAccount({ username, id: userId });
    setShowAccountModal(false);
    
    // Create first portfolio after account creation
    const newId = "1";
    setPortfolios([{ id: newId, name: `Portfolio ${newId}`, rows: [], isExpanded: true }]);
  }, []);

  const handleSignIn = useCallback(async (username: string, userId: string) => {
    setUserAccount({ username, id: userId });
    setShowSignInModal(false);
    
    // Load user's portfolios from database
    try {
      const response = await fetch(`/api/user/${userId}/portfolios`);
      if (response.ok) {
        const userData = await response.json();
        if (userData.portfolios && userData.portfolios.length > 0) {
          setPortfolios(userData.portfolios);
        } else {
          // Create first portfolio if none exist
          const newId = "1";
          setPortfolios([{ id: newId, name: `Portfolio ${newId}`, rows: [], isExpanded: true }]);
        }
      } else {
        // Fallback: create default portfolio
        const newId = "1";
        setPortfolios([{ id: newId, name: `Portfolio ${newId}`, rows: [], isExpanded: true }]);
      }
    } catch (error) {
      console.warn('Failed to load portfolios:', error);
      // Fallback: create default portfolio
      const newId = "1";
      setPortfolios([{ id: newId, name: `Portfolio ${newId}`, rows: [], isExpanded: true }]);
    }
  }, []);

  const handleCreatePortfolio = useCallback(() => {
    if (!userAccount) {
      setShowSignInModal(true);
    } else {
      const newId = (portfolios.length + 1).toString();
      setPortfolios((prev) => [
        ...prev,
        { id: newId, name: `Portfolio ${newId}`, rows: [], isExpanded: true }
      ]);
    }
  }, [userAccount, portfolios.length]);

  const removePortfolio = useCallback((portfolioId: string) => {
    setPortfolios((prev) => prev.filter((p) => p.id !== portfolioId));
  }, []);

  const togglePortfolio = useCallback((portfolioId: string) => {
    setPortfolios((prev) => prev.map((p) => 
      p.id === portfolioId ? { ...p, isExpanded: !p.isExpanded } : p
    ));
  }, []);

  const updatePortfolioName = useCallback((portfolioId: string, name: string) => {
    setPortfolios((prev) => prev.map((p) => 
      p.id === portfolioId ? { ...p, name } : p
    ));
  }, []);

  const addRow = useCallback(async (portfolioId: string) => {
    const mint = extractMintFromInput(currentInput);
    if (!mint) return;
    
    // Add the token immediately
    setPortfolios((prev) => prev.map((p) => 
      p.id === portfolioId 
        ? { ...p, rows: [...p.rows, { mint }] }
        : p
    ));
    
    // Fetch metadata immediately for this specific token
    try {
      const response = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${mint}`);
      const data = await response.json();
      
      if (data && data.pairs && data.pairs.length > 0) {
        const pair = data.pairs[0];
        setExtraMeta(prev => ({
          ...prev,
          [mint]: {
            symbol: pair.baseToken?.symbol,
            name: pair.baseToken?.name,
            logoURI: pair.baseToken?.image,
          }
        }));
      }
    } catch (error) {
      console.warn('Failed to fetch immediate metadata:', error);
    }
    
    setCurrentInput("");
  }, [currentInput]);

  const removeRow = useCallback((portfolioId: string, mint: string) => {
    setPortfolios((prev) => prev.map((p) => 
      p.id === portfolioId 
        ? { ...p, rows: p.rows.filter((r) => r.mint !== mint) }
        : p
    ));
  }, []);

  const copyShare = useCallback(() => {
    const encoded = encodePortfolios(portfolios);
    const url = `${window.location.origin}${pathname}?p=${encoded}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [portfolios, pathname]);

  const copyPortfolioShare = useCallback((portfolio: Portfolio) => {
    const encoded = encodePortfolios([portfolio]);
    const url = `${window.location.origin}${pathname}?p=${encoded}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [pathname]);

  // Fetch token metadata and prices
  useEffect(() => {
    const allMints = portfolios.flatMap(p => p.rows.map(r => r.mint));
    const uniqueMints = [...new Set(allMints)];
    
    if (uniqueMints.length === 0) return;

    const controller = new AbortController();
    
    // Fetch Jupiter token list for metadata
    fetch("https://token.jup.ag/strict", { signal: controller.signal })
      .then((r) => r.json())
      .then((tokens) => {
        const nextMeta: Record<string, { symbol?: string; name?: string; logoURI?: string }> = {};
        for (const mint of uniqueMints) {
          const token = tokens.find((t: { address: string }) => t.address === mint);
          if (token) {
            nextMeta[mint] = {
              symbol: token.symbol,
              name: token.name,
              logoURI: token.logoURI,
            };
          }
        }
        setTokenMeta(nextMeta);
      })
      .catch(() => {});

    // Fetch Jupiter prices
    const idsParam = uniqueMints.join(",");
    fetch(`https://price.jup.ag/v6/price?ids=${idsParam}`, { signal: controller.signal })
      .then((r) => r.json())
      .then((data) => {
        const nextPrices: Record<string, number> = {};
        if (data && data.data) {
          for (const mint of uniqueMints) {
            const entry = data.data[mint];
            if (entry && typeof entry.price === "number") {
              nextPrices[mint] = entry.price;
              // Jupiter doesn't provide 24h change, so we'll use DexScreener for that
            }
          }
        }
        setPrices(nextPrices);
      })
      .catch(() => {});

    // Fetch DexScreener data for 24h changes and additional metadata
    const dexScreenerMints = uniqueMints.slice(0, 20); // Limit to avoid URL length issues
    const dexScreenerIds = dexScreenerMints.join(",");
    
    fetch(`https://api.dexscreener.com/latest/dex/tokens/${dexScreenerIds}`, { signal: controller.signal })
      .then((r) => r.json())
      .then((data) => {
        const nextChanges: Record<string, number> = {};
        const nextExtraMeta: Record<string, { symbol?: string; name?: string; logoURI?: string }> = {};
        
        if (data && data.pairs) {
          for (const pair of data.pairs) {
            const mint = pair.baseToken?.address;
            if (mint && uniqueMints.includes(mint)) {
              if (typeof pair.priceChange?.h24 === "number") {
                nextChanges[mint] = pair.priceChange.h24;
              }
              if (!tokenMeta[mint]) {
                nextExtraMeta[mint] = {
                  symbol: pair.baseToken?.symbol,
                  name: pair.baseToken?.name,
                  logoURI: pair.baseToken?.image,
                };
              }
            }
          }
        }
        setPriceChanges24h(nextChanges);
        setExtraMeta(nextExtraMeta);
      })
      .catch(() => {});

    return () => controller.abort();
  }, [portfolios, tokenMeta]);

  // Save portfolios to database when they change
  useEffect(() => {
    if (userAccount && portfolios.length > 0) {
      const savePortfolios = async () => {
        try {
          await fetch(`/api/user/${userAccount.id}/portfolios`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ portfolios })
          });
        } catch (error) {
          console.warn('Failed to save portfolios:', error);
        }
      };
      
      // Debounce saves to avoid too many API calls
      const timeoutId = setTimeout(savePortfolios, 1000);
      return () => clearTimeout(timeoutId);
    }
  }, [portfolios, userAccount]);

  // Connect to Pump.fun WebSocket
  useEffect(() => {
    setPumpStatus("connecting");
    
    let ws: WebSocket;
    try {
      ws = new WebSocket("wss://pumpportal.fun/api/data");
    } catch {
      setPumpStatus("disconnected");
      return;
    }

    ws.onopen = () => setPumpStatus("connected");
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        // Handle pump events if needed in the future
        console.log("Pump event:", data);
      } catch {
        // ignore parse errors
      }
    };
    ws.onerror = () => setPumpStatus("disconnected");
    ws.onclose = () => setPumpStatus("disconnected");

    return () => {
      ws?.close();
    };
  }, []);

  const portfolioStats = useMemo(() => {
    return portfolios.map(portfolio => {
      const portfolioMints = portfolio.rows.map(r => r.mint);
      const portfolioValue = portfolioMints.reduce((sum, mint) => {
        const price = prices[mint];
        return sum + (price || 0);
      }, 0);
      
      const portfolioChanges = portfolioMints.map(mint => priceChanges24h[mint] || 0);
      const avgChange = portfolioChanges.length > 0 
        ? portfolioChanges.reduce((sum, change) => sum + change, 0) / portfolioChanges.length 
        : 0;
      
      return {
        portfolio,
        value: portfolioValue,
        change24h: avgChange
      };
    });
  }, [portfolios, prices, priceChanges24h]);

  return (
    <div className="min-h-screen p-6 sm:p-8 md:p-12">
      <div className="mx-auto w-full max-w-6xl">
        {/* Header with Logo */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <Logo />
            <div className="flex items-center gap-4">
              {userAccount && (
                <span className="text-sm text-white/60">
                  Welcome, {userAccount.username}
                </span>
              )}
              <Link href="/" className="text-sm text-white/60 hover:text-white">← Home </Link>
            </div>
          </div>
          <h1 className="text-3xl font-semibold mb-2">Portfolio Builder</h1>
          <p className="text-white/60">
            Create multiple portfolios. Click on a portfolio to expand and add tokens.
          </p>
        </div>

        {portfolios.length === 0 ? (
          <div className="text-center py-16">
            <div className="mb-8">
              <h2 className="text-2xl font-semibold text-white mb-4">
                {userAccount ? "No portfolios yet" : "Welcome to Portfolio Builder"}
              </h2>
              <p className="text-white/60 mb-8">
                {userAccount 
                  ? "Create your first portfolio to start building and sharing your token collections."
                  : "Sign in to access your existing portfolios or create a new account to get started."
                }
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                {!userAccount ? (
                  <>
                    <button
                      onClick={() => setShowSignInModal(true)}
                      className="rounded-lg bg-[var(--brand-end)] hover:bg-[var(--brand-start)] px-8 py-4 text-lg font-medium text-white transition-colors"
                    >
                      Sign In
                    </button>
                    <button
                      onClick={() => setShowAccountModal(true)}
                      className="rounded-lg border border-white/20 bg-white/5 hover:bg-white/10 px-8 py-4 text-lg font-medium text-white transition-colors"
                    >
                      Create Account
                    </button>
                  </>
                ) : (
                  <button
                    onClick={handleCreatePortfolio}
                    className="rounded-lg bg-[var(--brand-end)] hover:bg-[var(--brand-start)] px-8 py-4 text-lg font-medium text-white transition-colors"
                  >
                    Create Portfolio
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {portfolios.map((portfolio) => {
              const stats = portfolioStats.find(s => s.portfolio.id === portfolio.id);
              const visibleTokens = portfolio.rows.slice(0, 4);
              const hiddenCount = portfolio.rows.length - 4;
              
              return (
                <div key={portfolio.id} className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6">
                  {/* Portfolio Header */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-4 flex-1">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => togglePortfolio(portfolio.id)}
                          className="text-white/60 hover:text-white transition-colors"
                        >
                          {portfolio.isExpanded ? "▼" : "▶"}
                        </button>
                        
                        {editingPortfolioId === portfolio.id ? (
                          <input
                            type="text"
                            value={portfolio.name}
                            onChange={(e) => updatePortfolioName(portfolio.id, e.target.value)}
                            onBlur={() => setEditingPortfolioId(null)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") setEditingPortfolioId(null);
                            }}
                            className="bg-transparent border-none outline-none text-white font-medium text-lg"
                            autoFocus
                          />
                        ) : (
                          <h3 className="text-lg font-medium text-white">{portfolio.name}</h3>
                        )}
                        
                        <button
                          onClick={() => setEditingPortfolioId(portfolio.id)}
                          className="text-white/40 hover:text-white/60 transition-colors"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                            <path d="m18.5 2.5 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                          </svg>
                        </button>
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-white/60">
                        <span>{portfolio.rows.length} tokens</span>
                        {stats && (
                          <>
                            <span>${stats.value.toFixed(2)}</span>
                            <span className={stats.change24h >= 0 ? "text-green-400" : "text-red-400"}>
                              {stats.change24h >= 0 ? "+" : ""}{stats.change24h.toFixed(2)}%
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      {/* Token Images */}
                      <div className="flex items-center gap-1">
                        {visibleTokens.map((row) => {
                          const meta = tokenMeta[row.mint] || extraMeta[row.mint];
                          return (
                            <div key={row.mint} className="relative group">
                              <img
                                src={meta?.logoURI || "/placeholder-token.png"}
                                alt={meta?.symbol || "Token"}
                                className="w-8 h-8 rounded-full border border-white/20"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = "/placeholder-token.png";
                                }}
                              />
                              <button
                                onClick={() => removeRow(portfolio.id, row.mint)}
                                className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                              >
                                -
                              </button>
                            </div>
                          );
                        })}
                        {hiddenCount > 0 && (
                          <div className="w-8 h-8 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-xs text-white/60">
                            +{hiddenCount}
                          </div>
                        )}
                      </div>
                      
                      <button
                        onClick={() => copyPortfolioShare(portfolio)}
                        className="text-white/60 hover:text-white transition-colors"
                        title="Share this portfolio"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
                          <polyline points="16,6 12,2 8,6"/>
                          <line x1="12" y1="2" x2="12" y2="15"/>
                        </svg>
                      </button>
                      
                      <button
                        onClick={() => removePortfolio(portfolio.id)}
                        className="text-red-400 hover:text-red-300 transition-colors"
                        title="Delete portfolio"
                      >
                        ✕
                      </button>
                    </div>
                  </div>

                  {/* Portfolio Content */}
                  {portfolio.isExpanded && (
                    <div className="space-y-4">
                      {/* Add Token Input */}
                      <div className="flex gap-3">
                        <input
                          type="text"
                          value={currentInput}
                          onChange={(e) => setCurrentInput(e.target.value)}
                          placeholder="Paste token contract address..."
                          className="flex-1 rounded-md border border-white/20 bg-white/5 text-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--brand-end)]"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") addRow(portfolio.id);
                          }}
                        />
                        <button
                          onClick={() => addRow(portfolio.id)}
                          disabled={!extractMintFromInput(currentInput)}
                          className="rounded-md bg-[var(--brand-end)] hover:bg-[var(--brand-start)] px-4 py-2 text-sm text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Add Token
                        </button>
                      </div>

                      {/* Token List */}
                      {portfolio.rows.length > 0 && (
                        <div className="space-y-2">
                          {portfolio.rows.map((row) => {
                            const meta = tokenMeta[row.mint] || extraMeta[row.mint];
                            const price = prices[row.mint];
                            const change24h = priceChanges24h[row.mint];
                            
                            return (
                              <div key={row.mint} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                                <div className="flex items-center gap-3">
                                  <img
                                    src={meta?.logoURI || "/placeholder-token.png"}
                                    alt={meta?.symbol || "Token"}
                                    className="w-8 h-8 rounded-full"
                                    onError={(e) => {
                                      (e.target as HTMLImageElement).src = "/placeholder-token.png";
                                    }}
                                  />
                                  <div>
                                    <div className="font-medium text-white">
                                      {meta?.symbol || "Unknown"}
                                    </div>
                                    <div className="text-sm text-white/60">
                                      {meta?.name || row.mint.slice(0, 8) + "..."}
                                    </div>
                                  </div>
                                </div>
                                
                                <div className="flex items-center gap-4">
                                  {price && (
                                    <div className="text-right">
                                      <div className="font-medium text-white">
                                        ${price.toFixed(6)}
                                      </div>
                                      {typeof change24h === "number" && (
                                        <div className={`text-sm ${change24h >= 0 ? "text-green-400" : "text-red-400"}`}>
                                          {change24h >= 0 ? "+" : ""}{change24h.toFixed(2)}%
                                        </div>
                                      )}
                                    </div>
                                  )}
                                  
                                  <button
                                    onClick={() => removeRow(portfolio.id, row.mint)}
                                    className="text-red-400 hover:text-red-300 transition-colors"
                                  >
                                    ✕
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {portfolios.length > 0 && (
          <div className="flex gap-4 mt-8">
            <button
              onClick={addPortfolio}
              className="rounded-md border border-white/20 bg-white/5 text-white px-6 py-3 text-sm hover:bg-white/10"
            >
              + Add Portfolio
            </button>
            <button
              onClick={copyShare}
              className="rounded-md bg-[var(--brand-end)] hover:bg-[var(--brand-start)] px-6 py-3 text-sm text-white"
            >
              {copied ? "Copied!" : "Copy all portfolios"}
            </button>
          </div>
        )}

        <div className="mt-6 text-xs text-white/50">
          Pump.fun feed: {pumpStatus === "connected" ? "Connected" : pumpStatus === "connecting" ? "Connecting…" : "Disconnected"}
        </div>
      </div>

      <AccountModal
        isOpen={showAccountModal}
        onClose={() => setShowAccountModal(false)}
        onSuccess={handleCreateAccount}
        onSwitchToSignIn={() => {
          setShowAccountModal(false);
          setShowSignInModal(true);
        }}
      />

      <SignInModal
        isOpen={showSignInModal}
        onClose={() => setShowSignInModal(false)}
        onSuccess={handleSignIn}
        onSwitchToSignUp={() => {
          setShowSignInModal(false);
          setShowAccountModal(true);
        }}
      />
    </div>
  );
}
