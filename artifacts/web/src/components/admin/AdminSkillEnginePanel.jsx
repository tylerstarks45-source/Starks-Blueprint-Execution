import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const authHeaders = () => {
  const token = localStorage.getItem('sbep_auth_token');
  return token
    ? { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
    : { 'Content-Type': 'application/json' };
};

const CATEGORY_COLORS = {
  'Sales & Marketing': '#f97316',
  'Research':          '#38bdf8',
  'Business':          '#a78bfa',
  'Creative':          '#f472b6',
  'Productivity':      '#34d399',
  'Documents':         '#fbbf24',
  'Starks Exclusive':  '#6366f1',
};

export default function AdminSkillEnginePanel() {
  const [skills, setSkills] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(null);
  const [filterCat, setFilterCat] = useState('All');
  const [tab, setTab] = useState('skills');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [skillsRes, analyticsRes] = await Promise.all([
        fetch('/api/skills', { headers: authHeaders() }),
        fetch('/api/skills/analytics', { headers: authHeaders() }),
      ]);
      if (skillsRes.ok) setSkills(await skillsRes.json());
      if (analyticsRes.ok) setAnalytics(await analyticsRes.json());
    } catch {}
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const toggleSkill = async (skill) => {
    setToggling(skill.id);
    try {
      const res = await fetch(`/api/skills/${skill.id}`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({ activeStatus: !skill.activeStatus }),
      });
      if (res.ok) {
        const updated = await res.json();
        setSkills(prev => prev.map(s => s.id === updated.id ? updated : s));
      }
    } catch {}
    setToggling(null);
  };

  const categories = ['All', ...new Set(skills.map(s => s.category))];
  const filtered = filterCat === 'All' ? skills : skills.filter(s => s.category === filterCat);
  const activeCount = skills.filter(s => s.activeStatus).length;
  const exclusiveCount = skills.filter(s => s.isPlatformExclusive).length;

  const chartData = analytics?.activations?.slice(0, 10).map(a => ({
    name: a.name.length > 16 ? a.name.slice(0, 16) + '…' : a.name,
    count: Number(a.activationCount),
    category: a.category,
  })) ?? [];

  return (
    <div className="rounded-xl border border-white/5 bg-black/30 backdrop-blur-sm">
      <div className="border-b border-white/5 px-4 py-3 flex items-center gap-3">
        <span className="w-2 h-2 rounded-full bg-primary"></span>
        <span className="text-xs font-mono text-gray-300 uppercase tracking-widest">Skill Engine</span>
        <div className="ml-auto flex items-center gap-4">
          <span className="text-xs text-gray-500 font-mono">{activeCount}/{skills.length} active</span>
          <span className="text-xs text-primary/70 font-mono">{exclusiveCount} exclusive</span>
          <span className="text-xs text-gray-600 font-mono">{analytics?.totalActivations ?? 0} total activations</span>
        </div>
      </div>

      <div className="border-b border-white/5 px-4 flex gap-1">
        {['skills', 'analytics'].map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-2 text-[10px] font-mono uppercase tracking-widest transition-colors border-b-2 -mb-px ${
              tab === t ? 'border-primary text-primary' : 'border-transparent text-gray-600 hover:text-gray-400'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="p-8 text-center text-gray-600 font-mono text-xs">Loading skill registry…</div>
      ) : tab === 'analytics' ? (
        <div className="p-4">
          {chartData.length === 0 ? (
            <div className="text-center py-8 text-gray-600 font-mono text-xs">No activations yet — skills activate when users build systems.</div>
          ) : (
            <>
              <p className="text-xs text-gray-500 mb-4 font-mono">Top 10 skills by activation count</p>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={chartData} margin={{ top: 0, right: 8, bottom: 0, left: 0 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#6b7280', fontFamily: 'monospace' }} />
                  <YAxis tick={{ fontSize: 9, fill: '#6b7280', fontFamily: 'monospace' }} />
                  <Tooltip
                    contentStyle={{ background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 11 }}
                    labelStyle={{ color: '#e5e7eb' }}
                    itemStyle={{ color: '#6366f1' }}
                  />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {chartData.map((entry, i) => (
                      <Cell key={i} fill={CATEGORY_COLORS[entry.category] ?? '#6366f1'} opacity={0.8} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div className="mt-4 space-y-1">
                {analytics.activations.map(a => (
                  <div key={a.skillId} className="flex items-center gap-3 text-xs">
                    <span className="text-gray-300 flex-1 font-mono truncate">{a.name}</span>
                    <span className="text-gray-600 text-[10px] font-mono">{a.category}</span>
                    <span className="text-primary font-mono font-semibold">{a.activationCount}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="p-4">
          <div className="flex gap-1.5 flex-wrap mb-4">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setFilterCat(cat)}
                className={`px-2.5 py-1 rounded-full text-[10px] font-mono transition-colors ${
                  filterCat === cat
                    ? 'bg-primary/20 text-primary border border-primary/30'
                    : 'bg-white/4 text-gray-500 border border-white/8 hover:text-gray-300'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="space-y-1.5 max-h-96 overflow-y-auto">
            {filtered.map(skill => (
              <div
                key={skill.id}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-colors ${
                  skill.activeStatus
                    ? 'border-white/5 bg-white/3'
                    : 'border-white/3 bg-black/20 opacity-50'
                }`}
              >
                <span className="text-base shrink-0">{skill.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-white truncate">{skill.name}</span>
                    {skill.isPlatformExclusive && (
                      <span className="px-1.5 py-0 rounded text-[9px] font-mono bg-primary/15 text-primary border border-primary/20">
                        EXCLUSIVE
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-gray-600 truncate">{skill.description}</p>
                </div>
                <span
                  className="text-[9px] font-mono px-2 py-0.5 rounded border shrink-0"
                  style={{ color: CATEGORY_COLORS[skill.category] ?? '#9ca3af', borderColor: (CATEGORY_COLORS[skill.category] ?? '#9ca3af') + '40', background: (CATEGORY_COLORS[skill.category] ?? '#9ca3af') + '12' }}
                >
                  {skill.category}
                </span>
                <button
                  onClick={() => toggleSkill(skill)}
                  disabled={toggling === skill.id}
                  className={`shrink-0 w-9 h-5 rounded-full border transition-colors relative ${
                    skill.activeStatus
                      ? 'bg-primary/30 border-primary/40'
                      : 'bg-white/8 border-white/10'
                  } ${toggling === skill.id ? 'opacity-50' : ''}`}
                >
                  <span className={`absolute top-0.5 w-4 h-4 rounded-full transition-all ${
                    skill.activeStatus ? 'left-4 bg-primary' : 'left-0.5 bg-gray-500'
                  }`} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
