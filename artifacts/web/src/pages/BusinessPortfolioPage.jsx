import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Building2, Plus, ArrowRight, Globe, Wrench, Download, Trash2,
  MoreVertical, RefreshCw,
} from 'lucide-react';
import AuthLayout from '@/components/AuthLayout.jsx';
import HealthScoreCard from '@/components/HealthScoreCard.jsx';
import { Helmet } from 'react-helmet';
import { toast } from 'sonner';

const authHeaders = () => {
  const token = localStorage.getItem('sbep_auth_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const ORIGIN_META = {
  built:    { label: 'Built on SBEP', badge: 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20', icon: Wrench },
  imported: { label: 'Imported',      badge: 'bg-blue-400/10 text-blue-400 border-blue-400/20',          icon: Download },
};

const STATUS_META = {
  active:   { label: 'Active',   dot: 'bg-emerald-400' },
  paused:   { label: 'Paused',   dot: 'bg-amber-400' },
  archived: { label: 'Archived', dot: 'bg-zinc-500' },
};

function BusinessCard({ business, onView, onDelete }) {
  const origin = ORIGIN_META[business.origin] ?? ORIGIN_META.imported;
  const OriginIcon = origin.icon;
  const status = STATUS_META[(business.status || '').toLowerCase()] ?? STATUS_META.active;
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="group relative rounded-2xl border border-white/10 bg-black/80 backdrop-blur-sm p-5 flex flex-col gap-4 hover:bg-black/90 hover:border-white/20 transition-all cursor-pointer"
      onClick={() => onView(business)}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
            <Building2 className="w-4.5 h-4.5 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">{business.name}</p>
            <p className="text-xs text-muted-foreground/60 font-mono truncate mt-0.5">
              {business.businessType || 'Business'}
            </p>
          </div>
        </div>
        <div className="relative">
          <button
            onClick={(e) => { e.stopPropagation(); setMenuOpen(v => !v); }}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-white/10 transition-all opacity-0 group-hover:opacity-100"
          >
            <MoreVertical className="w-3.5 h-3.5" />
          </button>
          {menuOpen && (
            <div
              className="absolute right-0 top-full mt-1 z-20 min-w-[140px] rounded-xl bg-zinc-900 border border-white/10 shadow-xl overflow-hidden"
              onMouseLeave={() => setMenuOpen(false)}
            >
              <button
                onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onDelete(business); }}
                className="flex w-full items-center gap-2 px-3 py-2 text-xs text-rose-400 hover:bg-rose-400/10 transition-colors"
              >
                <Trash2 className="w-3 h-3" /> Delete
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-mono font-semibold uppercase tracking-wider ${origin.badge}`}>
          <OriginIcon className="w-3 h-3" />
          {origin.label}
        </span>
        <span className="inline-flex items-center gap-1.5 text-[10px] font-mono text-muted-foreground/70">
          <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
          {status.label}
        </span>
        <HealthScoreCard businessId={business.id} compact />
      </div>

      {business.websiteUrl && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground/60 font-mono truncate">
          <Globe className="w-3 h-3 shrink-0" />
          <span className="truncate">{business.websiteUrl.replace(/^https?:\/\//, '')}</span>
        </div>
      )}

      <div className="flex items-center justify-between mt-auto pt-1">
        <span className="text-[10px] text-muted-foreground/40 font-mono">
          {business.revenueModel || 'No revenue model set'}
        </span>
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary">
          View <ArrowRight className="w-3 h-3" />
        </span>
      </div>
    </motion.div>
  );
}

export default function BusinessPortfolioPage() {
  const navigate = useNavigate();
  const [businesses, setBusinesses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/businesses', { headers: authHeaders() });
      if (!res.ok) throw new Error('Failed to load businesses');
      const data = await res.json();
      setBusinesses(data);
    } catch (err) {
      toast.error(err.message || 'Failed to load businesses');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (business) => {
    if (!confirm(`Delete "${business.name}"? This cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/businesses/${business.id}`, { method: 'DELETE', headers: authHeaders() });
      if (!res.ok) throw new Error('Failed to delete business');
      setBusinesses(prev => prev.filter(b => b.id !== business.id));
      toast.success('Business deleted');
    } catch (err) {
      toast.error(err.message || 'Failed to delete business');
    }
  };

  const filtered = businesses.filter(b => filter === 'all' || b.origin === filter);

  return (
    <AuthLayout>
      <Helmet><title>My Businesses · SBEP</title></Helmet>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex items-center justify-between flex-wrap gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold font-mono text-foreground">My Businesses</h1>
            <p className="text-sm text-muted-foreground/70 mt-1">
              Every business you've built with ASH AI or imported from elsewhere, in one place.
            </p>
          </div>
          <button
            onClick={() => navigate('/business-import')}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 active:scale-[0.98] transition-all"
          >
            <Plus className="w-4 h-4" />
            Import a Business
          </button>
        </div>

        <div className="flex items-center gap-2 mb-6">
          {[
            { key: 'all', label: 'All' },
            { key: 'built', label: 'Built on SBEP' },
            { key: 'imported', label: 'Imported' },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold font-mono transition-all ${
                filter === tab.key
                  ? 'bg-white/10 text-foreground border border-white/20'
                  : 'text-muted-foreground/60 hover:text-foreground hover:bg-white/5 border border-transparent'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <RefreshCw className="w-6 h-6 text-muted-foreground/40 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-black/60 p-12 text-center">
            <Building2 className="w-10 h-10 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="text-base font-semibold text-foreground mb-2">No businesses yet</h3>
            <p className="text-sm text-muted-foreground/60 mb-6 max-w-sm mx-auto">
              Import an existing business to bring it under ASH AI's management, or build a new one from a blueprint.
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => navigate('/business-import')}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-all"
              >
                <Download className="w-4 h-4" /> Import a Business
              </button>
              <button
                onClick={() => navigate('/system-builder')}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-foreground text-sm font-semibold hover:bg-white/10 transition-all"
              >
                <Wrench className="w-4 h-4" /> Build a New System
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(business => (
              <BusinessCard
                key={business.id}
                business={business}
                onView={(b) => navigate(`/business-portfolio/${b.id}`)}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>
    </AuthLayout>
  );
}
