
import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import pb from '@/lib/pocketbaseClient.js';
import { toast } from 'sonner';

export const AuthContext = createContext(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [currentUserRole, setCurrentUserRole] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  const listenerAttachedRef = useRef(false);

  const updateReactState = useCallback((model) => {
    if (model) {
      const role = model.role || localStorage.getItem('userRole') || 'USER';
      const creditsBalance = model.creditsBalance ?? 0;
      const walletBalance = model.walletBalance ?? 0;
      setCurrentUser({
        id: model.id,
        email: model.email,
        name: model.name || model.email?.split('@')[0] || '',
        role: role,
        membershipTier: model.membershipTier || model.membership_tier || 'free',
        creditsBalance,
        walletBalance,
        onboardingCompleted: model.onboardingCompleted ?? false,
      });
      setCurrentUserRole(role);
      setIsAuthenticated(true);
      localStorage.setItem('userRole', role);
      // Fire out-of-credits event for everyone when total balance hits zero
      // (admins can dismiss the modal; regular users get hard-blocked by the modal)
      if (creditsBalance + walletBalance <= 0) {
        window.dispatchEvent(new CustomEvent('sbep:out-of-credits', { detail: { code: 'out_of_credits' } }));
      }
    } else {
      setCurrentUser(null);
      setCurrentUserRole(null);
      setIsAuthenticated(false);
      localStorage.removeItem('userRole');
    }
  }, []);

  useEffect(() => {
    if (listenerAttachedRef.current) return;
    listenerAttachedRef.current = true;

    // Optimistically render the cached session immediately (avoids a flash
    // of "logged out" on every page load), but then re-verify it against the
    // server. This closes the gap where a device could be trusting a stale
    // or tampered `localStorage` user object indefinitely (7-day token) —
    // if the token is invalid/expired, or the server's current record for
    // that user id no longer matches what's cached, we clear the session
    // and force a fresh login instead of silently showing wrong/stale data.
    const cachedModel = pb.authStore.model;
    updateReactState(cachedModel);

    const verifySession = async () => {
      const token = pb.authStore.token;
      if (!token) {
        setIsLoading(false);
        return;
      }
      try {
        const res = await fetch('/api/auth/me', {
          headers: { Authorization: `Bearer ${token}` },
        });
        // Guard against a race: if auth state changed (e.g. a new login
        // completed, or logout happened) while this request was in flight,
        // this response refers to the OLD token and must not clobber the
        // newer session that's now active.
        if (pb.authStore.token !== token) return;
        if (!res.ok) {
          pb.authStore.clear();
          updateReactState(null);
          return;
        }
        const { user: freshUser } = await res.json();
        if (pb.authStore.token !== token) return;
        // Refresh with the server's authoritative record (id/role/credits),
        // in case the cached copy was stale.
        pb.authStore.save(token, freshUser);
        updateReactState(freshUser);
      } catch {
        // Network error verifying session — keep the optimistic cached
        // state rather than logging the user out on a flaky connection.
      } finally {
        setIsLoading(false);
      }
    };
    verifySession();

    const unsubscribe = pb.authStore.onChange((_token, model) => {
      updateReactState(model);
    });

    return () => {
      unsubscribe();
      listenerAttachedRef.current = false;
    };
  }, [updateReactState]);

  const login = useCallback(async (email, password) => {
    try {
      const authData = await pb.collection('users').authWithPassword(email, password, {
        $autoCancel: false
      });
      return { success: true, data: authData };
    } catch (error) {
      console.error("Login Error:", error);
      return { success: false, error: error.message || "Invalid credentials." };
    }
  }, []);

  const signup = useCallback(async (email, password, name, referralCode) => {
    try {
      const createData = {
        email,
        password,
        passwordConfirm: password,
        name: name || '',
      };
      if (referralCode) createData.referralCode = referralCode;
      await pb.collection('users').create(createData, { $autoCancel: false });

      const authData = await pb.collection('users').authWithPassword(email, password, { $autoCancel: false });
      return { success: true, data: authData };
    } catch (error) {
      console.error("Signup Error:", error);
      return { success: false, error: error.message || "Failed to create account." };
    }
  }, []);

  const logout = useCallback(() => {
    pb.authStore.clear();
    localStorage.removeItem('pb_token');
    updateReactState(null);
    toast.success("Successfully logged out.");
  }, [updateReactState]);

  const resetPassword = useCallback(async (email) => {
    try {
      const res = await fetch('/api/auth/request-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) return { success: false, error: data.error || 'Failed to send reset link.' };
      return { success: true };
    } catch (error) {
      return { success: false, error: 'Network error. Please try again.' };
    }
  }, []);

  // Re-fetch the authoritative user record (id/role/tier/credits) from the
  // server and update both the pb authStore and React state. Used after events
  // that change the server-side record out-of-band — e.g. a Stripe webhook
  // upgrading the membership tier after checkout — so the app reflects the new
  // tier without requiring a full reload.
  const refreshUser = useCallback(async () => {
    const token = localStorage.getItem('sbep_auth_token');
    if (!token) return null;
    try {
      const res = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return null;
      const { user: freshUser } = await res.json();
      if (pb.authStore.token !== token) return null;
      pb.authStore.save(token, freshUser);
      updateReactState(freshUser);
      return freshUser;
    } catch {
      return null;
    }
  }, [updateReactState]);

  const refreshCredits = useCallback(async () => {
    const token = localStorage.getItem('sbep_auth_token');
    if (!token) return;
    try {
      const res = await fetch('/api/credits/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      const creditsBalance = data.balance ?? 0;
      const walletBalance = data.walletBalance ?? 0;
      setCurrentUser(prev => {
        if (!prev) return prev;
        return { ...prev, creditsBalance, walletBalance };
      });
      if (creditsBalance + walletBalance <= 0) {
        window.dispatchEvent(new CustomEvent('sbep:out-of-credits', { detail: { code: 'out_of_credits' } }));
      }
    } catch { /* ignore */ }
  }, []);

  const _patchOnboardingFlag = useCallback(async (value) => {
    setCurrentUser(prev => prev ? { ...prev, onboardingCompleted: value } : prev);
    const token = localStorage.getItem('sbep_auth_token');
    if (!token) return;
    try {
      await fetch('/api/users/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ onboardingCompleted: value }),
      });
      if (pb.authStore.model) {
        const updatedModel = { ...pb.authStore.model, onboardingCompleted: value };
        pb.authStore.save(token, updatedModel);
      }
    } catch { /* non-blocking */ }
  }, []);

  const completeOnboarding = useCallback(() => _patchOnboardingFlag(true), [_patchOnboardingFlag]);
  const resetOnboarding = useCallback(() => _patchOnboardingFlag(false), [_patchOnboardingFlag]);

  const value = useMemo(() => ({
    currentUser,
    currentUserRole,
    isAuthenticated,
    isLoading,
    login,
    signup,
    logout,
    resetPassword,
    refreshCredits,
    refreshUser,
    completeOnboarding,
    resetOnboarding,
  }), [currentUser, currentUserRole, isAuthenticated, isLoading, login, signup, logout, resetPassword, refreshCredits, refreshUser, completeOnboarding, resetOnboarding]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
