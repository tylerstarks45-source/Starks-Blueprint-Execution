import React from 'react';
import { Helmet } from 'react-helmet';
import Header from '@/components/Header.jsx';
import Footer from '@/components/Footer.jsx';
import DashboardRouter from '@/components/dashboard/DashboardRouter.jsx';
import { DashboardProvider } from '@/contexts/DashboardContext.jsx';
import VideoBackground from '@/components/VideoBackground.jsx';

const ADMIN_ROLES = ['admin', 'ADMIN', 'SUPER_ADMIN', 'FOUNDER_ADMIN'];

const DashboardPage = () => {
  const role = localStorage.getItem('userRole') || 'USER';
  const isAdmin = ADMIN_ROLES.includes(role);

  if (isAdmin) {
    return (
      <DashboardProvider>
        <VideoBackground>
          <Helmet><title>Command Center | Starks Global Group</title></Helmet>
          <Header />
          <main className="flex-grow pt-8 pb-24 px-4 sm:px-6 lg:px-8 container mx-auto max-w-[1400px]">
            <section className="pt-2">
              <DashboardRouter />
            </section>
          </main>
          <Footer />
        </VideoBackground>
      </DashboardProvider>
    );
  }

  return (
    <DashboardProvider>
      <Helmet><title>Command Center | Starks Global Group</title></Helmet>
      <DashboardRouter />
    </DashboardProvider>
  );
};

export default DashboardPage;
