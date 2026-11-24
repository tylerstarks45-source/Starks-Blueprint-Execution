import React, { createContext, useContext, useEffect, useState } from 'react';

const PwaInstallContext = createContext(null);

export function PwaInstallProvider({ children }) {
  const [prompt, setPrompt] = useState(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches) setInstalled(true);
    const ready = (event) => { event.preventDefault(); setPrompt(event); };
    const complete = () => { setInstalled(true); setPrompt(null); };
    window.addEventListener('beforeinstallprompt', ready);
    window.addEventListener('appinstalled', complete);
    return () => {
      window.removeEventListener('beforeinstallprompt', ready);
      window.removeEventListener('appinstalled', complete);
    };
  }, []);

  const install = async () => {
    if (!prompt) return;
    setPrompt(null);
    try {
      const { outcome } = await prompt.prompt();
      if (outcome === 'accepted') setInstalled(true);
    } catch { /* Manual browser instructions remain available. */ }
  };

  return <PwaInstallContext.Provider value={{ installed, canInstall: !!prompt, install }}>{children}</PwaInstallContext.Provider>;
}

export function usePwaInstall() {
  return useContext(PwaInstallContext);
}
