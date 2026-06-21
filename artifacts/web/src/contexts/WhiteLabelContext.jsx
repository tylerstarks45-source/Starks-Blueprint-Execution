import React, { createContext, useContext, useEffect, useState } from 'react';

const WhiteLabelContext = createContext(null);

/**
 * Detects whether the current hostname matches a white-label domain,
 * fetches the brand config, and injects CSS custom properties.
 *
 * Falls back transparently to Starks Global Group defaults when
 * no white-label config is found for the current host.
 */
export function WhiteLabelProvider({ children }) {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const host = window.location.hostname;
    const knownHosts = ['localhost', 'starksglobalgroup.net'];
    const isKnownHost =
      knownHosts.includes(host) ||
      host.endsWith('.replit.dev') ||
      host.endsWith('.replit.app') ||
      host.endsWith('.repl.co');

    if (isKnownHost) {
      setLoading(false);
      return;
    }

    fetch(`/api/white-label/by-domain/${encodeURIComponent(host)}`)
      .then(r => (r.ok ? r.json() : null))
      .then(data => {
        if (data) {
          setConfig(data);
          applyTheme(data);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <WhiteLabelContext.Provider value={{ config, loading }}>
      {children}
    </WhiteLabelContext.Provider>
  );
}

export function useWhiteLabel() {
  return useContext(WhiteLabelContext);
}

function applyTheme(config) {
  const root = document.documentElement;
  if (config.primaryColor) {
    root.style.setProperty('--wl-primary', config.primaryColor);
    root.style.setProperty('--primary', config.primaryColor);
  }
  if (config.accentColor) {
    root.style.setProperty('--wl-accent', config.accentColor);
  }
  if (config.brandName) {
    document.title = config.brandName;
  }
}
