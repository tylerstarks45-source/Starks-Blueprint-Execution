
import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AdminDataProvider } from '@/contexts/AdminDataContext.jsx';

class AdminErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() { return { hasError: true }; }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-64 gap-4 text-muted-foreground">
          <p className="text-sm">Something went wrong loading the admin panel.</p>
          <button
            className="text-xs px-4 py-2 rounded border border-border hover:bg-muted/30 transition-colors"
            onClick={() => window.location.reload()}
          >
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
import {
  LayoutDashboard, DollarSign, BrainCircuit, Server, TrendingUp,
  Users, Bell, ShieldCheck, CreditCard, ShoppingBag, Globe, Share2, Trophy, GitBranch,
  ScrollText, Building2,
} from 'lucide-react';

import AdminPlatformMetricsCard from './AdminPlatformMetricsCard.jsx';
import AdminAIUsageAnalyticsCard from './AdminAIUsageAnalyticsCard.jsx';
import AdminOpenRouterHealthCard from './AdminOpenRouterHealthCard.jsx';
import AdminGlobalTokenUsageCard from './AdminGlobalTokenUsageCard.jsx';
import AdminPlatformRequestVolumeCard from './AdminPlatformRequestVolumeCard.jsx';
import AdminAIRuntimeMonitoringCard from './AdminAIRuntimeMonitoringCard.jsx';
import AdminSubscriptionAnalyticsCard from './AdminSubscriptionAnalyticsCard.jsx';
import AdminUserManagementPanel from './AdminUserManagementPanel.jsx';
import AdminPlatformErrorLogsPanel from './AdminPlatformErrorLogsPanel.jsx';
import AdminSystemDiagnosticsPanel from './AdminSystemDiagnosticsPanel.jsx';
import AdminAIInfrastructureMonitoringCard from './AdminAIInfrastructureMonitoringCard.jsx';
import AdminGlobalActivityFeedPanel from './AdminGlobalActivityFeedPanel.jsx';
import AdminBlueprintDeploymentMonitoringCard from './AdminBlueprintDeploymentMonitoringCard.jsx';
import AdminComputeUsageMetricsCard from './AdminComputeUsageMetricsCard.jsx';
import AdminPlatformHealthCard from './AdminPlatformHealthCard.jsx';
import AdminAPIMonitoringCard from './AdminAPIMonitoringCard.jsx';
import AdminUserGrowthAnalyticsCard from './AdminUserGrowthAnalyticsCard.jsx';
import AdminSystemHealthOverviewCard from './AdminSystemHealthOverviewCard.jsx';
import AdminEncryptionKeyWarningCard from './AdminEncryptionKeyWarningCard.jsx';
import AdminRevenueActivityPanel from './AdminRevenueActivityPanel.jsx';
import AdminAIAnalyticsDashboard from './AdminAIAnalyticsDashboard.jsx';
import AdminProfitabilityPanel from './AdminProfitabilityPanel.jsx';
import AdminSystemMonitoringPanel from './AdminSystemMonitoringPanel.jsx';
import AdminMarketplaceToolsPanel from './AdminMarketplaceToolsPanel.jsx';
import AdminSkillEnginePanel from '@/components/admin/AdminSkillEnginePanel.jsx';
import AdminStripePanel from './AdminStripePanel.jsx';
import AdminCommunityBlueprintsPanel from './AdminCommunityBlueprintsPanel.jsx';
import AdminReferralsPanel from '@/components/admin/AdminReferralsPanel.jsx';
import AdminSocialProofPanel from './AdminSocialProofPanel.jsx';
import AdminCohortsPanel from './AdminCohortsPanel.jsx';
import AdminLogsPanel from './AdminLogsPanel.jsx';
import AdminBusinessOpsCard from './AdminBusinessOpsCard.jsx';

import CreditBalanceCard from '@/components/admin/CreditBalanceCard.jsx';
import UsageOverviewCard from '@/components/admin/UsageOverviewCard.jsx';
import MonthlyConsumptionCard from '@/components/admin/MonthlyConsumptionCard.jsx';

const TABS = [
  { key: 'overview',      label: 'Overview',       icon: LayoutDashboard, path: '/admin' },
  { key: 'users',         label: 'Users',           icon: Users,           path: '/admin/users' },
  { key: 'revenue',       label: 'Revenue',         icon: DollarSign,      path: '/admin/revenue' },
  { key: 'stripe',        label: 'Stripe',          icon: CreditCard,      path: '/admin/stripe' },
  { key: 'ai-analytics',  label: 'AI Analytics',    icon: BrainCircuit,    path: '/admin/ai-analytics' },
  { key: 'profitability', label: 'Profitability',   icon: TrendingUp,      path: '/admin/profitability' },
  { key: 'marketplace',   label: 'Marketplace',     icon: ShoppingBag,     path: '/admin/marketplace' },
  { key: 'community',    label: 'Community',       icon: Globe,           path: '/admin/community' },
  { key: 'referrals',    label: 'Referrals',       icon: Share2,          path: '/admin/referrals' },
  { key: 'social-proof', label: 'Social Proof',    icon: Trophy,          path: '/admin/social-proof' },
  { key: 'cohorts',      label: 'Cohorts',         icon: GitBranch,       path: '/admin/cohorts' },
  { key: 'business-ops', label: 'Business Ops',    icon: Building2,       path: '/admin/business-ops' },
  { key: 'systems',      label: 'Systems',         icon: Server,          path: '/admin/systems' },
  { key: 'health',        label: 'Platform Health', icon: ShieldCheck,     path: '/admin/health' },
  { key: 'activity',      label: 'Activity',        icon: Bell,            path: '/admin/activity' },
  { key: 'logs',          label: 'Logs',            icon: ScrollText,      path: '/admin/logs' },
];

