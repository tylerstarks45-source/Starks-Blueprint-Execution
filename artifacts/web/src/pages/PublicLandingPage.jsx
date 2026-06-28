import { useState } from 'react';
import { useParams } from 'react-router-dom';

export default function PublicLandingPage() {
  const { username, slug } = useParams();
  const [loaded, setLoaded] = useState(false);

  if (!username || !slug) {
    return (
      <div style={styles.wrap}>
        <div style={styles.card}>
          <div style={styles.emoji}>🔍</div>
          <h1 style={styles.h1}>Page Not Found</h1>
          <p style={styles.p}>This page doesn&apos;t exist or the link may have changed.</p>
        </div>
      </div>
    );
  }

  // Use direct src (not srcdoc) so server-delivered CSP headers apply to the iframe
  // and same-origin script access from parent is NOT granted (allow-same-origin omitted).
  const apiUrl = `/api/p/${encodeURIComponent(username)}/${encodeURIComponent(slug)}`;

  return (
    <div style={{ width: '100%', height: '100vh', background: '#050508', position: 'relative' }}>
      {/* Spinner shown until iframe fires onLoad */}
      {!loaded && (
        <div style={{ ...styles.wrap, position: 'absolute', inset: 0 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={styles.spinner} />
            <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 14, fontFamily: 'Outfit,sans-serif', marginTop: 16 }}>
              Loading…
            </p>
          </div>
          <style>{spinKeyframes}</style>
        </div>
      )}
      <iframe
        src={apiUrl}
        title={`${username}/${slug}`}
        onLoad={() => setLoaded(true)}
        style={{
          width: '100%',
          height: '100%',
          border: 'none',
          display: loaded ? 'block' : 'none',
        }}
        sandbox="allow-forms allow-scripts allow-popups allow-popups-to-escape-sandbox"
      />
    </div>
  );
}

const styles = {
  wrap: {
    background: '#050508',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    padding: 24,
  },
  card: {
    textAlign: 'center',
    maxWidth: 420,
  },
  emoji: { fontSize: 56, marginBottom: 20 },
  h1: { color: '#fff', fontSize: 26, fontWeight: 800, marginBottom: 10, fontFamily: 'Outfit,sans-serif' },
  p: { color: 'rgba(255,255,255,0.45)', fontSize: 15, lineHeight: 1.6, fontFamily: 'Outfit,sans-serif' },
  spinner: {
    width: 40,
    height: 40,
    border: '3px solid rgba(139,92,246,0.25)',
    borderTopColor: '#8B5CF6',
    borderRadius: '50%',
    animation: 'spin 0.75s linear infinite',
    margin: '0 auto',
  },
};

const spinKeyframes = `@keyframes spin{to{transform:rotate(360deg)}}`;
