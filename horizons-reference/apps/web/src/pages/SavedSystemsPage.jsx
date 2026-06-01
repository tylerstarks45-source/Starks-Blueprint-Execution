
import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext.jsx';
import pb from '@/lib/pocketbaseClient.js';
import Header from '@/components/Header.jsx';
import Footer from '@/components/Footer.jsx';
import { Search, Activity, Settings, BarChart2, Box } from 'lucide-react';
import { toast } from 'sonner';

import SystemStatusBadge from '@/components/SystemStatusBadge.jsx';
import SystemStateTimeline from '@/components/SystemStateTimeline.jsx';
import DeploymentQueue from '@/components/DeploymentQueue.jsx';
import ExecutionMonitor from '@/components/ExecutionMonitor.jsx';
import CredentialManager from '@/components/CredentialManager.jsx';
import VideoBackground from '@/components/VideoBackground.jsx';

const SavedSystemsPage = () => {
  const { currentUser } = useAuth();
  const [systems, setSystems] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedSystem, setSelectedSystem] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (currentUser?.id) {
      fetchSystems();
    }
  }, [currentUser]);

  const fetchSystems = async () => {
    try {
      const records = await pb.collection('saved_systems').getFullList({
        filter: `userId="${currentUser.id}"`,
        $autoCancel: false
      });
      
      const populated = await Promise.all(records.map(async (sys) => {
        try {
          const bp = await pb.collection('blueprints').getOne(sys.blueprintId, { $autoCancel: false });
          return { ...sys, blueprint: bp };
        } catch {
          return { ...sys, blueprint: null };
        }
      }));
      
      setSystems(populated);
      if (populated.length > 0) setSelectedSystem(populated[0]);
    } catch (err) {
      console.error("Error fetching saved systems:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <VideoBackground>
      <Helmet><title>Operations Center | Starks Global Group</title></Helmet>
      <Header />
      
      <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-10 max-w-[1400px] bg-background/30 backdrop-blur-sm min-h-screen">
        <div className="mb-8 border-b border-white/20 pb-6 flex flex-col md:flex-row justify-between items-start md:items-end gap-4 bg-card/80 backdrop-blur-xl p-6 rounded-2xl shadow-xl">
          <div>
            <h1 className="text-3xl font-extrabold text-foreground font-mono tracking-tight mb-2 text-shadow-md">Systems Operations</h1>
            <p className="text-zinc-200 font-bold text-shadow-sm">Monitor, scale, and manage your deployed architectures.</p>
          </div>
          <Link to="/blueprints" className="saas-button py-2.5 px-6 text-sm shadow-cinematic border border-primary/50">
            Deploy New System
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          <div className="lg:col-span-4 space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <input 
                type="text" 
                placeholder="Search deployments..." 
                className="w-full pl-10 pr-4 py-2.5 bg-card/90 backdrop-blur-xl border border-white/20 rounded-xl text-sm font-bold text-foreground focus:border-primary transition-colors outline-none shadow-lg"
              />
            </div>

            <div className="space-y-3">
              {isLoading ? (
                <div className="p-8 text-center bg-card/80 backdrop-blur-xl rounded-2xl border border-white/10 shadow-lg"><Activity className="w-6 h-6 animate-spin mx-auto text-primary" /></div>
              ) : systems.length === 0 ? (
                <div className="p-8 border border-white/20 bg-card/80 backdrop-blur-xl rounded-xl text-center text-zinc-300 text-sm font-bold shadow-lg">
                  No deployed systems found.
                </div>
              ) : (
                systems.map(sys => {
                  const displayStatus = sys.status === 'Active' ? 'Running' : sys.status === 'Paused' ? 'Paused' : 'Draft';
                  return (
                    <button 
                      key={sys.id}
                      onClick={() => setSelectedSystem(sys)}
                      className={`w-full text-left p-4 rounded-xl border backdrop-blur-xl transition-all shadow-lg ${selectedSystem?.id === sys.id ? 'bg-primary/20 border-primary/50 shadow-[0_0_20px_hsl(var(--primary)/0.3)]' : 'bg-card/80 border-white/10 hover:border-primary/40'}`}
                    >
                      <div className="flex justify-between items-start mb-3">
                        <h3 className="font-bold text-foreground text-sm line-clamp-1 pr-2 text-shadow-sm">{sys.blueprint?.name || sys.systemName || 'Unnamed System'}</h3>
                        <SystemStatusBadge status={displayStatus} size="sm" />
                      </div>
                      <div className="w-full bg-background/80 rounded-full h-1">
                        <div className="bg-primary h-1 rounded-full shadow-[0_0_10px_hsl(var(--primary))]" style={{ width: `${sys.progress || 0}%` }}></div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          <div className="lg:col-span-8">
            {selectedSystem ? (
              <div className="bg-card/90 backdrop-blur-2xl border border-white/10 rounded-2xl flex flex-col h-full min-h-[700px] shadow-2xl">
                
                <div className="p-6 border-b border-white/10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-background/50 rounded-t-2xl">
                  <div>
                    <h2 className="text-2xl font-extrabold text-foreground mb-2 font-mono text-shadow-md">{selectedSystem.blueprint?.name || selectedSystem.systemName || 'Unnamed System'}</h2>
                    <div className="flex items-center gap-3">
                      <SystemStatusBadge status={selectedSystem.status === 'Active' ? 'Running' : 'Draft'} />
                      <span className="text-xs text-zinc-300 font-mono font-bold">ID: {selectedSystem.id.substring(0,8)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex border-b border-white/10 px-6 overflow-x-auto hide-scrollbar bg-background/30">
                  {['overview', 'pipeline', 'credentials', 'history'].map(tab => (
                    <button 
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`py-4 px-4 text-sm font-bold uppercase tracking-wider relative transition-colors whitespace-nowrap text-shadow-sm ${activeTab === tab ? 'text-primary' : 'text-zinc-400 hover:text-white'}`}
                    >
                      {tab}
                      {activeTab === tab && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-primary shadow-[0_0_15px_hsl(var(--primary))]"></span>}
                    </button>
                  ))}
                </div>

                <div className="p-6 flex-grow overflow-y-auto">
                  {activeTab === 'overview' && (
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-background/60 border border-white/10 rounded-xl p-5 shadow-inner">
                          <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2 text-shadow-sm">System Health</h4>
                          <p className="text-3xl font-extrabold text-foreground text-shadow-md">98%</p>
                          <p className="text-xs text-emerald-400 font-bold mt-1">Optimal performance</p>
                        </div>
                        <div className="bg-background/60 border border-white/10 rounded-xl p-5 shadow-inner">
                          <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-2 text-shadow-sm">Executions (24h)</h4>
                          <p className="text-3xl font-extrabold text-foreground text-shadow-md">1,248</p>
                          <p className="text-xs text-zinc-400 font-bold mt-1">~52 per hour</p>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <DeploymentQueue systemId={selectedSystem.id} />
                        <ExecutionMonitor systemId={selectedSystem.id} />
                      </div>
                    </div>
                  )}

                  {activeTab === 'pipeline' && (
                    <div className="h-full flex flex-col items-center justify-center text-center py-12">
                      <BarChart2 className="w-16 h-16 text-zinc-500 mb-4 drop-shadow-md" />
                      <h3 className="text-xl font-bold mb-2 text-shadow-sm">Pipeline Analytics</h3>
                      <p className="text-zinc-300 font-medium max-w-md text-shadow-sm">Detailed metrics on execution time, cost-per-run, and ROI calculations are generating based on your recent workflow data.</p>
                    </div>
                  )}

                  {activeTab === 'credentials' && (
                    <div className="max-w-2xl">
                      <h3 className="text-lg font-bold mb-4 font-mono text-shadow-sm">System Credentials</h3>
                      <p className="text-sm text-zinc-300 font-medium mb-6 text-shadow-sm">Manage the API keys and OAuth tokens required for this specific architecture to function.</p>
                      <CredentialManager />
                    </div>
                  )}

                  {activeTab === 'history' && (
                    <div className="max-w-2xl">
                      <h3 className="text-lg font-bold mb-6 font-mono text-shadow-sm">State Transition History</h3>
                      <SystemStateTimeline systemId={selectedSystem.id} />
                    </div>
                  )}
                </div>

              </div>
            ) : (
              <div className="bg-card/90 backdrop-blur-2xl border border-white/10 rounded-2xl h-full min-h-[700px] flex items-center justify-center text-center p-12 shadow-2xl">
                <div>
                  <Settings className="w-16 h-16 text-zinc-500 mx-auto mb-6 drop-shadow-md" />
                  <h2 className="text-2xl font-bold mb-2 text-shadow-sm">Select a System</h2>
                  <p className="text-zinc-300 font-medium text-shadow-sm">Choose an active deployment from the sidebar to view metrics, logs, and configuration.</p>
                </div>
              </div>
            )}
          </div>

        </div>
      </main>
      <Footer />
    </VideoBackground>
  );
};

export default SavedSystemsPage;
