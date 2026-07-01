import React, { createContext, useContext, useState, useCallback } from 'react';

const BusinessContext = createContext(undefined);

const STORAGE_KEY = 'sbep_active_business';

export function BusinessProvider({ children }) {
  const [activeBusiness, setActiveBusinessState] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const setActiveBusiness = useCallback((business) => {
    setActiveBusinessState(business);
    if (business) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(business));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const clearBusiness = useCallback(() => {
    setActiveBusinessState(null);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return (
    <BusinessContext.Provider value={{ activeBusiness, setActiveBusiness, clearBusiness }}>
      {children}
    </BusinessContext.Provider>
  );
}

export function useBusiness() {
  const ctx = useContext(BusinessContext);
  if (ctx === undefined) throw new Error('useBusiness must be used within a BusinessProvider');
  return ctx;
}
