import React from 'react';
import { Helmet } from 'react-helmet';
import { ShieldAlert, Users, Activity, Settings } from 'lucide-react';
import Header from '@/components/Header.jsx';
import Footer from '@/components/Footer.jsx';

const AdminDashboard = () => {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Helmet>
        <title>Admin Dashboard | Starks Global Group</title>
      </Helmet>
      
      <Header />
      
      <main className="flex-grow container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
            <ShieldAlert className="w-4 h-4" />
            SUPER_ADMIN Access
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight">
            Admin Dashboard
          </h1>
          <p className="text-muted-foreground mt-2 text-lg">
            Welcome to the central command. Manage users, monitor systems, and configure platform settings.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-4 text-primary">
              <Users className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-semibold mb-2">User Management</h3>
            <p className="text-muted-foreground text-sm">
              View, edit, and manage user accounts and permissions across the platform.
            </p>
          </div>

          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-4 text-primary">
              <Activity className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-semibold mb-2">System Health</h3>
            <p className="text-muted-foreground text-sm">
              Monitor API usage, deployment statuses, and overall platform performance.
            </p>
          </div>

          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-4 text-primary">
              <Settings className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Global Settings</h3>
            <p className="text-muted-foreground text-sm">
              Configure global variables, AI model routing, and integration credentials.
            </p>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default AdminDashboard;