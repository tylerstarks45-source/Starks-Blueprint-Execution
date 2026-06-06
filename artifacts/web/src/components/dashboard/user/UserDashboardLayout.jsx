import React from 'react';
import UserDashboardHeader from './UserDashboardHeader.jsx';
import SystemCommandCenterPage from '@/pages/SystemCommandCenterPage.jsx';
import UserActivityFeedPanel from './UserActivityFeedPanel.jsx';

const UserDashboardLayout = () => {
  return (
    <div className="space-y-5 animate-in fade-in duration-500 relative z-10">
      <UserDashboardHeader />
      <UserActivityFeedPanel />
      <SystemCommandCenterPage />
    </div>
  );
};

export default UserDashboardLayout;
