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

/**
 * Convert a 3- or 6-digit hex color to an "H S% L%" triplet string that can
 * be used directly inside a CSS `hsl()` call, e.g. "220 89% 55%".
 * Tailwind stores color tokens as `hsl(var(--primary))`, so the variable must
 * contain the bare triplet without the `hsl()` wrapper.
 */
function hexToHslTriplet(hex) {
  const clean = hex.replace(/^#/, '');
  const full = clean.length === 3
    ? clean.split('').map(c => c + c).join('')
    : clean;
  const r = parseInt(full.slice(0, 2), 16) / 255;
  const g = parseInt(full.slice(2, 4), 16) / 255;
  const b = parseInt(full.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0, s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

function applyTheme(config) {
  const root = document.documentElement;
  if (config.primaryColor) {
    // --wl-primary stays as hex for direct use (e.g. inline styles, SVG fills)
    root.style.setProperty('--wl-primary', config.primaryColor);
    // --primary must be an HSL triplet because Tailwind uses hsl(var(--primary))
    root.style.setProperty('--primary', hexToHslTriplet(config.primaryColor));
  }
  if (config.accentColor) {
    root.style.setProperty('--wl-accent', config.accentColor);
    root.style.setProperty('--accent', hexToHslTriplet(config.accentColor));
  }
  if (config.brandName) {
    document.title = config.brandName;
  }
}
