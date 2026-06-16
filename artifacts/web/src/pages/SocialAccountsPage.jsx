import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext.jsx';
import VideoBackground from '@/components/VideoBackground.jsx';
import Header from '@/components/Header.jsx';
import Footer from '@/components/Footer.jsx';
import { CheckCircle, Circle, ExternalLink, Eye, EyeOff, Loader2, X, Zap, Share2, TrendingUp, Users, Film, Music, MessageSquare } from 'lucide-react';

const authHeaders = () => {
  const token = localStorage.getItem('sbep_auth_token');
  return token
    ? { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
    : { 'Content-Type': 'application/json' };
};

const SOCIAL_PLATFORMS = [
  {
    key: 'TIKTOK_ACCESS_TOKEN',
    name: 'TikTok',
    handle: '@yourtiktok',
    icon: '🎵',
    gradient: 'from-[#ff0050]/20 to-[#00f2ea]/10',
    border: 'border-[#ff0050]/25',
    dot: 'bg-[#ff0050]',
    glow: 'shadow-[#ff0050]/10',
    label: 'Access Token',
    placeholder: 'Paste your TikTok Access Token…',
    description: 'Automate content posting, track analytics, grow your audience, and monetize TikTok accounts.',
    ashCapabilities: ['Post videos automatically', 'Track follower growth', 'Analyze viral content', 'Schedule content drops'],
    docsUrl: 'https://developers.tiktok.com/doc/login-kit-manage-user-access-tokens/',
    guide: [
      'Go to TikTok Developer Portal (developers.tiktok.com)',
      'Create an app → select "Content Posting API"',
      'Get your App credentials and generate an access token',
      'Paste the access token below',
    ],
  },
  {
    key: 'INSTAGRAM_ACCESS_TOKEN',
    name: 'Instagram',
    handle: '@yourinstagram',
    icon: '📸',
    gradient: 'from-[#e1306c]/20 to-[#f77737]/10',
    border: 'border-[#e1306c]/25',
    dot: 'bg-[#e1306c]',
    glow: 'shadow-[#e1306c]/10',
    label: 'Access Token',
    placeholder: 'Paste your Instagram Access Token…',
    description: 'Publish posts, stories, and reels automatically. Grow your Instagram brand with AI-driven content.',
    ashCapabilities: ['Publish posts & Reels', 'Schedule story content', 'Track post performance', 'Generate AI captions'],
    docsUrl: 'https://developers.facebook.com/docs/instagram-api/getting-started',
    guide: [
      'Go to Meta for Developers (developers.facebook.com)',
      'Create an app → add "Instagram Graph API"',
      'Get a long-lived User Access Token',
      'Paste the token below',
    ],
  },
  {
    key: 'FACEBOOK_PAGE_TOKEN',
    name: 'Facebook',
    handle: 'Your Page',
    icon: '👥',
    gradient: 'from-[#1877f2]/20 to-[#1565c0]/10',
    border: 'border-[#1877f2]/25',
    dot: 'bg-[#1877f2]',
    glow: 'shadow-[#1877f2]/10',
    label: 'Page Access Token',
    placeholder: 'Paste your Facebook Page Token…',
    description: 'Manage Pages, run ad campaigns, auto-publish content, and grow your Facebook presence.',
    ashCapabilities: ['Auto-publish to Pages', 'Manage ad campaigns', 'Track page analytics', 'Generate ad creatives'],
    docsUrl: 'https://developers.facebook.com/docs/pages/access-tokens',
    guide: [
      'Go to Meta for Developers → Graph API Explorer',
      'Select your Page → click "Generate Access Token"',
      'Add permissions: pages_manage_posts, pages_read_engagement',
      'Copy and paste the long-lived token below',
    ],
  },
  {
    key: 'TWITTER_BEARER_TOKEN',
    name: 'X (Twitter)',
    handle: '@yourhandle',
    icon: '𝕏',
    gradient: 'from-white/10 to-white/5',
    border: 'border-white/15',
    dot: 'bg-white',
    glow: 'shadow-white/5',
    label: 'Bearer Token',
    placeholder: 'Paste your X Bearer Token…',
    description: 'Post tweets, monitor trends, track mentions, and automate X growth and engagement campaigns.',
    ashCapabilities: ['Auto-post tweets', 'Monitor brand mentions', 'Track trending topics', 'Run engagement campaigns'],
    docsUrl: 'https://developer.twitter.com/en/docs/authentication/oauth-2-0/bearer-tokens',
    guide: [
      'Go to developer.twitter.com → Apply for Developer Account',
      'Create a Project and App',
      'Navigate to "Keys and Tokens"',
      'Copy the Bearer Token and paste below',
    ],
  },
  {
    key: 'LINKEDIN_API_KEY',
    name: 'LinkedIn',
    handle: 'Your Profile',
    icon: '💼',
    gradient: 'from-[#0a66c2]/20 to-[#004182]/10',
    border: 'border-[#0a66c2]/25',
    dot: 'bg-[#0a66c2]',
    glow: 'shadow-[#0a66c2]/10',
    label: 'Access Token',
    placeholder: 'Paste your LinkedIn Access Token…',
    description: 'Publish thought leadership posts, generate B2B leads, and grow professional authority automatically.',
    ashCapabilities: ['Post articles & updates', 'Generate B2B leads', 'Build professional authority', 'Track content reach'],
    docsUrl: 'https://www.linkedin.com/developers/apps',
    guide: [
      'Go to linkedin.com/developers → Create App',
      'Request "Share on LinkedIn" and "w_member_social" permissions',
      'Generate a 60-day access token via OAuth',
      'Paste the access token below',
    ],
  },
  {
    key: 'SNAPCHAT_ACCESS_TOKEN',
    name: 'Snapchat',
    handle: 'Your Snapchat',
    icon: '👻',
    gradient: 'from-[#fffc00]/20 to-[#ffd700]/10',
    border: 'border-[#fffc00]/25',
    dot: 'bg-[#fffc00]',
    glow: 'shadow-[#fffc00]/10',
    label: 'Access Token',
    placeholder: 'Paste your Snapchat Access Token…',
    description: 'Auto-publish Snaps and Stories, run Snap Ads, and reach Gen Z audiences at scale.',
    ashCapabilities: ['Publish Snaps & Stories', 'Run Snap Ad campaigns', 'Track story views', 'Target Gen Z audiences'],
    docsUrl: 'https://developers.snap.com/api/marketing-api/Overview/',
    guide: [
      'Go to kit.snapchat.com → Business → Snap Kit',
      'Create an App and enable "Creative Kit" permissions',
      'Generate OAuth tokens via Snap\'s token endpoint',
      'Paste your access token below',
    ],
  },
  {
    key: 'YOUTUBE_API_KEY',
    name: 'YouTube',
    handle: 'Your Channel',
    icon: '▶',
    gradient: 'from-[#ff0000]/20 to-[#cc0000]/10',
    border: 'border-[#ff0000]/25',
    dot: 'bg-[#ff0000]',
    glow: 'shadow-[#ff0000]/10',
    label: 'API Key',
    placeholder: 'Paste your YouTube Data API Key…',
    description: 'Manage your channel, schedule uploads, track analytics, and automate YouTube income systems.',
    ashCapabilities: ['Schedule video uploads', 'Track channel analytics', 'Generate video metadata', 'Optimize for SEO'],
    docsUrl: 'https://console.developers.google.com/',
    guide: [
      'Go to console.developers.google.com',
      'Create a project → Enable "YouTube Data API v3"',
      'Go to Credentials → Create API Key',
      'Paste the API key below',
    ],
  },
];

function ConnectModal({ platform, existingData, onClose, onSaved }) {
  const [value, setValue] = useState('');
  const [showValue, setShowValue] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeGuideStep, setActiveGuideStep] = useState(0);
  const inputRef = useRef(null);
  const { currentUser } = useAuth();

  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 150); }, []);

  const handleSave = async () => {
    if (!value.trim()) { toast.error('Please paste your token or key'); return; }
    setSaving(true);
    try {
      const res = await fetch('/api/user-credentials', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          userId: currentUser?.id,
          credentialKey: platform.key,
          encryptedValue: btoa(value.trim()),
        }),
      });
      if (!res.ok) throw new Error('Failed to save');
      toast.success(`${platform.name} connected to ASH`);
      onSaved();
      onClose();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg mx-4 bg-[#0a0a1a] border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
        <div className={`h-1 bg-gradient-to-r ${platform.gradient.replace('/20', '').replace('/10', '')}`} />
        <div className="p-6">
          <div className="flex items-start justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl bg-gradient-to-br ${platform.gradient} border ${platform.border}`}>
                {platform.icon}
              </div>
              <div>
                <h3 className="text-white font-semibold">Connect {platform.name}</h3>
                <p className="text-xs text-white/40 font-mono">Stored securely · Encrypted at rest</p>
              </div>
            </div>
            <button onClick={onClose} className="text-white/30 hover:text-white/70 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="mb-5 bg-white/3 border border-white/8 rounded-xl p-4">
            <p className="text-[11px] text-white/50 font-mono font-semibold uppercase tracking-widest mb-3">How to get your token</p>
            <div className="space-y-2">
              {platform.guide.map((step, i) => (
                <div key={i} className="flex items-start gap-2.5 cursor-pointer" onClick={() => setActiveGuideStep(i)}>
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-[10px] font-bold transition-colors ${activeGuideStep === i ? `bg-gradient-to-br ${platform.gradient} border ${platform.border} text-white` : 'bg-white/5 border border-white/10 text-white/30'}`}>
                    {i + 1}
                  </div>
                  <p className={`text-xs leading-relaxed transition-colors ${activeGuideStep === i ? 'text-white/80' : 'text-white/35'}`}>{step}</p>
                </div>
              ))}
            </div>
            <a href={platform.docsUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 mt-3 pt-3 border-t border-white/8 text-[11px] text-white/35 hover:text-white/60 transition-colors">
              <ExternalLink className="w-3 h-3" />
              Official {platform.name} Developer Docs
            </a>
          </div>

          <div className="space-y-2 mb-5">
            <label className="text-xs text-white/50 font-mono font-semibold">{platform.label}</label>
            <div className="relative">
              <input
                ref={inputRef}
                type={showValue ? 'text' : 'password'}
                value={value}
                onChange={e => setValue(e.target.value)}
                placeholder={platform.placeholder}
                className="w-full bg-white/4 border border-white/10 rounded-xl px-4 py-3 pr-10 text-sm text-white/90 placeholder-white/20 focus:outline-none focus:border-white/25 font-mono"
                onKeyDown={e => e.key === 'Enter' && handleSave()}
              />
              <button onClick={() => setShowValue(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors">
                {showValue ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-white/10 text-sm text-white/50 hover:text-white/70 hover:border-white/20 transition-colors">
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !value.trim()}
              className={`flex-1 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all ${saving || !value.trim() ? 'bg-white/5 text-white/25 cursor-not-allowed' : `bg-gradient-to-r ${platform.gradient} border ${platform.border} text-white hover:opacity-90`}`}
            >
              {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : `Connect ${platform.name}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function PlatformCard({ platform, credential, onConnect, onDisconnect }) {
  const isConnected = !!credential;
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={`relative rounded-2xl border ${platform.border} bg-gradient-to-br ${platform.gradient} backdrop-blur-sm overflow-hidden transition-all duration-300 hover:shadow-lg hover:${platform.glow}`}>
      <div className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-2xl border ${platform.border} bg-black/30`}>
              {platform.icon}
            </div>
            <div>
              <h3 className="text-white font-semibold text-sm">{platform.name}</h3>
              <p className="text-xs text-white/35 font-mono">{platform.handle}</p>
            </div>
          </div>
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-semibold ${isConnected ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400' : 'bg-white/4 border-white/10 text-white/30'}`}>
            <div className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-emerald-400' : 'bg-white/20'}`} />
            {isConnected ? 'Connected' : 'Not Connected'}
          </div>
        </div>

        <p className="text-xs text-white/55 leading-relaxed mb-4">{platform.description}</p>

        {isConnected && (
          <div className="mb-4">
            <div className="flex items-center gap-1.5 mb-2">
              <Zap className="w-3 h-3 text-emerald-400" />
              <span className="text-[10px] text-emerald-400/70 font-mono font-semibold uppercase tracking-widest">ASH Can Now</span>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {platform.ashCapabilities.map((cap, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <CheckCircle className="w-2.5 h-2.5 text-emerald-400 shrink-0" />
                  <span className="text-[10px] text-white/50">{cap}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {!isConnected && (
          <button onClick={() => setExpanded(e => !e)} className="text-[11px] text-white/35 hover:text-white/55 transition-colors mb-3">
            {expanded ? 'Hide capabilities ↑' : 'See what ASH can do ↓'}
          </button>
        )}

        {!isConnected && expanded && (
          <div className="mb-4 grid grid-cols-2 gap-1.5">
            {platform.ashCapabilities.map((cap, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <Circle className="w-2.5 h-2.5 text-white/20 shrink-0" />
                <span className="text-[10px] text-white/35">{cap}</span>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-2">
          {isConnected ? (
            <>
              <button
                onClick={() => onConnect(platform)}
                className="flex-1 py-2 rounded-xl text-xs font-semibold bg-white/6 border border-white/10 text-white/55 hover:text-white/80 hover:border-white/20 transition-colors"
              >
                Update Token
              </button>
              <button
                onClick={() => onDisconnect(credential.id, platform.name)}
                className="px-3 py-2 rounded-xl text-xs font-semibold text-red-400/60 hover:text-red-400 border border-red-500/10 hover:border-red-500/25 transition-colors"
              >
                Disconnect
              </button>
            </>
          ) : (
            <button
              onClick={() => onConnect(platform)}
              className={`w-full py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r ${platform.gradient} border ${platform.border} text-white hover:opacity-90 transition-opacity flex items-center justify-center gap-2`}
            >
              <span>{platform.icon}</span>
              Connect {platform.name}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function SocialAccountsPage() {
  const { currentUser } = useAuth();
  const [credentials, setCredentials] = useState({});
  const [loading, setLoading] = useState(true);
  const [modalPlatform, setModalPlatform] = useState(null);

  const fetchCredentials = async () => {
    if (!currentUser?.id) return;
    try {
      const res = await fetch('/api/user-credentials', { headers: authHeaders() });
      if (!res.ok) return;
      const data = await res.json();
      const map = {};
      for (const cred of (Array.isArray(data) ? data : [])) {
        map[cred.credentialKey] = cred;
      }
      setCredentials(map);
    } catch { /* silent */ }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchCredentials(); }, [currentUser?.id]);

  const handleDisconnect = async (credId, platformName) => {
    if (!window.confirm(`Disconnect ${platformName} from ASH?`)) return;
    try {
      await fetch(`/api/user-credentials/${credId}`, { method: 'DELETE', headers: authHeaders() });
      toast.success(`${platformName} disconnected`);
      fetchCredentials();
    } catch { toast.error('Failed to disconnect'); }
  };

  const connectedCount = SOCIAL_PLATFORMS.filter(p => credentials[p.key]).length;

  return (
    <div className="min-h-screen bg-background text-foreground relative overflow-hidden">
      <VideoBackground />
      <Header />

      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-24">

        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-xs text-violet-400 font-mono font-semibold mb-5">
            <Share2 className="w-3 h-3" />
            ASH SOCIAL INTELLIGENCE
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Connect Your Social Platforms
          </h1>
          <p className="text-white/50 text-base max-w-2xl mx-auto leading-relaxed">
            Connect your social accounts once. ASH automatically uses them when building your income systems — posting content, tracking analytics, growing your audience, and running campaigns on your behalf.
          </p>
          {connectedCount > 0 && (
            <div className="inline-flex items-center gap-2 mt-4 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-sm text-emerald-400">
              <CheckCircle className="w-4 h-4" />
              {connectedCount} of {SOCIAL_PLATFORMS.length} platforms connected
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 mb-12">
          {loading
            ? Array.from({ length: 7 }).map((_, i) => (
                <div key={i} className="h-52 rounded-2xl bg-white/3 border border-white/8 animate-pulse" />
              ))
            : SOCIAL_PLATFORMS.map(platform => (
                <PlatformCard
                  key={platform.key}
                  platform={platform}
                  credential={credentials[platform.key]}
                  onConnect={setModalPlatform}
                  onDisconnect={handleDisconnect}
                />
              ))
          }
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-10">
          {[
            { icon: <Film className="w-5 h-5 text-violet-400" />, title: 'Content Automation', desc: 'ASH auto-generates and schedules posts, videos, and stories across all connected platforms.' },
            { icon: <TrendingUp className="w-5 h-5 text-emerald-400" />, title: 'Growth Intelligence', desc: 'ASH monitors analytics, A/B tests content, and scales what works across your social graph.' },
            { icon: <Users className="w-5 h-5 text-sky-400" />, title: 'Audience Targeting', desc: 'ASH identifies high-value audiences and auto-optimizes your content for maximum reach and revenue.' },
          ].map((item, i) => (
            <div key={i} className="rounded-2xl border border-white/8 bg-white/3 p-5">
              <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/8 flex items-center justify-center mb-3">
                {item.icon}
              </div>
              <h3 className="text-sm font-semibold text-white mb-1.5">{item.title}</h3>
              <p className="text-xs text-white/45 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>

        <div className="text-center">
          <p className="text-xs text-white/25 font-mono mb-3">All credentials are encrypted at rest and never shared. You can disconnect at any time.</p>
          <div className="flex items-center justify-center gap-4">
            <Link to="/builder" className="text-sm text-violet-400 hover:text-violet-300 transition-colors">
              → Start Building with ASH
            </Link>
            <Link to="/connections" className="text-sm text-white/30 hover:text-white/50 transition-colors">
              All Connections Hub
            </Link>
          </div>
        </div>
      </main>

      {modalPlatform && (
        <ConnectModal
          platform={modalPlatform}
          existingData={credentials[modalPlatform.key]}
          onClose={() => setModalPlatform(null)}
          onSaved={fetchCredentials}
        />
      )}

      <Footer />
    </div>
  );
}
