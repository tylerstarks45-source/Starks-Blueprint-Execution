import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet';
import { Link } from 'react-router-dom';
import { MonitorDown } from 'lucide-react';
import { btn, btnPrimary } from '@/components/empire/ui.jsx';

export default function DownloadPage() {
  const [installer, setInstaller] = useState(null);
  const [installed, setInstalled] = useState(() => globalThis.matchMedia?.('(display-mode: standalone)').matches === true);
  useEffect(() => {
    const request = (event) => { event.preventDefault(); setInstaller(event); };
    const complete = () => { setInstalled(true); setInstaller(null); };
    window.addEventListener('beforeinstallprompt', request);
    window.addEventListener('appinstalled', complete);
    return () => {
      window.removeEventListener('beforeinstallprompt', request);
      window.removeEventListener('appinstalled', complete);
    };
  }, []);

  const install = async () => {
    if (!installer) return;
    setInstaller(null);
    try {
      const { outcome } = await installer.prompt();
      if (outcome === 'accepted') setInstalled(true);
    } catch { /* Manual browser instructions stay visible. */ }
  };

  return (
    <main className="min-h-screen bg-slate-950 px-5 py-12 text-white">
      <Helmet><title>Install Starks Global Group</title></Helmet>
      <div className="mx-auto max-w-2xl space-y-6">
        <Link to="/" className="text-sm text-cyan-200 underline">Starks Global Group</Link>
        <h1 className="flex items-center gap-3 text-3xl font-semibold"><MonitorDown aria-hidden="true" className="h-8 w-8 text-cyan-300" /> Install Starks Global Group</h1>
        <section className="space-y-3 rounded-xl border border-white/15 bg-white/5 p-5">
          <h2 className="text-xl font-medium">Install from your browser</h2>
          <p className="text-sm text-white/75">Open Starks in its own desktop window. Sign in to use the same platform and ASH conversation tools. This does not give ASH access to files or other apps.</p>
          {installed ? <p role="status" className="text-sm text-emerald-200">Starks is installed.</p> : installer ? (
            <button type="button" className={btnPrimary} onClick={install}>Install web app</button>
          ) : (
            <p className="text-sm text-white/65">In Chrome or Edge, use the browser menu to install this site as an app. In Safari on Mac, choose File → Add to Dock.</p>
          )}
        </section>
        <section className="space-y-2 rounded-xl border border-white/15 bg-white/5 p-5">
          <h2 className="text-xl font-medium">Native desktop app</h2>
          <p className="text-sm text-white/75">Signed native installers are not available yet. Desktop permissions will be separate from signing in to Starks.</p>
        </section>
        <Link to="/dashboard" className={btn}>Open dashboard</Link>
      </div>
    </main>
  );
}
