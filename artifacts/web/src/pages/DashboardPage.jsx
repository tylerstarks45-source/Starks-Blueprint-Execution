
import React from 'react';
import { Helmet } from 'react-helmet';
import Header from '@/components/Header.jsx';
import Footer from '@/components/Footer.jsx';
import DashboardRouter from '@/components/dashboard/DashboardRouter.jsx';
import { DashboardProvider } from '@/contexts/DashboardContext.jsx';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { Crown, ShieldCheck } from 'lucide-react';
import SystemCommandCenterPage from '@/pages/SystemCommandCenterPage.jsx';
import VideoBackground from '@/components/VideoBackground.jsx';

const DashboardHeaderInner = () => {
  const { currentUser } = useAuth();
  
  const isSuperAdmin = currentUser?.role === 'admin' || currentUser?.role === 'SUPER_ADMIN';
  const displayName = currentUser?.name || currentUser?.email?.split('@')[0] || 'Commander';

  return (
    <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 pb-6 border-b border-white/20 bg-background/40 backdrop-blur-md p-6 rounded-2xl mb-8 shadow-lg">
      <div>
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight text-shadow-md">
            Welcome back, <span className="capitalize">{displayName}</span>
          </h1>
          {isSuperAdmin ? (
            <span className="px-2.5 py-1 bg-primary/20 text-primary border border-primary/30 rounded-md text-xs font-bold tracking-wider uppercase flex items-center backdrop-blur-sm">
              <ShieldCheck className="w-3 h-3 mr-1.5" /> Super Admin
            </span>
          ) : (
            <span className="px-2.5 py-1 bg-amber-400/20 text-amber-400 border border-amber-400/30 rounded-md text-xs font-bold tracking-wider uppercase flex items-center backdrop-blur-sm">
              <Crown className="w-3 h-3 mr-1.5" /> {currentUser?.membershipTier ? currentUser.membershipTier.charAt(0).toUpperCase() + currentUser.membershipTier.slice(1) + ' Tier' : 'Starter Tier'}
            </span>
          )}
        </div>
        <p className="text-zinc-200 text-base font-medium text-shadow-sm">
          {isSuperAdmin 
            ? 'Platform infrastructure and analytics overview.' 
            : 'Your AI infrastructure and automation systems are online.'}
        </p>
      </div>
    </div>
  );
};

const DashboardPage = ({ commandCenter = false }) => {
  return (
    <DashboardProvider>
      <VideoBackground>
        <Helmet><title>{commandCenter ? 'System Command Center' : 'Command Center'} | Starks Global Group</title></Helmet>
        <Header />
        
        <main className="flex-grow pt-8 pb-24 px-4 sm:px-6 lg:px-8 container mx-auto max-w-[1400px]">
          <DashboardHeaderInner />
          
          <section className="pt-2">
            {commandCenter ? <SystemCommandCenterPage /> : <DashboardRouter />}
          </section>
        </main>
        
        <Footer />
      </VideoBackground>
    </DashboardProvider>
  );
};

export default DashboardPage;
