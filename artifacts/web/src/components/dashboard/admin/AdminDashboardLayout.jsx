
import React from 'react';
import { AdminDataProvider } from '@/contexts/AdminDataContext.jsx';
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

import CreditBalanceCard from '@/components/admin/CreditBalanceCard.jsx';
import UsageOverviewCard from '@/components/admin/UsageOverviewCard.jsx';
import MonthlyConsumptionCard from '@/components/admin/MonthlyConsumptionCard.jsx';

const AdminDashboardLayout = () => {
  return (
    <AdminDataProvider>
    <div className="space-y-6 animate-in fade-in duration-500 relative z-10">
      <AdminPlatformMetricsCard />
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="col-span-1 lg:col-span-2">
          <AdminGlobalTokenUsageCard />
        </div>
        <AdminPlatformRequestVolumeCard />
        <AdminPlatformHealthCard />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <AdminAIUsageAnalyticsCard />
        <AdminOpenRouterHealthCard />
        <AdminComputeUsageMetricsCard />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="col-span-1 lg:col-span-3">
          <AdminUserManagementPanel />
        </div>
        <div className="space-y-6">
          <AdminUserGrowthAnalyticsCard />
          <AdminSubscriptionAnalyticsCard />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <AdminPlatformErrorLogsPanel />
        </div>
        <div className="space-y-6">
          <AdminSystemDiagnosticsPanel />
          <AdminSystemHealthOverviewCard />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <AdminAIInfrastructureMonitoringCard />
        <AdminAIRuntimeMonitoringCard />
        <AdminAPIMonitoringCard />
        <AdminBlueprintDeploymentMonitoringCard />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <CreditBalanceCard />
        <UsageOverviewCard />
        <MonthlyConsumptionCard />
      </div>

      <div className="grid grid-cols-1">
        <AdminGlobalActivityFeedPanel />
      </div>
    </div>
    </AdminDataProvider>
  );
};

export default AdminDashboardLayout;
