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
        <div className="pt-6 pb-24 px-4 sm:px-6 lg:px-8 container mx-auto max-w-[1400px]">
          <DashboardRouter />
        </div>
      </AuthLayout>
    </DashboardProvider>
  );
};

export default DashboardPage;
