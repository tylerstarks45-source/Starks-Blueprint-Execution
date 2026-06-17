export function Dashboard() {
  const systems = [
    { name: 'TikTok Automation Suite', status: 'running', health: 94, uptime: '7d 14h', revenue: '$1,284', steps: 8 },
    { name: 'Email Outreach Machine', status: 'running', health: 87, uptime: '3d 2h', revenue: '$640', steps: 5 },
    { name: 'YouTube Faceless Channel', status: 'building', health: 61, uptime: '—', revenue: '$0', steps: 12 },
  ];

  const socialPlatforms = [
    { name: 'TikTok', icon: '🎵', connected: true, color: '#ff0050' },
    { name: 'Instagram', icon: '📸', connected: true, color: '#e1306c' },
    { name: 'YouTube', icon: '▶️', connected: false, color: '#ff0000' },
    { name: 'X', icon: '✖️', connected: false, color: '#e7e9ea' },
    { name: 'LinkedIn', icon: '💼', connected: false, color: '#0077b5' },
    { name: 'Snapchat', icon: '👻', connected: false, color: '#fffc00' },
    { name: 'Facebook', icon: '👥', connected: false, color: '#1877f2' },
  ];

  return (
    <div className="min-h-screen text-white" style={{ fontFamily: "'Space Mono', 'Outfit', monospace", background: 'linear-gradient(135deg, #030308 0%, #070714 50%, #030308 100%)' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Outfit:wght@400;500;600;700;900&display=swap');
        .hud { background: rgba(255,255,255,0.025); border: 1px solid rgba(255,255,255,0.08); border-radius: 16px; }
        .hud-glow-cyan { box-shadow: 0 0 30px rgba(6,182,212,0.08), inset 0 0 0 1px rgba(6,182,212,0.1); }
        .hud-glow-green { box-shadow: 0 0 30px rgba(16,185,129,0.08), inset 0 0 0 1px rgba(16,185,129,0.1); }
        .hud-glow-violet { box-shadow: 0 0 30px rgba(124,58,237,0.1), inset 0 0 0 1px rgba(124,58,237,0.12); }
        .hud-glow-amber { box-shadow: 0 0 30px rgba(245,158,11,0.08), inset 0 0 0 1px rgba(245,158,11,0.1); }
        .stat-value { font-family: 'Space Mono', monospace; font-weight: 700; }
      `}</style>

      {/* Header */}
      <div style={{ borderBottom: '1px solid rgba(255,255,255,0.07)', padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(20px)', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 30, height: 30, borderRadius: 8, background: 'linear-gradient(135deg, #7c3aed, #4f46e5)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800 }}>S</div>
          <span style={{ fontFamily: 'Outfit', fontWeight: 800, fontSize: 15, color: 'rgba(255,255,255,0.9)', letterSpacing: '-0.02em' }}>SBEP Command Center</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 999, background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)' }}>
            <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#10b981', animation: 'pulse 2s infinite' }} />
            <span style={{ fontSize: 10, color: '#34d399', fontFamily: 'Space Mono' }}>LIVE</span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {['Dashboard', 'Builder', 'Blueprints', 'Social', 'Connections'].map(item => (
            <span key={item} style={{ fontSize: 12, color: item === 'Dashboard' ? '#a78bfa' : 'rgba(255,255,255,0.4)', fontFamily: 'Outfit', cursor: 'pointer', padding: '4px 10px', borderRadius: 8, background: item === 'Dashboard' ? 'rgba(124,58,237,0.1)' : 'transparent' }}>{item}</span>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: 1300, margin: '0 auto', padding: '28px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* ASH Status Banner */}
        <div style={{ padding: '14px 20px', borderRadius: 14, background: 'linear-gradient(90deg, rgba(124,58,237,0.12), rgba(79,70,229,0.08))', border: '1px solid rgba(124,58,237,0.2)', display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(124,58,237,0.2)', border: '1px solid rgba(124,58,237,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>🤖</div>
          <div>
            <div style={{ fontFamily: 'Outfit', fontWeight: 700, fontSize: 15, color: 'rgba(255,255,255,0.9)' }}>ASH is monitoring 2 active systems</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', fontFamily: 'Outfit', marginTop: 2 }}>Revenue this week: <span style={{ color: '#34d399', fontWeight: 700 }}>$1,924</span> · AI credits remaining: <span style={{ color: '#60a5fa' }}>8,420</span></div>
          </div>
          <button style={{ marginLeft: 'auto', padding: '8px 18px', borderRadius: 10, background: 'linear-gradient(135deg, #7c3aed, #4f46e5)', border: 'none', color: '#fff', fontFamily: 'Outfit', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>+ Build New System</button>
        </div>

        {/* KPI Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
          {[
            { label: 'Revenue Today', value: '$284.50', sub: '+12% vs yesterday', color: '#34d399', icon: '💰' },
            { label: 'Active Systems', value: '2 / 3', sub: '1 building now', color: '#60a5fa', icon: '⚡' },
            { label: 'AI Credits', value: '8,420', sub: '3,580 used this month', color: '#a78bfa', icon: '🧠' },
            { label: 'AI Requests', value: '1,247', sub: 'All time total', color: '#f59e0b', icon: '🔁' },
          ].map((kpi, i) => (
            <div key={i} className="hud" style={{ padding: '18px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <span style={{ fontSize: 11, fontFamily: 'Space Mono', color: 'rgba(255,255,255,0.35)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{kpi.label}</span>
                <span style={{ fontSize: 18 }}>{kpi.icon}</span>
              </div>
              <div style={{ fontFamily: 'Space Mono', fontWeight: 700, fontSize: 26, color: kpi.color, lineHeight: 1 }}>{kpi.value}</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 6, fontFamily: 'Outfit' }}>{kpi.sub}</div>
            </div>
          ))}
        </div>

        {/* Main grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 16 }}>
          {/* Left col */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Active Systems */}
            <div className="hud hud-glow-cyan" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 4, height: 20, borderRadius: 2, background: '#06b6d4' }} />
                  <span style={{ fontFamily: 'Outfit', fontWeight: 800, fontSize: 14, color: 'rgba(255,255,255,0.8)' }}>Active Systems</span>
                </div>
                <span style={{ fontSize: 11, fontFamily: 'Space Mono', color: 'rgba(255,255,255,0.3)' }}>3 total</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {systems.map((sys, i) => (
                  <div key={i} style={{ padding: '14px 16px', borderRadius: 12, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: sys.status === 'running' ? '#10b981' : sys.status === 'building' ? '#f59e0b' : '#ef4444', flexShrink: 0, boxShadow: sys.status === 'running' ? '0 0 8px #10b981' : 'none' }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: 'Outfit', fontWeight: 700, fontSize: 13, color: 'rgba(255,255,255,0.85)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{sys.name}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 6 }}>
                        <div style={{ flex: 1, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                          <div style={{ width: `${sys.health}%`, height: '100%', borderRadius: 2, background: sys.health > 80 ? '#10b981' : sys.health > 60 ? '#f59e0b' : '#ef4444' }} />
                        </div>
                        <span style={{ fontSize: 10, fontFamily: 'Space Mono', color: 'rgba(255,255,255,0.4)', flexShrink: 0 }}>{sys.health}%</span>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontFamily: 'Space Mono', fontWeight: 700, fontSize: 14, color: '#34d399' }}>{sys.revenue}</div>
                      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', fontFamily: 'Space Mono', marginTop: 2 }}>↑ {sys.uptime}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Social Hub — NEW */}
            <div className="hud hud-glow-violet" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 4, height: 20, borderRadius: 2, background: '#a78bfa' }} />
                  <span style={{ fontFamily: 'Outfit', fontWeight: 800, fontSize: 14, color: 'rgba(255,255,255,0.8)' }}>Social Platform Hub</span>
                  <span style={{ padding: '2px 8px', borderRadius: 999, background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.25)', fontSize: 10, fontFamily: 'Space Mono', color: '#a78bfa' }}>NEW</span>
                </div>
                <button style={{ fontSize: 11, fontFamily: 'Outfit', color: '#a78bfa', background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.2)', padding: '4px 12px', borderRadius: 8, cursor: 'pointer' }}>Manage →</button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 8 }}>
                {socialPlatforms.map((p, i) => (
                  <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: '10px 4px', borderRadius: 12, background: p.connected ? `${p.color}12` : 'rgba(255,255,255,0.03)', border: p.connected ? `1px solid ${p.color}35` : '1px solid rgba(255,255,255,0.06)', cursor: 'pointer', transition: 'all 0.2s' }}>
                    <span style={{ fontSize: 20 }}>{p.icon}</span>
                    <span style={{ fontSize: 9, fontFamily: 'Space Mono', color: p.connected ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.25)', textAlign: 'center' }}>{p.name}</span>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: p.connected ? '#10b981' : 'rgba(255,255,255,0.15)', boxShadow: p.connected ? '0 0 6px #10b981' : 'none' }} />
                  </div>
                ))}
              </div>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 12, fontFamily: 'Outfit' }}>ASH uses your connected platforms when building social media income systems.</p>
            </div>
          </div>

          {/* Right col */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Quick Actions */}
            <div className="hud hud-glow-amber" style={{ padding: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                <div style={{ width: 4, height: 16, borderRadius: 2, background: '#f59e0b' }} />
                <span style={{ fontFamily: 'Outfit', fontWeight: 800, fontSize: 13, color: 'rgba(255,255,255,0.7)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Quick Actions</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {[
                  { label: 'Builder', icon: '🚀', color: '#60a5fa', bg: 'rgba(96,165,250,0.08)', border: 'rgba(96,165,250,0.2)' },
                  { label: 'Social Hub', icon: '📱', color: '#a78bfa', bg: 'rgba(124,58,237,0.08)', border: 'rgba(124,58,237,0.2)' },
                  { label: 'Blueprints', icon: '🗺️', color: '#a78bfa', bg: 'rgba(167,139,250,0.08)', border: 'rgba(167,139,250,0.2)' },
                  { label: 'Media Lab', icon: '🎬', color: '#f472b6', bg: 'rgba(244,114,182,0.08)', border: 'rgba(244,114,182,0.2)' },
                  { label: 'Connections', icon: '🔗', color: '#f59e0b', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.2)' },
                  { label: 'Buy Credits', icon: '💎', color: '#34d399', bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.2)' },
                ].map((a, i) => (
                  <button key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '14px 8px', borderRadius: 12, background: a.bg, border: `1px solid ${a.border}`, cursor: 'pointer', transition: 'all 0.2s' }}>
                    <span style={{ fontSize: 20 }}>{a.icon}</span>
                    <span style={{ fontSize: 10, fontFamily: 'Space Mono', fontWeight: 700, color: a.color, letterSpacing: '0.05em' }}>{a.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Media Generation Lab — NEW */}
            <div className="hud" style={{ padding: '18px', background: 'linear-gradient(135deg, rgba(244,114,182,0.06), rgba(168,85,247,0.06))', border: '1px solid rgba(244,114,182,0.15)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                <div style={{ width: 4, height: 16, borderRadius: 2, background: 'linear-gradient(180deg, #f472b6, #a855f7)' }} />
                <span style={{ fontFamily: 'Outfit', fontWeight: 800, fontSize: 13, color: 'rgba(255,255,255,0.7)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Media Generation Lab</span>
                <span style={{ padding: '2px 8px', borderRadius: 999, background: 'rgba(244,114,182,0.15)', border: '1px solid rgba(244,114,182,0.25)', fontSize: 10, fontFamily: 'Space Mono', color: '#f472b6' }}>NEW</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[
                  { icon: '🖼️', label: 'Generate Image', desc: 'AI art via DALL-E 3', color: '#60a5fa' },
                  { icon: '🎬', label: 'Generate Video', desc: 'HeyGen / Runway ML', color: '#f472b6' },
                  { icon: '🎵', label: 'Generate Music', desc: 'ElevenLabs AI music', color: '#a78bfa' },
                  { icon: '🎙️', label: 'Text-to-Speech', desc: 'Natural voice generation', color: '#34d399' },
                ].map((m, i) => (
                  <button key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 10, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', cursor: 'pointer', transition: 'all 0.2s', textAlign: 'left' }}>
                    <span style={{ fontSize: 18, flexShrink: 0 }}>{m.icon}</span>
                    <div>
                      <div style={{ fontFamily: 'Outfit', fontWeight: 700, fontSize: 13, color: 'rgba(255,255,255,0.8)' }}>{m.label}</div>
                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', fontFamily: 'Outfit', marginTop: 1 }}>{m.desc}</div>
                    </div>
                    <span style={{ marginLeft: 'auto', fontSize: 12, color: m.color, flexShrink: 0 }}>→</span>
                  </button>
                ))}
              </div>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 12, fontFamily: 'Outfit' }}>Available directly in the ASH Builder when building media-based income systems.</p>
            </div>

            {/* Credits gauge */}
            <div className="hud hud-glow-green" style={{ padding: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <div style={{ width: 4, height: 16, borderRadius: 2, background: '#34d399' }} />
                <span style={{ fontFamily: 'Outfit', fontWeight: 800, fontSize: 13, color: 'rgba(255,255,255,0.7)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>AI Credits</span>
              </div>
              <div style={{ display: 'flex', align: 'center', gap: 16 }}>
                <div style={{ position: 'relative', width: 80, height: 80, flexShrink: 0 }}>
                  <svg viewBox="0 0 80 80" style={{ transform: 'rotate(-90deg)' }}>
                    <circle cx="40" cy="40" r="34" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="8" />
                    <circle cx="40" cy="40" r="34" fill="none" stroke="#34d399" strokeWidth="8" strokeDasharray="213.6" strokeDashoffset={213.6 * (1 - 0.70)} strokeLinecap="round" />
                  </svg>
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
                    <span style={{ fontFamily: 'Space Mono', fontWeight: 700, fontSize: 16, color: '#34d399', lineHeight: 1 }}>70%</span>
                    <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.3)', fontFamily: 'Space Mono' }}>left</span>
                  </div>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: 'Space Mono', fontWeight: 700, fontSize: 20, color: 'rgba(255,255,255,0.9)' }}>8,420</div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontFamily: 'Outfit', marginTop: 2 }}>of 12,000 remaining</div>
                  <button style={{ marginTop: 10, padding: '7px 14px', borderRadius: 8, background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.25)', color: '#34d399', fontSize: 12, fontFamily: 'Outfit', fontWeight: 700, cursor: 'pointer' }}>+ Buy Credits</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
