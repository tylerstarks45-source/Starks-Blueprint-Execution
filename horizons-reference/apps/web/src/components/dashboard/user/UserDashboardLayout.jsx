
import React from 'react';
import UserActiveSystemsCard from './UserActiveSystemsCard.jsx';
import UserAIBuildAgentCard from './UserAIBuildAgentCard.jsx';
import UserCreditsCard from './UserCreditsCard.jsx';
import UserSubscriptionCard from './UserSubscriptionCard.jsx';
import UserMarketplaceToolsCard from './UserMarketplaceToolsCard.jsx';
import UserMySystemsPanel from './UserMySystemsPanel.jsx';
import UserEarningsTrackingCard from './UserEarningsTrackingCard.jsx';
import UserAIAssistantCard from './UserAIAssistantCard.jsx';
import UserAutomationStatusCard from './UserAutomationStatusCard.jsx';
import UserBuildNewBlueprintButton from './UserBuildNewBlueprintButton.jsx';
import UserUpgradePlanButton from './UserUpgradePlanButton.jsx';
import UserRequestSupportButton from './UserRequestSupportButton.jsx';
import UserQuickActionsPanel from './UserQuickActionsPanel.jsx';

const UserDashboardLayout = () => {
  return (
    <div className="space-y-6 animate-in fade-in duration-500 relative z-10">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <UserAIBuildAgentCard />
        </div>
        <div>
          <UserCreditsCard />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 space-y-6">
          <UserMySystemsPanel />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <UserActiveSystemsCard />
            <UserEarningsTrackingCard />
          </div>
        </div>
        <div className="space-y-6">
          <UserBuildNewBlueprintButton />
          <UserSubscriptionCard />
          <UserAIAssistantCard />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <UserAutomationStatusCard />
        <UserMarketplaceToolsCard />
        <div className="space-y-6 flex flex-col justify-between">
          <UserQuickActionsPanel />
          <div className="grid grid-cols-2 gap-4">
            <UserUpgradePlanButton />
            <UserRequestSupportButton />
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserDashboardLayout;
