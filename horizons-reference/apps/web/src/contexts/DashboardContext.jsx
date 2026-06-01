import React, { createContext, useContext, useState, useEffect, useMemo, useRef, useCallback } from 'react';
import pb from '@/lib/pocketbaseClient';

const DashboardContext = createContext();

export const useDashboard = () => useContext(DashboardContext);

export const DashboardProvider = ({ children }) => {
  // Initialize synchronously to prevent blocking the initial render
  const initialRole = pb.authStore.model?.role || localStorage.getItem('userRole') || 'USER';
  
  const [isLoading, setIsLoading] = useState(false); // Default to false so UI renders immediately
  const [role, setRole] = useState(initialRole);
  const hasInitialized = useRef(false);

  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;
    
    console.log('DashboardContext: Initialized once on mount');
    
    // Double check role on mount in case it changed
    const currentRole = pb.authStore.model?.role || localStorage.getItem('userRole') || 'USER';
    if (currentRole !== role) {
      setRole(currentRole);
    }
  }, [role]);

  const updateDashboardState = useCallback((newState) => {
    console.log('Dashboard state updated', newState);
  }, []);

  const value = useMemo(() => ({
    role,
    isLoading,
    updateDashboardState
  }), [role, isLoading, updateDashboardState]);

  return (
    <DashboardContext.Provider value={value}>
      {children}
    </DashboardContext.Provider>
  );
};