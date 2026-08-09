import React from 'react';
import { Helmet } from 'react-helmet';
import DashboardRouter from '@/components/dashboard/DashboardRouter.jsx';
import { DashboardProvider } from '@/contexts/DashboardContext.jsx';
import OnboardingWizard from '@/components/OnboardingWizard.jsx';
import AuthLayout from '@/components/AuthLayout.jsx';

const DashboardPage = () => {
  return (
    <DashboardProvider>
      <AuthLayout>
        <Helmet><title>Command Center | Starks Global Group</title></Helmet>
        <OnboardingWizard />
        {/* DashboardRouter decides admin vs user — each layout owns its own container/padding */}
        <DashboardRouter />
      </AuthLayout>
    </DashboardProvider>
  );
};

export default DashboardPage;
