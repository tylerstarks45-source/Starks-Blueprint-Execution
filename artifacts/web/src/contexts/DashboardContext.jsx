import React, { createContext, useContext, useState, useEffect, useMemo, useRef, useCallback } from 'react';

const DashboardContext = createContext();

export const useDashboard = () => useContext(DashboardContext);

export const DashboardProvider = ({ children }) => {
  const initialRole = localStorage.getItem('userRole') || 'USER';

  const [isLoading, setIsLoading] = useState(false);
  const [role, setRole] = useState(initialRole);
  const hasInitialized = useRef(false);

  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    const token = localStorage.getItem('sbep_auth_token');
    if (!token) return;

    fetch('/api/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.ok ? r.json() : null)
      // /api/auth/me returns { user: { role, ... } } — read the nested user
      .then(data => {
        const serverRole = data?.user?.role;
        if (serverRole) {
          setRole(serverRole);
          localStorage.setItem('userRole', serverRole);
        }
      })
      .catch(() => {});
  }, []);

  const updateDashboardState = useCallback(() => {}, []);

  const value = useMemo(() => ({
    role,
    isLoading,
    updateDashboardState,
  }), [role, isLoading, updateDashboardState]);

  return (
    <DashboardContext.Provider value={value}>
      {children}
    </DashboardContext.Provider>
  );
};
