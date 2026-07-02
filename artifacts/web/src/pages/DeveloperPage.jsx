import React, { useState } from 'react';
import { Helmet } from 'react-helmet';
import { Link } from 'react-router-dom';
import VideoBackground from '@/components/VideoBackground.jsx';
import {
  Code, Key, Zap, Shield, Copy, Check, ChevronRight,
  Terminal, Globe, Lock, AlertCircle, ExternalLink,
} from 'lucide-react';
import Header from '@/components/Header.jsx';
import Footer from '@/components/Footer.jsx';

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <button
      onClick={copy}
      className="shrink-0 p-1.5 rounded-md hover:bg-white/10 text-white/40 hover:text-white/80 transition-colors"
      title="Copy"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

function CodeBlock({ code, lang = 'bash' }) {
  return (
    <div className="relative group rounded-xl border border-white/10 bg-black/40 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/8 bg-white/3">
        <span className="text-[10px] font-mono text-white/30 uppercase tracking-widest">{lang}</span>
        <CopyButton text={code} />
      </div>
      <pre className="p-4 text-sm font-mono text-white/80 overflow-x-auto leading-relaxed whitespace-pre">
        {code}
      </pre>
    </div>
  );
}

const ENDPOINTS = [
  {
    method: 'GET',
    path: '/api/blueprints',
    desc: 'List all available blueprints with details, difficulty, and estimated costs.',
    auth: true,
  },
  {
    method: 'GET',
    path: '/api/blueprints/:slug',
    desc: 'Retrieve a single blueprint by its slug identifier.',
    auth: true,
  },
  {
    method: 'GET',
    path: '/api/tools',
    desc: 'Browse the full Starks Marketplace tool directory.',
    auth: true,
  },
  {
    method: 'POST',
    path: '/api/system-instances',
    desc: 'Create a new system instance tied to a blueprint for a user.',
    auth: true,
  },
  {
    method: 'GET',
    path: '/api/system-instances',
    desc: 'List all system instances for the authenticated user.',
    auth: true,
  },
  {
    method: 'POST',
    path: '/api/ai-orchestrator/chat',
    desc: 'Send a message to ASH AI — returns a single JSON response with the full reply.',
    auth: true,
  },
  {
    method: 'POST',
    path: '/api/ai-orchestrator/stream',
    desc: 'Stream ASH AI responses token-by-token via Server-Sent Events (SSE).',
    auth: true,
  },
  {
    method: 'GET',
    path: '/api/developer/keys',
    desc: 'List your API keys (name, prefix, usage stats, revocation status).',
    auth: true,
  },
  {
    method: 'POST',
    path: '/api/developer/keys',
    desc: 'Generate a new API key. The raw key is returned only once.',
    auth: true,
  },
  {
    method: 'DELETE',
    path: '/api/developer/keys/:id',
    desc: 'Permanently revoke an API key. Revoked keys cannot be restored.',
    auth: true,
  },
  {
    method: 'POST',
    path: '/api/developer/keys/:id/rotate',
    desc: 'Revoke an existing key and issue a new one with the same name atomically.',
    auth: true,
  },
  {
    method: 'GET',
    path: '/api/developer/usage',
    desc: 'Retrieve daily call counts, top endpoints, rate-limit incidents, and aggregate usage for 30 days.',
    auth: true,
  },
];

const METHOD_COLORS = {
  GET: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
  POST: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
  DELETE: 'text-red-400 bg-red-400/10 border-red-400/20',
  PATCH: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
};

