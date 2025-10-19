"use client";

import { useState } from "react";
import JumpingDots from './JumpingDots';

interface SignInModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (username: string, userId: string) => void;
  onSwitchToSignUp: () => void;
}

export default function SignInModal({ isOpen, onClose, onSuccess, onSwitchToSignUp }: SignInModalProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Handle keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Allow Ctrl+A (or Cmd+A on Mac) to select all
    if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
      e.preventDefault();
      const target = e.target as HTMLInputElement;
      target.select();
    }
  };



  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    
    if (!username.trim() || !password) {
      setError("Please fill in all fields");
      return;
    }

    setIsLoading(true);
    
    try {
      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'signin', username, password })
      });

      const data = await response.json();

      if (data.success) {
        onSuccess(data.user.username, data.user.id);
        setUsername("");
        setPassword("");
        setError("");
      } else {
        setError(data.error || "Sign in failed");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" data-auth-modal>
      <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-white">Sign In</h2>
          <button
            onClick={onClose}
            className="text-white/60 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-500/20 border border-red-500/50 rounded-md p-3 text-red-400 text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm text-white/80 mb-2">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full rounded-md border border-white/20 bg-white/5 text-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--brand-end)]"
              placeholder="Enter your username"
              disabled={isLoading}
            />
          </div>

          <div>
            <label className="block text-sm text-white/80 mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full rounded-md border border-white/20 bg-white/5 text-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--brand-end)]"
              placeholder="Enter your password"
              disabled={isLoading}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-md border border-white/20 bg-white/5 text-white px-4 py-2 text-sm hover:bg-white/10 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 rounded-md bg-[var(--brand-end)] hover:bg-[var(--brand-start)] px-4 py-2 text-sm text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <JumpingDots className="text-white" />
                </div>
              ) : "Sign In"}
            </button>
          </div>

          <div className="text-center pt-2">
            <button
              type="button"
              onClick={onSwitchToSignUp}
              className="text-sm text-white/60 hover:text-white transition-colors"
            >
              Don&apos;t have an account? Sign up
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
