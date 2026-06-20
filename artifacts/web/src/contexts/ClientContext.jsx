import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

const ClientContext = createContext(undefined);

const STORAGE_KEY = 'sbep_active_client_workspace';

export function ClientProvider({ children }) {
  const [activeWorkspace, setActiveWorkspaceState] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const setActiveWorkspace = useCallback((workspace) => {
    setActiveWorkspaceState(workspace);
    if (workspace) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(workspace));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const clearWorkspace = useCallback(() => {
    setActiveWorkspaceState(null);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return (
    <ClientContext.Provider value={{ activeWorkspace, setActiveWorkspace, clearWorkspace }}>
      {children}
    </ClientContext.Provider>
  );
}

export function useClient() {
  const ctx = useContext(ClientContext);
  if (ctx === undefined) throw new Error('useClient must be used within a ClientProvider');
  return ctx;
}
