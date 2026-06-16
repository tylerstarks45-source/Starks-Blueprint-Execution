export function SocialPage() {
  const platforms = [
    { name: 'TikTok', icon: '🎵', connected: true, handle: '@yourtiktok', color: '#ff0050', glow: '#ff005040', caps: ['Post videos automatically', 'Track follower growth', 'Analyze viral content', 'Schedule content drops'] },
    { name: 'Instagram', icon: '📸', connected: true, handle: '@yourinstagram', color: '#e1306c', glow: '#e1306c40', caps: ['Publish posts & Reels', 'Schedule story content', 'Track post performance', 'Generate AI captions'] },
    { name: 'Facebook', icon: '👥', connected: false, handle: 'Your Page', color: '#1877f2', glow: '#1877f240', caps: ['Auto-publish to Pages', 'Manage ad campaigns', 'Track page analytics', 'Generate ad creatives'] },
    { name: 'X (Twitter)', icon: '✖️', connected: false, handle: '@yourhandle', color: '#e7e9ea', glow: '#e7e9ea30', caps: ['Auto-tweet threads', 'Track engagement', 'Viral content detection', 'Schedule campaigns'] },
    { name: 'LinkedIn', icon: '💼', connected: false, handle: 'Your Profile', color: '#0077b5', glow: '#0077b540', caps: ['Publish thought-leadership', 'Generate B2B leads', 'Track post analytics', 'Connection automation'] },
    { name: 'Snapchat', icon: '👻', connected: false, handle: '@yoursnap', color: '#fffc00', glow: '#fffc0040', caps: ['Automate story posting', 'Run Snap ad campaigns', 'Target audiences', 'Track story views'] },
    { name: 'YouTube', icon: '▶️', connected: false, handle: '@yourchannel', color: '#ff0000', glow: '#ff000040', caps: ['Upload & schedule videos', 'Optimize thumbnails', 'Track subscriber growth', 'Revenue analytics'] },
  ];

  const connectedCount = platforms.filter(p => p.connected).length;

  return (
    <div className="min-h-screen bg-[#050510] text-white" style={{ fontFamily: "'Space Mono', 'Outfit', monospace" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Outfit:wght@400;500;600;700;900&display=swap');
        .card-hover { transition: all 0.3s ease; }
        .card-hover:hover { transform: translateY(-2px); }
        .bg-glass { background: rgba(255,255,255,0.03); backdrop-filter: blur(12px); }
      `}</style>

      {/* Header */}
      <div className="border-b border-white/8 px-6 py-4 flex items-center justify-between" style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(20px)' }}>
        <div className="flex items-center gap-3">
          <div style={{ width: 32, height: 32, borderRadius: 10, background: 'linear-gradient(135deg, #7c3aed, #4f46e5)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>S</div>
          <span style={{ fontFamily: 'Outfit', fontWeight: 700, fontSize: 16, color: 'rgba(255,255,255,0.9)' }}>Starks Global Group</span>
        </div>
        <nav className="flex items-center gap-6">
          {['Dashboard', 'Builder', 'Blueprints', 'Connections', 'Social', 'Marketplace'].map(item => (
            <span key={item} style={{ fontSize: 13, color: item === 'Social' ? '#a78bfa' : 'rgba(255,255,255,0.4)', fontFamily: 'Outfit', fontWeight: 500, cursor: 'pointer', borderBottom: item === 'Social' ? '2px solid #a78bfa' : 'none', paddingBottom: 2 }}>{item}</span>
          ))}
        </nav>
      </div>

      <main className="max-w-7xl mx-auto px-6 py-12">
        {/* Hero */}
        <div className="text-center mb-14">
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 16px', borderRadius: 999, background: 'rgba(124,58,237,0.12)', border: '1px solid rgba(124,58,237,0.25)', marginBottom: 20 }}>
            <span style={{ fontSize: 11, color: '#a78bfa', fontFamily: 'Space Mono', fontWeight: 700, letterSpacing: '0.12em' }}>⚡ ASH SOCIAL INTELLIGENCE</span>
          </div>
          <h1 style={{ fontFamily: 'Outfit', fontWeight: 900, fontSize: 48, lineHeight: 1.1, marginBottom: 16, background: 'linear-gradient(135deg, #ffffff, rgba(255,255,255,0.6))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Connect Your Social Platforms
          </h1>
          <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.5)', maxWidth: 560, margin: '0 auto', lineHeight: 1.6, fontFamily: 'Outfit' }}>
            Connect once. ASH automatically posts content, tracks analytics, and grows your audience across all platforms — 24/7 on autopilot.
          </p>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginTop: 16, padding: '8px 20px', borderRadius: 999, background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
            <span style={{ fontSize: 13, color: '#34d399', fontFamily: 'Outfit', fontWeight: 600 }}>{connectedCount} of {platforms.length} platforms connected</span>
          </div>
        </div>

        {/* Platform Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, marginBottom: 48 }}>
          {platforms.map((p, i) => (
            <div key={i} className="card-hover" style={{
              borderRadius: 20,
              border: `1px solid ${p.color}35`,
              background: `linear-gradient(135deg, ${p.color}12, ${p.color}06)`,
              padding: 24,
              position: 'relative',
              overflow: 'hidden',
              boxShadow: p.connected ? `0 0 30px ${p.glow}` : 'none',
            }}>
              {/* Glow orb */}
              <div style={{ position: 'absolute', top: -30, right: -30, width: 120, height: 120, borderRadius: '50%', background: `radial-gradient(circle, ${p.color}20, transparent 70%)`, pointerEvents: 'none' }} />

              {/* Top row */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 48, height: 48, borderRadius: 14, background: `linear-gradient(135deg, ${p.color}30, ${p.color}15)`, border: `1px solid ${p.color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>
                    {p.icon}
                  </div>
                  <div>
                    <div style={{ fontFamily: 'Outfit', fontWeight: 700, fontSize: 16, color: 'rgba(255,255,255,0.9)' }}>{p.name}</div>
                    <div style={{ fontFamily: 'Space Mono', fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>{p.handle}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 999, background: p.connected ? 'rgba(16,185,129,0.12)' : 'rgba(255,255,255,0.05)', border: p.connected ? '1px solid rgba(16,185,129,0.3)' : '1px solid rgba(255,255,255,0.1)' }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: p.connected ? '#10b981' : 'rgba(255,255,255,0.2)' }} />
                  <span style={{ fontSize: 10, fontFamily: 'Space Mono', fontWeight: 700, color: p.connected ? '#34d399' : 'rgba(255,255,255,0.35)' }}>{p.connected ? 'CONNECTED' : 'NOT CONNECTED'}</span>
                </div>
              </div>

              {/* Capabilities */}
              <div style={{ marginBottom: 16 }}>
                {p.connected && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                    <span style={{ fontSize: 10, fontFamily: 'Space Mono', color: '#34d399', opacity: 0.8, letterSpacing: '0.1em' }}>⚡ ASH CAN NOW</span>
                  </div>
                )}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                  {p.caps.map((cap, j) => (
                    <div key={j} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 14, color: p.connected ? '#34d399' : 'rgba(255,255,255,0.2)' }}>{p.connected ? '✓' : '○'}</span>
                      <span style={{ fontSize: 11, color: p.connected ? 'rgba(255,255,255,0.65)' : 'rgba(255,255,255,0.3)', fontFamily: 'Outfit' }}>{cap}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Button */}
              <button style={{
                width: '100%', padding: '10px 0', borderRadius: 12, fontSize: 13, fontFamily: 'Outfit', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s',
                background: p.connected ? 'rgba(255,255,255,0.06)' : `linear-gradient(135deg, ${p.color}30, ${p.color}15)`,
                border: p.connected ? '1px solid rgba(255,255,255,0.12)' : `1px solid ${p.color}50`,
                color: p.connected ? 'rgba(255,255,255,0.65)' : '#fff',
              }}>
                {p.connected ? 'Manage Connection' : `Connect ${p.name}`}
              </button>
            </div>
          ))}
        </div>

        {/* Feature highlights */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          {[
            { icon: '🎬', color: '#a78bfa', title: 'Content Automation', desc: 'ASH auto-generates and schedules posts, videos, and stories across all connected platforms.' },
            { icon: '📈', color: '#34d399', title: 'Growth Intelligence', desc: 'ASH monitors analytics, A/B tests content, and scales what works across your social graph.' },
            { icon: '🎯', color: '#60a5fa', title: 'Audience Targeting', desc: 'ASH identifies high-value audiences and auto-optimizes content for maximum reach and revenue.' },
          ].map((f, i) => (
            <div key={i} style={{ borderRadius: 16, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)', padding: 20 }}>
              <div style={{ fontSize: 24, marginBottom: 12 }}>{f.icon}</div>
              <div style={{ fontFamily: 'Outfit', fontWeight: 700, fontSize: 15, color: 'rgba(255,255,255,0.9)', marginBottom: 8 }}>{f.title}</div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', lineHeight: 1.6, fontFamily: 'Outfit' }}>{f.desc}</div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
