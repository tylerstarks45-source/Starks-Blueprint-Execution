import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

const CreditsModalContext = createContext({ show: () => {}, hide: () => {} });

export const useCreditsModal = () => useContext(CreditsModalContext);

export const CreditsModalProvider = ({ children }) => {
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState(null);

  const show = useCallback((d) => { setDetail(d ?? null); setOpen(true); }, []);
  const hide = useCallback(() => setOpen(false), []);

  useEffect(() => {
    const handler = (e) => show(e.detail);
    window.addEventListener('sbep:out-of-credits', handler);
    return () => window.removeEventListener('sbep:out-of-credits', handler);
  }, [show]);

  return (
    <CreditsModalContext.Provider value={{ show, hide, open, detail }}>
      {children}
    </CreditsModalContext.Provider>
  );
};
