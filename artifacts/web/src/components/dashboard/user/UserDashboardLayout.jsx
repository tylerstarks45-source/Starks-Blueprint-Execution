import React from 'react';
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

const UserDashboardLayout = () => {
  return (
    <div className="space-y-6 animate-in fade-in duration-500 relative z-10">

      {/* Row 1 — AI Chat Command Center + Credits */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <UserAIChatCard />
        </div>
        <div>
          <UserCreditsCard />
        </div>
      </div>

      {/* Row 2 — My Systems full width */}
      <UserMySystemsPanel />

      {/* Row 3 — Blueprint Health + AI Build Agent */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <UserBlueprintHealthCard />
        <UserAIBuildAgentCard />
      </div>

      {/* Row 4 — Account Overview + Build Activity + Tools */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <UserEarningsTrackingCard />
        <UserAutomationStatusCard />
        <UserMarketplaceToolsCard />
      </div>

      {/* Row 5 — Subscription + Quick Actions + Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <UserSubscriptionCard />
        <UserQuickActionsPanel />
        <div className="space-y-3 flex flex-col">
          <UserBuildNewBlueprintButton />
          <div className="grid grid-cols-2 gap-3">
            <UserUpgradePlanButton />
            <UserRequestSupportButton />
          </div>
        </div>
      </div>

    </div>
  );
};

export default UserDashboardLayout;
