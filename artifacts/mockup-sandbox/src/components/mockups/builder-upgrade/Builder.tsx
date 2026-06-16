export function Builder() {
  const messages = [
    { role: 'user', text: 'Build me a TikTok faceless channel that earns $5,000/month' },
    { role: 'tool', tool: 'search', label: 'Searching: TikTok faceless channel monetization strategies 2024', status: 'done' },
    { role: 'tool', tool: 'image', label: 'Generating thumbnail concept: cinematic tech channel', status: 'done' },
    { role: 'ash', text: "I've analyzed the top-performing TikTok faceless channels and found a proven system. Here's your build plan:", hasCard: true },
  ];

  const capabilities = [
    { icon: '🔍', label: 'Web Search', color: '#60a5fa' },
    { icon: '🖼️', label: 'Image Gen', color: '#f472b6' },
    { icon: '🎬', label: 'Video Gen', color: '#a78bfa' },
    { icon: '🎵', label: 'Music Gen', color: '#34d399' },
    { icon: '🎙️', label: 'TTS Voice', color: '#f59e0b' },
    { icon: '📁', label: 'File Build', color: '#60a5fa' },
  ];

  return (
    <div className="h-screen text-white overflow-hidden" style={{ fontFamily: "'Space Mono', 'Outfit', monospace", background: '#050510', display: 'flex', flexDirection: 'column' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Outfit:wght@400;500;600;700;900&display=swap');
        ::-webkit-scrollbar { width: 3px; } ::-webkit-scrollbar-track { background: transparent; } ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 2px; }
      `}</style>

      {/* Top Bar */}
      <div style={{ height: 52, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', borderBottom: '1px solid rgba(255,255,255,0.07)', background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(20px)', flexShrink: 0, zIndex: 50 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'rgba(255,255,255,0.4)', fontSize: 12, fontFamily: 'Space Mono', background: 'none', border: 'none', cursor: 'pointer' }}>← Dashboard</button>
          <span style={{ color: 'rgba(255,255,255,0.15)' }}>/</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 16 }}>✨</span>
            <span style={{ fontFamily: 'Outfit', fontWeight: 800, fontSize: 15, color: 'rgba(255,255,255,0.9)' }}>ASH Builder</span>
          </div>
        </div>

        {/* Phase Bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {[
            { label: 'Goal', done: true },
            { label: 'Plan', done: true },
            { label: 'Build', active: true },
            { label: 'Live', done: false },
          ].map((step, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 14px', borderRadius: 8, background: step.active ? 'rgba(6,182,212,0.15)' : step.done ? 'rgba(16,185,129,0.08)' : 'rgba(255,255,255,0.04)', border: step.active ? '1px solid rgba(6,182,212,0.4)' : step.done ? '1px solid rgba(16,185,129,0.2)' : '1px solid rgba(255,255,255,0.07)' }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: step.active ? '#06b6d4' : step.done ? '#10b981' : 'rgba(255,255,255,0.2)', display: 'inline-block', boxShadow: step.active ? '0 0 6px #06b6d4' : 'none' }} />
                <span style={{ fontSize: 11, fontFamily: 'Space Mono', fontWeight: 700, color: step.active ? '#06b6d4' : step.done ? '#34d399' : 'rgba(255,255,255,0.3)' }}>{step.label}</span>
              </div>
              {i < 3 && <span style={{ color: 'rgba(255,255,255,0.12)', fontSize: 14, margin: '0 2px' }}>›</span>}
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 8, background: 'rgba(6,182,212,0.1)', border: '1px solid rgba(6,182,212,0.25)', color: '#67e8f9', fontFamily: 'Outfit', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>📚 Library</button>
          <button style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 8, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)', fontFamily: 'Outfit', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>+ New</button>
        </div>
      </div>

      {/* 3-Panel Layout */}
      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>

        {/* LEFT PANEL */}
        <div style={{ width: 280, borderRight: '1px solid rgba(255,255,255,0.07)', background: 'rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
          {/* Panel header */}
          <div style={{ padding: '16px 16px 12px', borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'linear-gradient(180deg, rgba(124,58,237,0.08), transparent)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(124,58,237,0.2)', border: '1px solid rgba(124,58,237,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>✨</div>
              <div>
                <div style={{ fontFamily: 'Space Mono', fontWeight: 700, fontSize: 12, color: 'rgba(255,255,255,0.8)' }}>ASH Workspace</div>
                <div style={{ fontFamily: 'Space Mono', fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 1 }}>Building system…</div>
              </div>
            </div>
            {/* Tab bar */}
            <div style={{ display: 'flex', gap: 4 }}>
              {['Tasks', 'Files', 'Memory'].map((tab, i) => (
                <button key={tab} style={{ flex: 1, padding: '5px 0', borderRadius: 7, fontSize: 11, fontFamily: 'Space Mono', fontWeight: 700, cursor: 'pointer', background: i === 0 ? 'rgba(124,58,237,0.15)' : 'rgba(255,255,255,0.04)', border: i === 0 ? '1px solid rgba(124,58,237,0.3)' : '1px solid rgba(255,255,255,0.08)', color: i === 0 ? '#a78bfa' : 'rgba(255,255,255,0.35)' }}>{tab}</button>
              ))}
            </div>
          </div>

          {/* Task list */}
          <div style={{ flex: 1, overflow: 'auto', padding: '10px 10px' }}>
            <div style={{ fontSize: 9, fontFamily: 'Space Mono', color: 'rgba(255,255,255,0.25)', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '4px 6px', marginBottom: 8 }}>Build Timeline</div>
            {[
              { label: 'Research viral niches', status: 'done' },
              { label: 'Analyze monetization', status: 'done' },
              { label: 'Set up TikTok API', status: 'active' },
              { label: 'Generate content templates', status: 'pending' },
              { label: 'Configure scheduler', status: 'pending' },
              { label: 'Test automation', status: 'pending' },
              { label: 'Launch system', status: 'pending' },
            ].map((task, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '8px 8px', borderRadius: 8, marginBottom: 4, background: task.status === 'active' ? 'rgba(6,182,212,0.06)' : 'transparent', border: task.status === 'active' ? '1px solid rgba(6,182,212,0.15)' : '1px solid transparent' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', marginTop: 4, flexShrink: 0, background: task.status === 'done' ? '#10b981' : task.status === 'active' ? '#06b6d4' : 'rgba(255,255,255,0.15)', boxShadow: task.status === 'active' ? '0 0 6px #06b6d4' : 'none' }} />
                <span style={{ fontFamily: 'Outfit', fontSize: 13, color: task.status === 'done' ? 'rgba(255,255,255,0.45)' : task.status === 'active' ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.35)', fontWeight: task.status === 'active' ? 600 : 400, textDecoration: task.status === 'done' ? 'line-through' : 'none' }}>{task.label}</span>
              </div>
            ))}
          </div>

          {/* ASH capabilities strip */}
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', padding: '12px 10px', background: 'rgba(0,0,0,0.4)' }}>
            <div style={{ fontSize: 9, fontFamily: 'Space Mono', color: 'rgba(255,255,255,0.25)', letterSpacing: '0.1em', marginBottom: 8, textTransform: 'uppercase' }}>ASH Tools Active</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
              {capabilities.map((cap, i) => (
                <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '8px 4px', borderRadius: 8, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', cursor: 'pointer' }}>
                  <span style={{ fontSize: 14 }}>{cap.icon}</span>
                  <span style={{ fontSize: 9, fontFamily: 'Space Mono', color: 'rgba(255,255,255,0.4)', textAlign: 'center' }}>{cap.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom: AI Model */}
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', padding: '10px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(0,0,0,0.6)' }}>
            <span style={{ fontSize: 11, fontFamily: 'Space Mono', color: 'rgba(255,255,255,0.3)' }}>AI Model</span>
            <button style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 7, background: 'rgba(6,182,212,0.1)', border: '1px solid rgba(6,182,212,0.25)', color: '#67e8f9', fontSize: 11, fontFamily: 'Space Mono', fontWeight: 700, cursor: 'pointer' }}>⚡ Business ↑</button>
          </div>
        </div>

        {/* CENTER PANEL */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', background: '#03030c' }}>
          {/* Chat header */}
          <div style={{ padding: '12px 20px', borderBottom: '1px solid rgba(255,255,255,0.07)', background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg, rgba(124,58,237,0.3), rgba(79,70,229,0.2))', border: '1px solid rgba(124,58,237,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>✨</div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontFamily: 'Outfit', fontWeight: 800, fontSize: 15, color: 'rgba(255,255,255,0.95)' }}>ASH</span>
                <span style={{ padding: '2px 8px', borderRadius: 6, background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.3)', fontSize: 10, fontFamily: 'Space Mono', color: '#a78bfa', fontWeight: 700 }}>AI AGENT</span>
                <span style={{ fontSize: 11, fontFamily: 'Space Mono', color: 'rgba(6,182,212,0.6)' }}>· Business Model</span>
              </div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', fontFamily: 'Outfit', marginTop: 1 }}>Autonomous Business Builder · Building your TikTok system</div>
            </div>
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ display: 'flex', gap: 3, background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '3px' }}>
                <button style={{ padding: '5px 12px', borderRadius: 6, background: 'rgba(124,58,237,0.2)', border: '1px solid rgba(124,58,237,0.35)', color: '#a78bfa', fontSize: 11, fontFamily: 'Space Mono', fontWeight: 700, cursor: 'pointer' }}>🧠 Plan</button>
                <button style={{ padding: '5px 12px', borderRadius: 6, background: 'rgba(6,182,212,0.2)', border: '1px solid rgba(6,182,212,0.35)', color: '#67e8f9', fontSize: 11, fontFamily: 'Space Mono', fontWeight: 700, cursor: 'pointer' }}>⚡ Build</button>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 8px #10b981' }} />
                <span style={{ fontSize: 11, color: '#34d399', fontFamily: 'Space Mono' }}>Online</span>
              </div>
            </div>
          </div>

          {/* Agent team bar */}
          <div style={{ padding: '10px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <span style={{ fontSize: 10, fontFamily: 'Space Mono', color: 'rgba(255,255,255,0.3)', marginRight: 4 }}>AGENTS:</span>
            {[
              { label: 'Planner', color: '#a78bfa', active: false },
              { label: 'Research', color: '#60a5fa', active: false },
              { label: 'Builder', color: '#06b6d4', active: true },
              { label: 'Tester', color: '#34d399', active: false },
              { label: 'Deployer', color: '#f59e0b', active: false },
            ].map((agent, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 999, background: agent.active ? `${agent.color}12` : 'rgba(255,255,255,0.03)', border: agent.active ? `1px solid ${agent.color}35` : '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ width: 5, height: 5, borderRadius: '50%', background: agent.active ? agent.color : 'rgba(255,255,255,0.15)', boxShadow: agent.active ? `0 0 6px ${agent.color}` : 'none' }} />
                <span style={{ fontSize: 10, fontFamily: 'Space Mono', fontWeight: 700, color: agent.active ? agent.color : 'rgba(255,255,255,0.25)' }}>{agent.label}</span>
                {agent.active && <div style={{ width: 5, height: 5, borderRadius: '50%', background: agent.color, opacity: 0.6 }} />}
              </div>
            ))}
            <span style={{ marginLeft: 'auto', fontSize: 10, fontFamily: 'Space Mono', color: 'rgba(6,182,212,0.6)' }}>3 / 7 steps</span>
          </div>

          {/* Chat messages */}
          <div style={{ flex: 1, overflow: 'auto', padding: '20px' }}>
            {/* User message */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
              <div style={{ maxWidth: '75%', padding: '12px 16px', borderRadius: '18px 18px 4px 18px', background: 'linear-gradient(135deg, #7c3aed, #4f46e5)', boxShadow: '0 4px 20px rgba(124,58,237,0.3)' }}>
                <p style={{ fontFamily: 'Outfit', fontSize: 14, color: '#fff', lineHeight: 1.6, margin: 0 }}>Build me a TikTok faceless channel that earns $5,000/month</p>
              </div>
            </div>

            {/* Tool call: search */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 12 }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(96,165,250,0.15)', border: '1px solid rgba(96,165,250,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, flexShrink: 0 }}>🔍</div>
              <div style={{ padding: '10px 14px', borderRadius: 12, background: 'rgba(96,165,250,0.06)', border: '1px solid rgba(96,165,250,0.15)', maxWidth: '80%' }}>
                <div style={{ fontSize: 10, fontFamily: 'Space Mono', color: 'rgba(96,165,250,0.7)', marginBottom: 4 }}>ASH · Web Search</div>
                <div style={{ fontFamily: 'Outfit', fontSize: 13, color: 'rgba(255,255,255,0.65)' }}>Searching: TikTok faceless channel monetization strategies 2024…</div>
                <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ color: '#10b981', fontSize: 12 }}>✓</span>
                  <span style={{ fontSize: 10, fontFamily: 'Space Mono', color: '#34d399' }}>Found 12 results</span>
                </div>
              </div>
            </div>

            {/* Tool call: image */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 16 }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(244,114,182,0.15)', border: '1px solid rgba(244,114,182,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, flexShrink: 0 }}>🖼️</div>
              <div style={{ padding: '10px 14px', borderRadius: 12, background: 'rgba(244,114,182,0.06)', border: '1px solid rgba(244,114,182,0.15)', maxWidth: '80%' }}>
                <div style={{ fontSize: 10, fontFamily: 'Space Mono', color: 'rgba(244,114,182,0.7)', marginBottom: 4 }}>ASH · Image Generation</div>
                <div style={{ fontFamily: 'Outfit', fontSize: 13, color: 'rgba(255,255,255,0.65)' }}>Generating thumbnail concept: cinematic tech channel</div>
                <div style={{ marginTop: 8, width: 180, height: 100, borderRadius: 8, background: 'linear-gradient(135deg, #1a1a2e, #16213e, #0f3460)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <span style={{ fontSize: 30 }}>🎬</span>
                </div>
              </div>
            </div>

            {/* ASH reply */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 16 }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg, rgba(124,58,237,0.3), rgba(79,70,229,0.2))', border: '1px solid rgba(124,58,237,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, flexShrink: 0 }}>✨</div>
              <div style={{ maxWidth: '85%' }}>
                <div style={{ fontSize: 10, fontFamily: 'Space Mono', color: 'rgba(255,255,255,0.3)', marginBottom: 6 }}>ASH · Autonomous Agent</div>
                <div style={{ padding: '14px 18px', borderRadius: '4px 18px 18px 18px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <p style={{ fontFamily: 'Outfit', fontSize: 14, color: 'rgba(255,255,255,0.85)', lineHeight: 1.7, margin: 0 }}>
                    I've analyzed the top-performing TikTok faceless channels and found a proven system. Based on your connected TikTok and Instagram accounts, here's what I'm building:
                  </p>
                </div>
                {/* Plan card */}
                <div style={{ marginTop: 8, padding: '14px 16px', borderRadius: 14, background: 'linear-gradient(135deg, rgba(124,58,237,0.1), rgba(79,70,229,0.06))', border: '1px solid rgba(124,58,237,0.2)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                    <span style={{ fontSize: 14 }}>🚀</span>
                    <span style={{ fontFamily: 'Outfit', fontWeight: 800, fontSize: 14, color: 'rgba(255,255,255,0.9)' }}>TikTok Faceless Empire</span>
                    <span style={{ marginLeft: 'auto', padding: '2px 8px', borderRadius: 999, background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', fontSize: 10, fontFamily: 'Space Mono', color: '#34d399' }}>7 steps</span>
                  </div>
                  {['Niche research complete', 'Content template library', 'TikTok API automation', 'AI video generation pipeline', 'Revenue tracking dashboard'].map((step, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0', borderBottom: i < 4 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                      <span style={{ color: i < 2 ? '#10b981' : i === 2 ? '#06b6d4' : 'rgba(255,255,255,0.2)', fontSize: 12 }}>{i < 2 ? '✓' : i === 2 ? '→' : '○'}</span>
                      <span style={{ fontFamily: 'Outfit', fontSize: 12, color: i < 2 ? 'rgba(255,255,255,0.5)' : i === 2 ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.35)' }}>{step}</span>
                    </div>
                  ))}
                  <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
                    <button style={{ flex: 1, padding: '9px 0', borderRadius: 10, background: 'linear-gradient(135deg, #7c3aed, #4f46e5)', border: 'none', color: '#fff', fontFamily: 'Outfit', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>✓ Confirm Plan</button>
                    <button style={{ padding: '9px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.5)', fontFamily: 'Outfit', fontSize: 13, cursor: 'pointer' }}>Revise</button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Input area */}
          <div style={{ padding: '14px 20px', borderTop: '1px solid rgba(255,255,255,0.07)', background: 'rgba(0,0,0,0.5)', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 14, padding: '10px 14px' }}>
              <input style={{ flex: 1, background: 'none', border: 'none', color: 'rgba(255,255,255,0.8)', fontFamily: 'Outfit', fontSize: 14, outline: 'none', resize: 'none' }} placeholder="Message ASH…" readOnly />
              <button style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg, #7c3aed, #4f46e5)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, fontSize: 16 }}>↑</button>
            </div>
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div style={{ width: 320, borderLeft: '1px solid rgba(255,255,255,0.07)', background: 'rgba(0,0,0,0.4)', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(0,0,0,0.3)' }}>
            <div style={{ display: 'flex', gap: 4 }}>
              {['Preview', 'Social', 'Media Lab'].map((tab, i) => (
                <button key={tab} style={{ padding: '6px 12px', borderRadius: 8, fontSize: 11, fontFamily: 'Space Mono', fontWeight: 700, cursor: 'pointer', background: i === 2 ? 'rgba(244,114,182,0.15)' : 'rgba(255,255,255,0.04)', border: i === 2 ? '1px solid rgba(244,114,182,0.3)' : '1px solid rgba(255,255,255,0.08)', color: i === 2 ? '#f472b6' : 'rgba(255,255,255,0.4)' }}>{tab}</button>
              ))}
            </div>
          </div>
          <div style={{ flex: 1, overflow: 'auto', padding: '14px' }}>
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 9, fontFamily: 'Space Mono', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>ASH Media Generation</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[
                  { icon: '🖼️', label: 'Generate Image', sub: 'DALL-E 3 via OpenRouter', color: '#60a5fa', tag: 'AVAILABLE' },
                  { icon: '🎬', label: 'Generate Video', sub: 'HeyGen / Runway ML', color: '#f472b6', tag: 'CONNECT' },
                  { icon: '🎵', label: 'Generate Music', sub: 'ElevenLabs AI', color: '#a78bfa', tag: 'CONNECT' },
                  { icon: '🎙️', label: 'Text-to-Speech', sub: 'ElevenLabs TTS', color: '#34d399', tag: 'CONNECT' },
                ].map((item, i) => (
                  <button key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', cursor: 'pointer', textAlign: 'left' }}>
                    <span style={{ fontSize: 18, flexShrink: 0 }}>{item.icon}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: 'Outfit', fontWeight: 700, fontSize: 13, color: 'rgba(255,255,255,0.8)' }}>{item.label}</div>
                      <div style={{ fontFamily: 'Space Mono', fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 1 }}>{item.sub}</div>
                    </div>
                    <span style={{ fontSize: 9, fontFamily: 'Space Mono', fontWeight: 700, color: item.tag === 'AVAILABLE' ? '#34d399' : 'rgba(255,255,255,0.3)', flexShrink: 0 }}>{item.tag}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div style={{ fontSize: 9, fontFamily: 'Space Mono', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>Connected Platforms</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
                {[
                  { icon: '🎵', name: 'TikTok', connected: true },
                  { icon: '📸', name: 'IG', connected: true },
                  { icon: '▶️', name: 'YT', connected: false },
                  { icon: '✖️', name: 'X', connected: false },
                  { icon: '💼', name: 'LI', connected: false },
                  { icon: '👻', name: 'Snap', connected: false },
                  { icon: '👥', name: 'FB', connected: false },
                  { icon: '🔗', name: 'More', connected: false },
                ].map((p, i) => (
                  <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '8px 4px', borderRadius: 8, background: p.connected ? 'rgba(16,185,129,0.06)' : 'rgba(255,255,255,0.02)', border: p.connected ? '1px solid rgba(16,185,129,0.2)' : '1px solid rgba(255,255,255,0.06)', cursor: 'pointer' }}>
                    <span style={{ fontSize: 16 }}>{p.icon}</span>
                    <span style={{ fontSize: 9, fontFamily: 'Space Mono', color: p.connected ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.25)', textAlign: 'center' }}>{p.name}</span>
                  </div>
                ))}
              </div>
              <button style={{ width: '100%', marginTop: 10, padding: '8px 0', borderRadius: 10, background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.2)', color: '#a78bfa', fontFamily: 'Outfit', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>Connect More Platforms →</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
