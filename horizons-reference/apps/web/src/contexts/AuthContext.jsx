
import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import pb from '@/lib/pocketbaseClient.js';
import { toast } from 'sonner';

const AuthContext = createContext();

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
  
  // 1. Use useRef to track if auth listener is already attached
  const listenerAttachedRef = useRef(false);

  // Helper to strictly update React state without triggering PocketBase auth methods
  const updateReactState = useCallback((model) => {
    if (model) {
      const role = model.role || localStorage.getItem('userRole') || 'USER';
      setCurrentUser({
        id: model.id,
        email: model.email,
        role: role
      });
      setCurrentUserRole(role);
      setIsAuthenticated(true);
      localStorage.setItem('userRole', role);
    } else {
      setCurrentUser(null);
      setCurrentUserRole(null);
      setIsAuthenticated(false);
      localStorage.removeItem('userRole');
    }
  }, []);

  useEffect(() => {
    // 2. Attach PocketBase auth change listener ONLY ONCE using the ref guard
    if (listenerAttachedRef.current) return;
    listenerAttachedRef.current = true;

    // 4. Initialize currentUser from pb.authStore.model on component mount
    updateReactState(pb.authStore.model);
    setIsLoading(false);

    // Attach listener
    const unsubscribe = pb.authStore.onChange((token, model) => {
      // 3. Auth change listener ONLY updates React state
      // CRITICAL: DO NOT call pb.authStore.clear(), pb.authStore.save(), or any auth methods here
      updateReactState(model);
    });

    // 9. Ensure cleanup
    return () => {
      unsubscribe();
      listenerAttachedRef.current = false;
    };
  }, [updateReactState]);

  const login = useCallback(async (email, password) => {
    try {
      // 5. Call authWithPassword - let PocketBase update its auth store, 
      // the listener will fire and update React state automatically.
      const authData = await pb.collection('users').authWithPassword(email, password, {
        $autoCancel: false
      });
      
      return { success: true, data: authData };
    } catch (error) {
      console.error("Login Error:", error);
      return { success: false, error: error.message || "Invalid credentials." };
    }
  }, []);

  const signup = useCallback(async (email, password) => {
    try {
      // 7. Call create() then authWithPassword() - let PocketBase handle auth store updates.
      await pb.collection('users').create({
        email,
        password,
        passwordConfirm: password,
      }, { $autoCancel: false });

      await pb.collection('users').requestVerification(email, { $autoCancel: false });
      
      const authData = await pb.collection('users').authWithPassword(email, password, { $autoCancel: false });
      
      return { success: true, data: authData };
    } catch (error) {
      console.error("Signup Error:", error);
      return { success: false, error: error.message || "Failed to create account." };
    }
  }, []);

  const logout = useCallback(() => {
    // 6. Call pb.authStore.clear() ONLY in the logout function itself
    pb.authStore.clear();
    localStorage.removeItem('pb_token');
    
    // Manually update React state just to be safe, though the listener will also catch this
    updateReactState(null);
    
    toast.success("Successfully logged out.");
  }, [updateReactState]);

  const resetPassword = useCallback(async (email) => {
    try {
      await pb.collection('users').requestPasswordReset(email, { $autoCancel: false });
      return { success: true };
    } catch (error) {
      console.error("Reset Password Error:", error);
      return { success: false, error: error.message || "Failed to send reset link." };
    }
  }, []);

  const value = useMemo(() => ({
    currentUser,
    currentUserRole,
    isAuthenticated,
    isLoading,
    login,
    signup,
    logout,
    resetPassword
  }), [currentUser, currentUserRole, isAuthenticated, isLoading, login, signup, logout, resetPassword]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