export default function DeveloperPage() {
  const baseUrl = window.location.origin;

  const curlExample = `curl -X GET "${baseUrl}/api/blueprints" \\
  -H "X-API-Key: sbep_your_api_key_here" \\
  -H "Content-Type: application/json"`;

  const jsExample = `const SBEP_KEY = 'sbep_your_api_key_here';
const BASE = '${baseUrl}';

async function getBlueprints() {
  const res = await fetch(\`\${BASE}/api/blueprints\`, {
    headers: { 'X-API-Key': SBEP_KEY }
  });
  return res.json();
}

async function chatWithASH(message) {
  const res = await fetch(\`\${BASE}/api/ai-orchestrator/chat\`, {
    method: 'POST',
    headers: {
      'X-API-Key': SBEP_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ message, stream: false }),
  });
  return res.json();
}`;

  const pythonExample = `import requests

SBEP_KEY = "sbep_your_api_key_here"
BASE = "${baseUrl}"
HEADERS = {"X-API-Key": SBEP_KEY}

def get_blueprints():
    r = requests.get(f"{BASE}/api/blueprints", headers=HEADERS)
    r.raise_for_status()
    return r.json()

def chat_with_ash(message: str):
    r = requests.post(
        f"{BASE}/api/ai-orchestrator/chat",
        headers={**HEADERS, "Content-Type": "application/json"},
        json={"message": message, "stream": False},
    )
    r.raise_for_status()
    return r.json()`;

  const sseExample = `const SBEP_KEY = 'sbep_your_api_key_here';
const BASE = '${baseUrl}';

// POST to /api/ai-orchestrator/stream for SSE token streaming
const res = await fetch(\`\${BASE}/api/ai-orchestrator/stream\`, {
  method: 'POST',
  headers: {
    'X-API-Key': SBEP_KEY,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    message: 'Build me a TikTok affiliate system',
    // Optional: sessionId, model, systemInstanceId
  }),
});

const reader = res.body.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  const lines = decoder.decode(value).split('\\n');
  for (const line of lines) {
    if (!line.startsWith('data: ')) continue;
    const data = JSON.parse(line.slice(6));
    if (data.delta) process.stdout.write(data.delta);
    if (data.done) break;
  }
}`;

  return (
    <VideoBackground>
      <Helmet><title>Developer API | Starks Global Group</title></Helmet>
      <Header />

      <div className="text-white">
        {/* Hero */}
        <div className="relative border-b border-white/8">
          <div className="absolute inset-0 bg-gradient-to-br from-violet-600/8 via-transparent to-blue-600/5 pointer-events-none" />
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-20 relative">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-xs text-violet-400 font-mono font-semibold mb-6">
              <Code className="w-3 h-3" /> DEVELOPER API — EMPIRE TIER
            </div>
            <h1 className="text-5xl font-extrabold font-mono tracking-tight mb-4">
              Build on SBEP
            </h1>
            <p className="text-white/50 text-lg max-w-2xl mb-8">
              Integrate Starks Blueprint Execution Platform into your products. Access blueprints, the Marketplace, ASH AI, and system automation through a clean REST API.
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <Link
                to="/settings/developer"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-sm transition-colors"
              >
                <Key className="w-4 h-4" /> Get API Key
              </Link>
              <a
                href="#endpoints"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 font-semibold text-sm transition-colors"
              >
                <Terminal className="w-4 h-4" /> Browse Endpoints
              </a>
            </div>
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-20">

          {/* Quick stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Base URL', value: 'REST / JSON', icon: Globe },
              { label: 'Auth', value: 'X-API-Key', icon: Lock },
              { label: 'Rate Limit', value: '100 req/min', icon: Zap },
              { label: 'Streaming', value: 'SSE Support', icon: Terminal },
            ].map(({ label, value, icon: Icon }) => (
              <div key={label} className="p-4 rounded-xl border border-white/8 bg-white/2 text-center">
                <Icon className="w-5 h-5 text-violet-400 mx-auto mb-2" />
                <p className="text-xs font-mono text-white/40 uppercase tracking-widest mb-0.5">{label}</p>
                <p className="text-sm font-bold text-white font-mono">{value}</p>
              </div>
            ))}
          </div>

          {/* Authentication */}
          <section id="authentication">
            <h2 className="text-2xl font-extrabold font-mono mb-2">Authentication</h2>
            <p className="text-white/50 mb-6">
              Every request must include your API key in the <code className="px-1.5 py-0.5 rounded bg-white/8 text-violet-300 text-xs font-mono">X-API-Key</code> header.
              Keys are prefixed with <code className="px-1.5 py-0.5 rounded bg-white/8 text-violet-300 text-xs font-mono">sbep_</code> and are generated in your{' '}
              <Link to="/settings/developer" className="text-violet-400 hover:text-violet-300 underline">Developer Settings</Link>.
            </p>

            <div className="p-4 rounded-xl border border-amber-500/20 bg-amber-500/5 flex items-start gap-3 mb-6">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <p className="text-sm text-amber-200/80">
                Keep your API key secret. Do not expose it in client-side JavaScript, public repos, or logs.
                Revoke and rotate immediately if compromised.
              </p>
            </div>

            <CodeBlock code={curlExample} lang="curl" />
          </section>

          {/* Rate limits */}
          <section id="rate-limits">
            <h2 className="text-2xl font-extrabold font-mono mb-2">Rate Limits</h2>
            <p className="text-white/50 mb-6">
              Rate limits are applied per API key per 60-second window. Exceeding the limit returns <code className="px-1.5 py-0.5 rounded bg-white/8 text-white/70 text-xs font-mono">429 Too Many Requests</code>.
            </p>
            <div className="overflow-x-auto rounded-xl border border-white/8">
              <table className="w-full text-sm min-w-[420px]">
                <thead>
                  <tr className="border-b border-white/8 bg-white/3">
                    <th className="text-left px-5 py-3 text-xs font-mono text-white/40 uppercase tracking-widest">Tier</th>
                    <th className="text-left px-5 py-3 text-xs font-mono text-white/40 uppercase tracking-widest">Requests / Min</th>
                    <th className="text-left px-5 py-3 text-xs font-mono text-white/40 uppercase tracking-widest">Max Keys</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { tier: 'Empire', color: 'text-violet-300', rpm: 100, keys: 5 },
                    { tier: 'Operator', color: 'text-blue-300', rpm: 20, keys: 5 },
                    { tier: 'Free / Starter', color: 'text-white/50', rpm: 20, keys: 5 },
                  ].map(({ tier, color, rpm, keys }) => (
                    <tr key={tier} className="border-b border-white/5 last:border-0">
                      <td className={`px-5 py-3.5 font-semibold font-mono ${color}`}>{tier}</td>
                      <td className="px-5 py-3.5 text-white/70">{rpm}</td>
                      <td className="px-5 py-3.5 text-white/70">{keys}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-white/30 font-mono mt-3">
              Response headers include <code>X-RateLimit-Limit</code>, <code>X-RateLimit-Remaining</code>, and <code>X-RateLimit-Reset</code>.
            </p>
          </section>

          {/* Endpoints */}
          <section id="endpoints">
            <h2 className="text-2xl font-extrabold font-mono mb-2">API Endpoints</h2>
            <p className="text-white/50 mb-6">
              All endpoints are relative to <code className="px-1.5 py-0.5 rounded bg-white/8 text-violet-300 text-xs font-mono">{baseUrl}</code>
            </p>
            <div className="space-y-3">
              {ENDPOINTS.map((ep) => (
                <div key={ep.path} className="flex items-start gap-4 p-4 rounded-xl border border-white/8 bg-white/2 hover:bg-white/4 transition-colors">
                  <span className={`shrink-0 inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-bold border ${METHOD_COLORS[ep.method] ?? 'text-white/50 bg-white/5 border-white/10'}`}>
                    {ep.method}
                  </span>
                  <div className="min-w-0">
                    <code className="text-sm font-mono text-white/80">{ep.path}</code>
                    <p className="text-xs text-white/40 mt-0.5">{ep.desc}</p>
                  </div>
                  {ep.auth && (
                    <Shield className="w-3.5 h-3.5 text-violet-400/60 shrink-0 mt-0.5 ml-auto" title="Requires API key" />
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* Code examples */}
          <section id="examples">
            <h2 className="text-2xl font-extrabold font-mono mb-6">Code Examples</h2>
            <div className="space-y-8">
              <div>
                <h3 className="text-sm font-semibold text-white/60 font-mono uppercase tracking-wider mb-3">JavaScript / TypeScript</h3>
                <CodeBlock code={jsExample} lang="javascript" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white/60 font-mono uppercase tracking-wider mb-3">Python</h3>
                <CodeBlock code={pythonExample} lang="python" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white/60 font-mono uppercase tracking-wider mb-3">ASH Streaming (Server-Sent Events)</h3>
                <p className="text-sm text-white/40 mb-3">
                  The <code className="px-1.5 py-0.5 rounded bg-white/8 text-violet-300 text-xs font-mono">/api/ai-orchestrator/stream</code> endpoint returns an SSE stream. Each event carries a <code className="px-1.5 py-0.5 rounded bg-white/8 text-white/60 text-xs font-mono">delta</code> field with the next token chunk.
                </p>
                <CodeBlock code={sseExample} lang="javascript" />
              </div>
            </div>
          </section>

          {/* Error codes */}
          <section id="errors">
            <h2 className="text-2xl font-extrabold font-mono mb-2">Error Codes</h2>
            <div className="overflow-x-auto rounded-xl border border-white/8">
              <table className="w-full text-sm min-w-[420px]">
                <thead>
                  <tr className="border-b border-white/8 bg-white/3">
                    <th className="text-left px-5 py-3 text-xs font-mono text-white/40 uppercase tracking-widest">Status</th>
                    <th className="text-left px-5 py-3 text-xs font-mono text-white/40 uppercase tracking-widest">Meaning</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { code: '200', meaning: 'OK — request succeeded' },
                    { code: '201', meaning: 'Created — resource created successfully' },
                    { code: '400', meaning: 'Bad Request — malformed or missing body' },
                    { code: '401', meaning: 'Unauthorized — missing or invalid API key' },
                    { code: '403', meaning: 'Forbidden — your tier does not have access' },
                    { code: '404', meaning: 'Not Found — resource does not exist' },
                    { code: '409', meaning: 'Conflict — e.g. key limit reached' },
                    { code: '429', meaning: 'Too Many Requests — rate limit exceeded' },
                    { code: '500', meaning: 'Internal Server Error — contact support' },
                  ].map(({ code, meaning }) => (
                    <tr key={code} className="border-b border-white/5 last:border-0">
                      <td className="px-5 py-3 font-mono font-bold text-violet-300">{code}</td>
                      <td className="px-5 py-3 text-white/60">{meaning}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* CTA */}
          <div className="rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-600/10 to-blue-600/5 p-8 text-center">
            <h2 className="text-2xl font-extrabold font-mono mb-2">Ready to build?</h2>
            <p className="text-white/50 mb-6 max-w-md mx-auto">
              Generate your API key from Developer Settings and start integrating SBEP into your product in minutes.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <Link
                to="/settings/developer"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold transition-colors"
              >
                <Key className="w-4 h-4" /> Get API Key
                <ChevronRight className="w-4 h-4" />
              </Link>
              <a
                href="mailto:support@starksglobalgroup.net"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 font-semibold transition-colors"
              >
                <ExternalLink className="w-4 h-4" /> Contact Support
              </a>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </VideoBackground>
  );
}
