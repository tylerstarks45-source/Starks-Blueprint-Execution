import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext.jsx';
import pb from '@/lib/pocketbaseClient.js';
import Header from '@/components/Header.jsx';
import Footer from '@/components/Footer.jsx';
import { toast } from 'sonner';
import { Search, Link2, Unlink, Key, RefreshCw, AlertTriangle, CheckCircle2, ShieldCheck, Box } from 'lucide-react';
import CredentialManager from '@/components/CredentialManager.jsx';
import UsageAndCreditsPanel from '@/components/UsageAndCreditsPanel.jsx';
import AIActivityLog from '@/components/AIActivityLog.jsx';

const MyStackPage = () => {
  const { currentUser } = useAuth();
  const [integrations, setIntegrations] = useState([]);
  const [userIntegrations, setUserIntegrations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('vault');

  useEffect(() => {
    if (currentUser?.id) {
      fetchData();
    }
  }, [currentUser]);

  const fetchData = async () => {
    try {
      const [allIntegrations, userInts] = await Promise.all([
        pb.collection('integrations').getFullList({ $autoCancel: false }),
        pb.collection('user_integrations').getFullList({ 
          filter: `userId="${currentUser.id}"`, 
          $autoCancel: false 
        })
      ]);
      setIntegrations(allIntegrations);
      setUserIntegrations(userInts);
    } catch (error) {
      console.error("Error fetching integrations:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col selection:bg-primary/20 bg-grid-pattern">
      <Helmet><title>Infrastructure | Starks Global Group</title></Helmet>
      <Header />
      
      <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-12 max-w-7xl">
        <div className="mb-10 border-b border-border/50 pb-8">
          <h1 className="text-3xl md:text-4xl font-extrabold text-foreground mb-3 font-mono tracking-tight">Infrastructure & Stack</h1>
          <p className="text-lg text-muted-foreground max-w-2xl">
            Manage your connected apps, API keys, compute credits, and AI orchestration settings.
          </p>
        </div>

        {/* Tabs */}
        <div className="flex space-x-6 mb-8 border-b border-border/50 overflow-x-auto hide-scrollbar">
          <button 
            onClick={() => setActiveTab('vault')}
            className={`pb-3 text-sm font-bold tracking-wide uppercase transition-colors relative whitespace-nowrap ${activeTab === 'vault' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
          >
            Credential Vault
            {activeTab === 'vault' && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-primary rounded-t-full shadow-[0_0_10px_hsl(var(--primary))]"></span>}
          </button>
          <button 
            onClick={() => setActiveTab('usage')}
            className={`pb-3 text-sm font-bold tracking-wide uppercase transition-colors relative whitespace-nowrap ${activeTab === 'usage' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
          >
            Usage & Credits
            {activeTab === 'usage' && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-primary rounded-t-full shadow-[0_0_10px_hsl(var(--primary))]"></span>}
          </button>
          <button 
            onClick={() => setActiveTab('ai')}
            className={`pb-3 text-sm font-bold tracking-wide uppercase transition-colors relative whitespace-nowrap ${activeTab === 'ai' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
          >
            AI Orchestration
            {activeTab === 'ai' && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-primary rounded-t-full shadow-[0_0_10px_hsl(var(--primary))]"></span>}
          </button>
        </div>

        <div className="space-y-8">
          {activeTab === 'vault' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              <div className="lg:col-span-8">
                <div className="cinematic-card p-6">
                  <CredentialManager />
                </div>
              </div>
              <div className="lg:col-span-4 space-y-6">
                <div className="cinematic-card p-6 border-primary/20 bg-primary/5">
                  <h3 className="text-sm font-bold text-primary uppercase tracking-wider mb-2">OpenRouter Gateway</h3>
                  <p className="text-2xl font-bold text-foreground">Active</p>
                  <div className="mt-4 flex items-center text-xs text-primary font-medium">
                    <RefreshCw className="w-4 h-4 mr-1" /> Ready for model routing
                  </div>
                </div>
                <div className="cinematic-card p-6">
                  <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-2">Security Status</h3>
                  <div className="mt-4 flex items-center text-sm text-emerald-400 font-medium">
                    <ShieldCheck className="w-5 h-5 mr-2" /> All keys encrypted at rest
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">Credentials are never exposed to the client after initial save.</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'usage' && (
            <UsageAndCreditsPanel />
          )}

          {activeTab === 'ai' && (
            <div className="max-w-3xl">
              <AIActivityLog />
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default MyStackPage;