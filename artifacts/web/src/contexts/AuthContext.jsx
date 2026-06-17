
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

    updateReactState(pb.authStore.model);
    setIsLoading(false);

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

  const signup = useCallback(async (email, password, name) => {
    try {
      await pb.collection('users').create({
        email,
        password,
        passwordConfirm: password,
        name: name || '',
      }, { $autoCancel: false });

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
  }), [currentUser, currentUserRole, isAuthenticated, isLoading, login, signup, logout, resetPassword, refreshCredits]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
