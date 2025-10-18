"use client";

import { useState, useEffect, useCallback } from "react";
import JumpingDots from './JumpingDots';

interface AccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (username: string, userId: string) => void;
  onSwitchToSignIn: () => void;
}

export default function AccountModal({ isOpen, onClose, onSuccess, onSwitchToSignIn }: AccountModalProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');
  const [usernameDebounceTimer, setUsernameDebounceTimer] = useState<NodeJS.Timeout | null>(null);

  // Function to check username availability
  const checkUsernameAvailability = useCallback(async (usernameToCheck: string) => {
    if (!usernameToCheck.trim() || usernameToCheck.length < 3) {
      setUsernameStatus('idle');
      return;
    }

    setUsernameStatus('checking');
    
    try {
      const response = await fetch('/api/check-username', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: usernameToCheck })
      });

      const data = await response.json();
      
      if (data.available) {
        setUsernameStatus('available');
        // Clear any existing username error
        setErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors.username;
          return newErrors;
        });
      } else {
        setUsernameStatus('taken');
        setErrors(prev => ({
          ...prev,
          username: data.error || 'Username is already taken'
        }));
      }
    } catch (error) {
      console.error('Error checking username:', error);
      setUsernameStatus('idle');
    }
  }, []);

  // Debounced username validation
  useEffect(() => {
    // Clear existing timer
    if (usernameDebounceTimer) {
      clearTimeout(usernameDebounceTimer);
    }

    // Set new timer
    const timer = setTimeout(() => {
      if (username.trim()) {
        checkUsernameAvailability(username);
      } else {
        setUsernameStatus('idle');
      }
    }, 500); // 500ms debounce

    setUsernameDebounceTimer(timer);

    // Cleanup
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [username, checkUsernameAvailability]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (usernameDebounceTimer) {
        clearTimeout(usernameDebounceTimer);
      }
    };
  }, []);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!username.trim()) {
      newErrors.username = "Username is required";
    } else if (username.length < 3) {
      newErrors.username = "Username must be at least 3 characters";
    } else if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      newErrors.username = "Username can only contain letters, numbers, and underscores";
    } else if (usernameStatus === 'taken') {
      newErrors.username = "Username is already taken";
    } else if (usernameStatus === 'checking') {
      newErrors.username = "Checking username availability...";
    }

    if (!password) {
      newErrors.password = "Password is required";
    } else if (password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = "Please confirm your password";
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Don't submit if username is not available
    if (usernameStatus !== 'available') {
      setErrors({ username: 'Please wait for username validation or choose a different username' });
      return;
    }
    
    if (!validateForm()) return;

    setIsLoading(true);
    
    try {
      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'signup', username, password })
      });

      const data = await response.json();

      if (data.success) {
        onSuccess(data.user.username, data.user.id);
        
        // Reset form
        setUsername("");
        setPassword("");
        setConfirmPassword("");
        setErrors({});
      } else {
        setErrors({ username: data.error || "Account creation failed" });
      }
    } catch {
      setErrors({ username: "Network error. Please try again." });
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-white">Create Account</h2>
          <button
            onClick={onClose}
            className="text-white/60 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-white/80 mb-2">Username</label>
            <div className="relative">
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className={`w-full rounded-md border px-3 py-2 pr-10 text-sm outline-none focus:ring-2 ${
                  errors.username 
                    ? "border-red-400 focus:ring-red-400 bg-red-500/10" 
                    : usernameStatus === 'available'
                    ? "border-green-400 focus:ring-green-400 bg-green-500/10"
                    : "border-white/20 bg-white/5 text-white focus:ring-[var(--brand-end)]"
                }`}
                placeholder="Enter your username"
              />
              {/* Username status indicator */}
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                {usernameStatus === 'checking' && (
                  <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin"></div>
                )}
                {usernameStatus === 'available' && (
                  <span className="text-green-400 text-sm">✓</span>
                )}
                {usernameStatus === 'taken' && (
                  <span className="text-red-400 text-sm">✗</span>
                )}
              </div>
            </div>
            {errors.username && (
              <p className="text-red-400 text-xs mt-1">{errors.username}</p>
            )}
            {usernameStatus === 'available' && !errors.username && (
              <p className="text-green-400 text-xs mt-1">Username is available!</p>
            )}
          </div>

          <div>
            <label className="block text-sm text-white/80 mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 ${
                errors.password 
                  ? "border-red-400 focus:ring-red-400 bg-red-500/10" 
                  : "border-white/20 bg-white/5 text-white focus:ring-[var(--brand-end)]"
              }`}
              placeholder="Enter your password"
            />
            {errors.password && (
              <p className="text-red-400 text-xs mt-1">{errors.password}</p>
            )}
          </div>

          <div>
            <label className="block text-sm text-white/80 mb-2">Confirm Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={`w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 ${
                errors.confirmPassword 
                  ? "border-red-400 focus:ring-red-400 bg-red-500/10" 
                  : "border-white/20 bg-white/5 text-white focus:ring-[var(--brand-end)]"
              }`}
              placeholder="Confirm your password"
            />
            {errors.confirmPassword && (
              <p className="text-red-400 text-xs mt-1">{errors.confirmPassword}</p>
            )}
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
              ) : "Create Account"}
            </button>
          </div>

          <div className="text-center pt-2">
            <button
              type="button"
              onClick={onSwitchToSignIn}
              className="text-sm text-white/60 hover:text-white transition-colors"
            >
              Already have an account? Sign in
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
