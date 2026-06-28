import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';

export default function PublicLandingPage() {
  const { username, slug } = useParams();
  const iframeRef = useRef(null);
  const [status, setStatus] = useState('loading');
  const [errorCode, setErrorCode] = useState(null);
  const [html, setHtml] = useState('');

  useEffect(() => {
    if (!username || !slug) { setStatus('error'); setErrorCode(404); return; }
    setStatus('loading');
    fetch(`/api/p/${encodeURIComponent(username)}/${encodeURIComponent(slug)}`, { redirect: 'follow' })
      .then(r => {
        if (!r.ok) { setErrorCode(r.status); throw new Error(String(r.status)); }
        return r.text();
      })
      .then(pageHtml => { setHtml(pageHtml); setStatus('ready'); })
      .catch(() => setStatus('error'));
  }, [username, slug]);

  useEffect(() => {
    if (status === 'ready' && iframeRef.current && html) {
      iframeRef.current.srcdoc = html;
    }
  }, [status, html]);

  if (status === 'loading') {
    return (
      <div style={{ background: '#050508', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: 40, height: 40,
            border: '3px solid rgba(139,92,246,0.25)',
            borderTopColor: '#8B5CF6',
            borderRadius: '50%',
            animation: 'spin 0.75s linear infinite',
            margin: '0 auto 16px',
          }} />
          <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 14, fontFamily: 'Outfit,sans-serif' }}>Loading…</p>
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    const is403 = errorCode === 403;
    return (
      <div style={{ background: '#050508', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: 24 }}>
        <div style={{ textAlign: 'center', maxWidth: 420 }}>
          <div style={{ fontSize: 56, marginBottom: 20 }}>{is403 ? '🔒' : '🔍'}</div>
          <h1 style={{ color: '#fff', fontSize: 26, fontWeight: 800, marginBottom: 10, fontFamily: 'Outfit,sans-serif' }}>
            {is403 ? 'Page Unavailable' : 'Page Not Found'}
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 15, lineHeight: 1.6, fontFamily: 'Outfit,sans-serif' }}>
            {is403
              ? 'This page hasn\'t been published yet. Check back soon!'
              : 'This page doesn\'t exist or the link may have changed.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <iframe
      ref={iframeRef}
      title={`${username}/${slug}`}
      style={{ width: '100%', height: '100vh', border: 'none', display: 'block' }}
      sandbox="allow-forms allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"
    />
  );
}