function useActiveTab() {
  const { pathname } = useLocation();
  const seg = pathname.replace(/^\/admin\/?/, '').split('/')[0] || 'overview';
  if (TABS.find((t) => t.key === seg)) return seg;
  return 'overview';
}

const AdminDashboardLayout = () => {
  const navigate = useNavigate();
  const activeTab = useActiveTab();

  return (
    <AdminErrorBoundary>
    <AdminDataProvider>
      <div className="space-y-6 animate-in fade-in duration-500 relative z-10">

        {/* Tab navigation */}
        <div className="flex gap-1 p-1 bg-muted/20 rounded-xl border border-border/40 w-fit overflow-x-auto">
          {TABS.map(({ key, label, icon: Icon, path }) => (
            <button
              key={key}
              onClick={() => navigate(path)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                activeTab === key
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        {/* ── Overview tab ─────────────────────────────────────────────────── */}
        {activeTab === 'overview' && (
          <>
            <AdminPlatformMetricsCard />

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="col-span-1 lg:col-span-2">
                <AdminGlobalTokenUsageCard />
              </div>
              <AdminPlatformRequestVolumeCard />
              <AdminPlatformHealthCard />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="col-span-1">
                <AdminEncryptionKeyWarningCard />
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <AdminAIUsageAnalyticsCard />
              <AdminOpenRouterHealthCard />
              <AdminComputeUsageMetricsCard />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <CreditBalanceCard />
              <UsageOverviewCard />
              <MonthlyConsumptionCard />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              <AdminAIInfrastructureMonitoringCard />
              <AdminAIRuntimeMonitoringCard />
              <AdminAPIMonitoringCard />
              <AdminBlueprintDeploymentMonitoringCard />
            </div>

            <div className="grid grid-cols-1">
              <AdminSkillEnginePanel />
            </div>
          </>
        )}

        {/* ── Users tab ────────────────────────────────────────────────────── */}
        {activeTab === 'users' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              <div className="col-span-1 lg:col-span-3">
                <AdminUserManagementPanel />
              </div>
              <div className="space-y-6">
                <AdminUserGrowthAnalyticsCard />
                <AdminSubscriptionAnalyticsCard />
              </div>
            </div>
          </div>
        )}

        {/* ── Revenue tab ──────────────────────────────────────────────────── */}
        {activeTab === 'revenue' && (
          <div className="space-y-6">
            <AdminRevenueActivityPanel />
          </div>
        )}

        {/* ── Stripe tab ───────────────────────────────────────────────────── */}
        {activeTab === 'stripe' && (
          <AdminStripePanel />
        )}

        {/* ── AI Analytics tab ─────────────────────────────────────────────── */}
        {activeTab === 'ai-analytics' && (
          <AdminAIAnalyticsDashboard />
        )}

        {/* ── Profitability tab ────────────────────────────────────────────── */}
        {activeTab === 'profitability' && (
          <AdminProfitabilityPanel />
        )}

        {/* ── Marketplace tab ──────────────────────────────────────────────── */}
        {activeTab === 'marketplace' && (
          <div className="space-y-6">
            <AdminMarketplaceToolsPanel />
          </div>
        )}

        {/* ── Community Blueprints tab ─────────────────────────────────────── */}
        {activeTab === 'community' && (
          <AdminCommunityBlueprintsPanel />
        )}

        {/* ── Referrals tab ────────────────────────────────────────────────── */}
        {activeTab === 'referrals' && (
          <AdminReferralsPanel />
        )}

        {/* ── Social Proof tab ─────────────────────────────────────────────── */}
        {activeTab === 'social-proof' && (
          <AdminSocialProofPanel />
        )}

        {/* ── Cohorts tab ──────────────────────────────────────────────────── */}
        {activeTab === 'cohorts' && (
          <AdminCohortsPanel />
        )}

        {/* ── Business Ops tab ─────────────────────────────────────────────── */}
        {activeTab === 'business-ops' && (
          <AdminBusinessOpsCard />
        )}

        {/* ── Systems tab ──────────────────────────────────────────────────── */}
        {activeTab === 'systems' && (
          <AdminSystemMonitoringPanel />
        )}

        {/* ── Platform Health tab ──────────────────────────────────────────── */}
        {activeTab === 'health' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <AdminPlatformHealthCard />
              <AdminOpenRouterHealthCard />
              <AdminAPIMonitoringCard />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <AdminSystemDiagnosticsPanel />
              <AdminSystemHealthOverviewCard />
              <AdminAIRuntimeMonitoringCard />
            </div>
            <div className="grid grid-cols-1">
              <AdminPlatformErrorLogsPanel />
            </div>
          </div>
        )}

        {/* ── Logs tab ─────────────────────────────────────────────────────── */}
        {activeTab === 'logs' && (
          <AdminLogsPanel />
        )}

        {/* ── Activity / Audit tab ─────────────────────────────────────────── */}
        {activeTab === 'activity' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1">
              <AdminGlobalActivityFeedPanel />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <AdminBlueprintDeploymentMonitoringCard />
              <AdminAIInfrastructureMonitoringCard />
              <AdminComputeUsageMetricsCard />
            </div>
          </div>
        )}

      </div>
    </AdminDataProvider>
    </AdminErrorBoundary>
  );
};

export default AdminDashboardLayout;
