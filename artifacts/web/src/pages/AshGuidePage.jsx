import React from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { ArrowRight, GraduationCap, MessageSquare } from 'lucide-react';
import AuthLayout from '@/components/AuthLayout.jsx';
import { GUIDE_SECTIONS, askAsh } from '@/lib/ashGuide.js';

export default function AshGuidePage() {
  return (
    <AuthLayout>
      <Helmet><title>ASH Guide | Starks Global Group</title></Helmet>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-5">
        <header>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-white">
            <GraduationCap className="w-6 h-6 text-cyan-300" /> How to use ASH
          </h1>
          <p className="text-sm text-white/55 mt-1 max-w-2xl">
            Everything ASH can do and where to find it. Press <span className="font-semibold text-white/80">Try it</span> on any example to put it in the ASH box; nothing is sent until you press Enter.
          </p>
          <nav className="flex flex-wrap gap-2 mt-4" aria-label="Guide sections">
            {GUIDE_SECTIONS.map((s) => (
              <a key={s.id} href={`#${s.id}`} className="text-xs px-2.5 py-1 rounded-full border border-white/10 text-white/60 hover:text-white hover:border-cyan-400/40">
                {s.title}
              </a>
            ))}
          </nav>
        </header>

        {GUIDE_SECTIONS.map((s) => (
          <section key={s.id} id={s.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 sm:p-5 scroll-mt-20">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <h2 className="text-lg font-semibold text-white">{s.title}</h2>
                <p className="text-[11px] uppercase tracking-wider text-cyan-300/70 mt-0.5">{s.where}</p>
              </div>
              {s.link && (
                <Link to={s.link.to} className="inline-flex items-center gap-1 text-xs text-cyan-300 hover:text-cyan-200">
                  Open {s.link.label} <ArrowRight className="w-3 h-3" />
                </Link>
              )}
            </div>
            <p className="text-sm text-white/70 mt-3">{s.summary}</p>
            {s.tips?.length > 0 && (
              <ul className="mt-3 space-y-1 text-xs text-white/50 list-disc pl-4">
                {s.tips.map((t) => <li key={t}>{t}</li>)}
              </ul>
            )}
            {s.examples?.length > 0 && (
              <div className="mt-4 flex flex-col gap-2">
                {s.examples.map((ex) => (
                  <div key={ex} className="flex items-center justify-between gap-3 rounded-lg border border-white/8 bg-black/20 px-3 py-2">
                    <span className="text-sm text-white/80">“{ex}”</span>
                    <button
                      type="button"
                      onClick={() => askAsh(ex)}
                      className="shrink-0 inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-md bg-cyan-500/15 text-cyan-200 hover:bg-cyan-500/25"
                    >
                      <MessageSquare className="w-3 h-3" /> Try it
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        ))}
      </div>
    </AuthLayout>
  );
}
