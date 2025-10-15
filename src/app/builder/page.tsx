"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
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
    // eslint-disable-next-line no-new
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
  const candidates = trimmed.match(base58Re) || [];
  for (const candidate of candidates) {
    if (isValidMint(candidate)) return candidate;
  }
  return null;
}

function toBase64UrlFromString(input: string): string {
  const bytes = new TextEncoder().encode(input);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  const base64 = btoa(binary);
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64UrlToString(input: string): string {
  const base64 = input.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

function encodePortfolios(portfolios: Portfolio[]): string {
  const json = JSON.stringify(portfolios);
  return toBase64UrlFromString(json);
}

function decodePortfolios(param: string | null): Portfolio[] | null {
  if (!param) return null;
  try {
    const json = fromBase64UrlToString(param);
    const parsed = JSON.parse(json);
    if (!Array.isArray(parsed)) return null;
    const sanitized: Portfolio[] = parsed
      .filter((p) => p && typeof p.id === "string" && typeof p.name === "string" && Array.isArray(p.rows))
      .map((p) => ({
        id: p.id,
        name: p.name,
        rows: p.rows.filter((r: PortfolioRow) => r && typeof r.mint === "string"),
        isExpanded: p.isExpanded ?? false,
      }));
    return sanitized.length ? sanitized : null;
  } catch {
    return null;
  }
}

export default function BuilderPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [portfolios, setPortfolios] = useState<Portfolio[]>([]);
  const [currentInput, setCurrentInput] = useState("");
  const [editingPortfolioId, setEditingPortfolioId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [copiedPortfolioId, setCopiedPortfolioId] = useState<string | null>(null);
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [priceChanges24h, setPriceChanges24h] = useState<Record<string, number>>({});
  const [tokenMeta, setTokenMeta] = useState<Record<string, { symbol?: string; name?: string; logoURI?: string }>>({});
  const [extraMeta, setExtraMeta] = useState<Record<string, { symbol?: string; name?: string; logoURI?: string }>>({});
  const [pumpStatus, setPumpStatus] = useState<"disconnected" | "connecting" | "connected">("disconnected");
  const [pumpEvents, setPumpEvents] = useState<Record<string, unknown>>({});
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isRowValid = useCallback((row: PortfolioRow) => {
    return isValidMint(row.mint);
  }, []);

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

  const handleSignIn = useCallback((username: string, userId: string) => {
    setUserAccount({ username, id: userId });
    setShowSignInModal(false);
    
    // Load user's portfolios from database
    // For now, create a default portfolio
    const newId = "1";
    setPortfolios([{ id: newId, name: `Portfolio ${newId}`, rows: [], isExpanded: true }]);
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

  const startEditingPortfolio = useCallback((portfolioId: string) => {
    setEditingPortfolioId(portfolioId);
  }, []);

  const finishEditingPortfolio = useCallback((portfolioId: string, newName: string) => {
    if (newName.trim()) {
      setPortfolios((prev) => prev.map((p) => 
        p.id === portfolioId ? { ...p, name: newName.trim() } : p
      ));
    }
    setEditingPortfolioId(null);
  }, []);

  const addTokenToPortfolio = useCallback((portfolioId: string, mint: string) => {
    if (!isValidMint(mint)) return;
    setPortfolios((prev) => prev.map((p) => 
      p.id === portfolioId ? { ...p, rows: [...p.rows, { mint }] } : p
    ));
    setCurrentInput("");
  }, []);

  const removeTokenFromPortfolio = useCallback((portfolioId: string, rowIndex: number) => {
    setPortfolios((prev) => prev.map((p) => 
      p.id === portfolioId ? { ...p, rows: p.rows.filter((_, i) => i !== rowIndex) } : p
    ));
  }, []);

  const shareUrl = useMemo(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("p", encodePortfolios(portfolios));
    return `${pathname}?${params.toString()}`;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [portfolios, pathname]);

  const copyShare = useCallback(async () => {
    const full = `${window.location.origin}${shareUrl}`;
    await navigator.clipboard.writeText(full);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [shareUrl]);

  const copyPortfolioShare = useCallback(async (portfolio: Portfolio) => {
    const singlePortfolio = [portfolio];
    const encoded = encodePortfolios(singlePortfolio);
    const full = `${window.location.origin}/builder?p=${encoded}`;
    await navigator.clipboard.writeText(full);
    setCopiedPortfolioId(portfolio.id);
    setTimeout(() => setCopiedPortfolioId(null), 1500);
  }, []);

  const applyToUrl = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("p", encodePortfolios(portfolios));
    router.replace(`${pathname}?${params.toString()}`);
  }, [portfolios, router, pathname, searchParams]);

  useEffect(() => {
    applyToUrl();
  }, [portfolios, applyToUrl]);

  // Fetch Jupiter prices for all valid mints
  const allValidMints = useMemo(() => {
    const mints = new Set<string>();
    portfolios.forEach(p => {
      p.rows.forEach(r => {
        if (isValidMint(r.mint)) mints.add(r.mint);
      });
    });
    return Array.from(mints);
  }, [portfolios]);

  useEffect(() => {
    if (allValidMints.length === 0) {
      setPrices({});
      setPriceChanges24h({});
      return;
    }
    const controller = new AbortController();
    const idsParam = encodeURIComponent(allValidMints.join(","));
    
    // Fetch Jupiter prices
    fetch(`https://price.jup.ag/v6/price?ids=${idsParam}`, { signal: controller.signal })
      .then((r) => r.json())
      .then((data) => {
        const nextPrices: Record<string, number> = {};
        const nextChanges: Record<string, number> = {};
        if (data && data.data) {
          for (const mint of allValidMints) {
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

    // Fetch 24h price changes from DexScreener
    allValidMints.forEach((mint) => {
      fetch(`https://api.dexscreener.com/latest/dex/tokens/${mint}`)
        .then((r) => r.json())
        .then((data) => {
          if (controller.signal.aborted) return;
          const pair = Array.isArray(data?.pairs) && data.pairs.length > 0 ? data.pairs[0] : undefined;
          const priceChange = pair?.priceChange?.h24;
          if (typeof priceChange === "number") {
            setPriceChanges24h((prev) => ({ ...prev, [mint]: priceChange }));
          }
        })
        .catch(() => {});
    });

    return () => controller.abort();
  }, [allValidMints]);

  // Fetch token metadata
  useEffect(() => {
    if (allValidMints.length === 0) return;
    let cancelled = false;
    fetch("https://tokens.jup.ag/tokens?includeDeprecated=false")
      .then((r) => r.json())
      .then((list: Array<{ address: string; symbol?: string; name?: string; logoURI?: string }>) => {
        if (cancelled) return;
        const map: Record<string, { symbol?: string; name?: string; logoURI?: string }> = {};
        for (const item of list) {
          if (item && item.address) {
            map[item.address] = { symbol: item.symbol, name: item.name, logoURI: item.logoURI };
          }
        }
        setTokenMeta(map);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [allValidMints.length]);

  // DexScreener fallback
  useEffect(() => {
    const missing = allValidMints.filter((m) => !(tokenMeta[m]?.symbol || extraMeta[m]?.symbol));
    if (missing.length === 0) return;
    let cancelled = false;
    missing.forEach((mint) => {
      fetch(`https://api.dexscreener.com/latest/dex/tokens/${mint}`)
        .then((r) => r.json())
        .then((data) => {
          if (cancelled) return;
          const pair = Array.isArray(data?.pairs) && data.pairs.length > 0 ? data.pairs[0] : undefined;
          const symbol = pair?.baseToken?.symbol;
          const name = pair?.baseToken?.name;
          const logoURI = pair?.info?.imageUrl;
          if (symbol || name || logoURI) {
            setExtraMeta((prev) => ({ ...prev, [mint]: { symbol, name, logoURI } }));
          }
        })
        .catch(() => {});
    });
    return () => {
      cancelled = true;
    };
  }, [allValidMints, tokenMeta, extraMeta]);

  // Pump.fun WebSocket
  useEffect(() => {
    setPumpStatus("connecting");
    let ws: WebSocket | null = null;
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
        const mintKey = typeof data?.mint === "string" ? data.mint : undefined;
        setPumpEvents((prev) => {
          if (mintKey) return { ...prev, [mintKey]: data };
          return { ...prev, _last: data };
        });
      } catch {
        // ignore parse errors
      }
    };
    ws.onerror = () => setPumpStatus("disconnected");
    ws.onclose = () => setPumpStatus("disconnected");

    return () => {
      ws?.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getPortfolioTotal = useCallback((portfolio: Portfolio) => {
    return portfolio.rows.reduce((sum, r) => {
      const price = prices[r.mint] ?? 0;
      return sum + price;
    }, 0);
  }, [prices]);

  const getPortfolioChange24h = useCallback((portfolio: Portfolio) => {
    const totalChange = portfolio.rows.reduce((sum, r) => {
      const priceChange = priceChanges24h[r.mint] ?? 0;
      return sum + priceChange;
    }, 0);
    return totalChange;
  }, [priceChanges24h]);

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
              <a href="/" className="text-sm text-white/60 hover:text-white">← Home </a>
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
              <h2 className="text-2xl font-semibold text-white mb-4">No portfolios yet</h2>
              <p className="text-white/60 mb-8">Create your first portfolio to start building and sharing your token collections.</p>
              <button
                onClick={handleCreatePortfolio}
                className="rounded-lg bg-[var(--brand-end)] hover:bg-[var(--brand-start)] px-8 py-4 text-lg font-medium text-white transition-colors"
              >
                Create Portfolio
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {portfolios.map((portfolio) => {
            const totalUsd = getPortfolioTotal(portfolio);
            const validRows = portfolio.rows.filter(r => isValidMint(r.mint));
            
            return (
              <div key={portfolio.id} className="rounded-xl border border-white/20 bg-white/5 overflow-hidden">
                {/* Portfolio Header */}
                <div 
                  className="p-4 sm:p-6 cursor-pointer hover:bg-white/5 transition-colors"
                  onClick={() => togglePortfolio(portfolio.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          {editingPortfolioId === portfolio.id ? (
                            <input
                              value={portfolio.name}
                              onChange={(e) => updatePortfolioName(portfolio.id, e.target.value)}
                              onBlur={() => finishEditingPortfolio(portfolio.id, portfolio.name)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  finishEditingPortfolio(portfolio.id, portfolio.name);
                                } else if (e.key === 'Escape') {
                                  setEditingPortfolioId(null);
                                }
                              }}
                              className="text-lg font-semibold bg-transparent border-none outline-none text-white placeholder-white/60"
                              placeholder="Portfolio name"
                              autoFocus
                            />
                          ) : (
                            <>
                              <span className="text-lg font-semibold text-white">{portfolio.name}</span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  startEditingPortfolio(portfolio.id);
                                }}
                                className="text-white/40 hover:text-white transition-colors text-sm"
                                title="Rename portfolio"
                              >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" fill="none"/>
                                  <path d="M12 8h4"/>
                                  <path d="M12 12h4"/>
                                  <path d="M12 16h4"/>
                                  <path d="M8 8h.01"/>
                                  <path d="M8 12h.01"/>
                                  <path d="M8 16h.01"/>
                                </svg>
                              </button>
                            </>
                          )}
                        </div>
                        <div className="text-sm text-white/60">
                          {validRows.length} token{validRows.length !== 1 ? 's' : ''} • ${totalUsd.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                          {(() => {
                            const change24h = getPortfolioChange24h(portfolio);
                            if (change24h !== 0) {
                              const isPositive = change24h > 0;
                              return (
                                <span className={`ml-2 ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
                                  {isPositive ? '+' : ''}{change24h.toFixed(2)}%
                                </span>
                              );
                            }
                            return null;
                          })()}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {validRows.length > 0 && (
                        <div className="flex gap-2">
                          {validRows.slice(0, 4).map((row, i) => {
                            const meta = tokenMeta[row.mint] || extraMeta[row.mint];
                            return (
                              <div key={i} className="relative group">
                                {meta?.logoURI ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img 
                                    src={meta.logoURI} 
                                    alt={meta.symbol || "token"} 
                                    className="h-16 w-16 rounded-lg border-2 border-white/20 object-cover"
                                  />
                                ) : (
                                  <div className="h-16 w-16 rounded-lg border-2 border-white/20 bg-white/10 flex items-center justify-center text-base">
                                    ?
                                  </div>
                                )}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    removeTokenFromPortfolio(portfolio.id, i);
                                  }}
                                  className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-red-500 text-white text-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                                >
                                  −
                                </button>
                              </div>
                            );
                          })}
                          {validRows.length > 4 && (
                            <div className="relative group">
                              <div className="h-16 w-16 rounded-lg border-2 border-white/20 bg-white/10 flex items-center justify-center text-lg relative overflow-hidden">
                                <div className="absolute inset-0 bg-gray-500/50"></div>
                                <span className="relative z-10 text-white font-bold">+</span>
                              </div>
                              <div className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-gray-500 text-white text-xs flex items-center justify-center shadow-lg">
                                {validRows.length - 4}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          copyPortfolioShare(portfolio);
                        }}
                        className="text-white/60 hover:text-white transition-colors text-sm flex items-center gap-1"
                        title="Share this portfolio"
                      >
                        {copiedPortfolioId === portfolio.id ? (
                          "✓ Copied!"
                        ) : (
                          <>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <circle cx="6" cy="12" r="3"/>
                              <circle cx="18" cy="7" r="3"/>
                              <circle cx="18" cy="17" r="3"/>
                              <path d="M8.5 10.5L15.5 7.5"/>
                              <path d="M8.5 13.5L15.5 16.5"/>
                            </svg>
                            Share
                          </>
                        )}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removePortfolio(portfolio.id);
                        }}
                        className="text-white/40 hover:text-red-400 transition-colors"
                      >
                        ✕
                      </button>
                      <div className="text-white/40">
                        {portfolio.isExpanded ? '▼' : '▶'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Portfolio Content */}
                {portfolio.isExpanded && (
                  <div className="border-t border-white/10 p-4 sm:p-6">
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm text-white/80 mb-2">Add Token to Portfolio</label>
                        <div className="flex gap-3">
                          <input
                            value={currentInput}
                            onChange={(e) => setCurrentInput(e.target.value)}
                            // Do not auto-add on blur or paste; require explicit Add/Enter
                            onBlur={() => {}}
                            onPaste={(e) => {
                              const text = e.clipboardData.getData("text");
                              const next = extractMintFromInput(text);
                              if (next) {
                                e.preventDefault();
                                setCurrentInput(next);
                              }
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                const next = extractMintFromInput(currentInput);
                                if (next) {
                                  addTokenToPortfolio(portfolio.id, next);
                                }
                              }
                            }}
                            placeholder="Paste token link or mint address..."
                            className="flex-1 rounded-md border border-white/20 bg-white/5 text-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--brand-end)]"
                          />
                          <button
                            onClick={() => {
                              const next = extractMintFromInput(currentInput);
                              if (next) {
                                addTokenToPortfolio(portfolio.id, next);
                              }
                            }}
                            className="rounded-md bg-[var(--brand-end)] hover:bg-[var(--brand-start)] px-4 py-2 text-sm text-white"
                          >
                            Add
                          </button>
                        </div>
                        <div className="text-xs text-white/60 mt-2">
                          Paste a pump.fun, bonk.fun, believe, or bags link, or enter a mint address directly
                        </div>
                      </div>
                    </div>
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