import React from 'react';
import UserDashboardHeader from './UserDashboardHeader.jsx';
import UserAIBuildAgentCard from './UserAIBuildAgentCard.jsx';
import UserCreditsCard from './UserCreditsCard.jsx';
import UserSubscriptionCard from './UserSubscriptionCard.jsx';
import UserMarketplaceToolsCard from './UserMarketplaceToolsCard.jsx';
import UserMySystemsPanel from './UserMySystemsPanel.jsx';
import UserEarningsTrackingCard from './UserEarningsTrackingCard.jsx';
import UserAIChatCard from './UserAIChatCard.jsx';
import UserAutomationStatusCard from './UserAutomationStatusCard.jsx';
import UserBuildNewBlueprintButton from './UserBuildNewBlueprintButton.jsx';
import UserUpgradePlanButton from './UserUpgradePlanButton.jsx';
import UserRequestSupportButton from './UserRequestSupportButton.jsx';
import UserQuickActionsPanel from './UserQuickActionsPanel.jsx';
import UserBlueprintHealthCard from './UserBlueprintHealthCard.jsx';
import UserBlueprintLauncherCard from './UserBlueprintLauncherCard.jsx';

const UserDashboardLayout = () => {
  return (
    <div className="space-y-5 animate-in fade-in duration-500 relative z-10">

      {/* Row 0 — Command Center Header */}
      <UserDashboardHeader />

      {/* Row 1 — AI Chat (primary interface) + Credits */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2">
          <UserAIChatCard />
        </div>
        <div>
          <UserCreditsCard />
        </div>
      </div>

      {/* Row 2 — Blueprint Launcher + AI Build Agent */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2" style={{ minHeight: '380px' }}>
          <UserBlueprintLauncherCard />
        </div>
        <div>
          <UserAIBuildAgentCard />
        </div>
      </div>

      {/* Row 3 — My Active Systems (full width — most important tracking) */}
      <UserMySystemsPanel />

      {/* Row 4 — Blueprint Health + Build Activity */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <UserBlueprintHealthCard />
        <UserAutomationStatusCard />
      </div>

      {/* Row 5 — Analytics + Marketplace + Subscription */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <UserEarningsTrackingCard />
        <UserMarketplaceToolsCard />
        <UserSubscriptionCard />
      </div>

      {/* Row 6 — Quick Actions + Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <UserQuickActionsPanel />
        <div className="space-y-3">
          <UserBuildNewBlueprintButton />
          <UserUpgradePlanButton />
        </div>
        <div className="space-y-3">
          <UserRequestSupportButton />
        </div>
      </div>

    </div>
  );
};

export default UserDashboardLayout;
