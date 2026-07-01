import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Building2, Globe, Wrench, Download, Link2,
  RefreshCw, FileText,
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

export default function BusinessDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [business, setBusiness] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/businesses/${id}`, { headers: authHeaders() });
      if (!res.ok) throw new Error('Business not found');
      const data = await res.json();
      setBusiness(data);
    } catch (err) {
      toast.error(err.message || 'Failed to load business');
      navigate('/business-portfolio');
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <AuthLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <RefreshCw className="w-6 h-6 text-muted-foreground/40 animate-spin" />
        </div>
      </AuthLayout>
    );
  }

  if (!business) return null;

  const origin = ORIGIN_META[business.origin] ?? ORIGIN_META.imported;
  const OriginIcon = origin.icon;
  const connections = business.connections || [];

  return (
    <AuthLayout>
      <Helmet><title>{business.name} · SBEP</title></Helmet>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <button
          onClick={() => navigate('/business-portfolio')}
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground/60 hover:text-foreground font-mono mb-6 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Businesses
        </button>

        <div className="flex items-start gap-4 mb-6">
          <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
            <Building2 className="w-5.5 h-5.5 text-primary" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-bold font-mono text-foreground">{business.name}</h1>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-mono font-semibold uppercase tracking-wider ${origin.badge}`}>
                <OriginIcon className="w-3 h-3" /> {origin.label}
              </span>
              {business.businessType && (
                <span className="text-[10px] font-mono text-muted-foreground/60 uppercase tracking-wider">{business.businessType}</span>
              )}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-black/70 p-6 space-y-4 mb-6">
          {business.revenueModel && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground/60">Revenue model</span>
              <span className="text-foreground font-medium">{business.revenueModel}</span>
            </div>
          )}
          {business.websiteUrl && (
            <div className="flex justify-between text-sm items-center">
              <span className="text-muted-foreground/60">Website</span>
              <a href={business.websiteUrl} target="_blank" rel="noopener noreferrer" className="text-primary font-medium inline-flex items-center gap-1 hover:underline">
                <Globe className="w-3.5 h-3.5" /> {business.websiteUrl.replace(/^https?:\/\//, '')}
              </a>
            </div>
          )}
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground/60">Status</span>
            <span className="text-foreground font-medium capitalize">{business.status || 'active'}</span>
          </div>
          {business.notes && (
            <div className="pt-2 border-t border-white/10">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground/60 mb-1.5">
                <FileText className="w-3.5 h-3.5" /> Notes
              </div>
              <p className="text-sm text-foreground/80 whitespace-pre-wrap">{business.notes}</p>
            </div>
          )}
        </div>

        <HealthScoreCard businessId={business.id} className="mb-6" />

        <div className="rounded-2xl border border-white/10 bg-black/70 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-foreground">Connected Platforms</h2>
            <button
              onClick={() => navigate('/connections')}
              className="text-xs text-primary hover:underline"
            >
              Manage in Connections Hub →
            </button>
          </div>
          {connections.length === 0 ? (
            <p className="text-sm text-muted-foreground/60">No platforms connected yet.</p>
          ) : (
            <div className="space-y-2">
              {connections.map(conn => (
                <div key={conn.id} className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10">
                  <div className="flex items-center gap-2 min-w-0">
                    <Link2 className="w-3.5 h-3.5 text-muted-foreground/50 shrink-0" />
                    <span className="text-sm text-foreground truncate">{conn.platformName}</span>
                  </div>
                  <span className="text-[10px] font-mono text-muted-foreground/50 uppercase">{conn.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AuthLayout>
  );
}
