import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext.jsx';

const BusinessContext = createContext(undefined);

const STORAGE_KEY = 'sbep_active_business';

export function BusinessProvider({ children }) {
  const { currentUser, isLoading } = useAuth();
  const userId = currentUser?.id ?? null;
  // Stored as { ownerId, business } so one account never sees another's selection on a shared browser.
  const [stored, setStored] = useState(() => {
    try {
      const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
      return raw && 'ownerId' in raw ? raw : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    if (isLoading || !stored) return;
    if (String(stored.ownerId) !== String(userId)) {
      setStored(null);
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [userId, isLoading, stored]);

  const activeBusiness = stored && String(stored.ownerId) === String(userId) ? stored.business : null;

  const setActiveBusiness = useCallback((business) => {
    if (business && userId != null) {
      const next = { ownerId: userId, business };
      setStored(next);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } else {
      setStored(null);
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [userId]);

  const clearBusiness = useCallback(() => {
    setStored(null);
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
