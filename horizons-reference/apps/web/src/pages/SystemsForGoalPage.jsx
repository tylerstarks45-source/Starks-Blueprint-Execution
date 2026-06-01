import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { ArrowLeft, Target, Zap, Clock, ArrowUpRight } from 'lucide-react';
import pb from '@/lib/pocketbaseClient';
import Header from '@/components/Header.jsx';
import Footer from '@/components/Footer.jsx';
import { motion } from 'framer-motion';

const SystemsForGoalPage = () => {
  const { goalId } = useParams();
  const decodedGoal = decodeURIComponent(goalId || '');
  
  const [systems, setSystems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchSystems = async () => {
      setIsLoading(true);
      try {
        // Fetch blueprints that have this goal in their goal_tags
        const result = await pb.collection('blueprints').getFullList({
          filter: `goal_tags ~ "${decodedGoal}"`,
          sort: '-created',
          $autoCancel: false
        });
        setSystems(result);
      } catch (error) {
        console.error("Error fetching systems for goal:", error);
        setSystems([]);
      } finally {
        setIsLoading(false);
      }
    };

    if (decodedGoal) {
      fetchSystems();
    }
  }, [decodedGoal]);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Helmet>
        <title>{`${decodedGoal} Systems | Starks Global Group`}</title>
      </Helmet>
      
      <Header />
      
      <main className="flex-grow py-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
          
          <Link to="/marketplace" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-primary transition-colors mb-8">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Marketplace
          </Link>

          <div className="mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-bold uppercase tracking-wider mb-4">
              <Target className="w-4 h-4" /> Goal Selected
            </div>
            <h1 className="text-4xl md:text-5xl font-extrabold text-foreground mb-4 text-glow">
              {decodedGoal}
            </h1>
            <p className="text-xl text-muted-foreground max-w-3xl">
              Based on your goal, we recommend the following proven systems. Each blueprint includes the exact tools, setup steps, and strategy needed to succeed.
            </p>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {[1, 2].map(i => (
                <div key={i} className="h-[400px] rounded-2xl bg-card border border-white/5 animate-pulse" />
              ))}
            </div>
          ) : systems.length === 0 ? (
            <div className="glass-panel p-16 text-center rounded-2xl border-dashed border-2 border-white/10">
              <h3 className="text-2xl font-bold text-foreground mb-3">No systems found</h3>
              <p className="text-muted-foreground mb-6">We are currently building new blueprints for this goal. Check back soon.</p>
              <Link to="/blueprints" className="saas-button">View All Systems</Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {systems.map((system, index) => (
                <motion.div 
                  key={system.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                  className="premium-card rounded-2xl overflow-hidden flex flex-col hover-lift border border-white/5"
                >
                  <div className="p-8 flex flex-col flex-grow">
                    <div className="flex justify-between items-start mb-6">
                      <h3 className="text-2xl font-bold text-foreground">{system.name}</h3>
                      <span className="trust-badge trust-badge-system shrink-0">Blueprint</span>
                    </div>
                    
                    <p className="text-muted-foreground mb-6 leading-relaxed flex-grow">
                      {system.description || 'A complete automated system designed to help you achieve your goals efficiently.'}
                    </p>

                    <div className="space-y-3 mb-8 bg-secondary/30 p-4 rounded-xl border border-white/5">
                      {system.expected_outcome && (
                        <div className="flex items-start gap-3">
                          <Zap className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                          <div>
                            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-0.5">Expected Outcome</span>
                            <span className="text-sm font-medium text-foreground">{system.expected_outcome}</span>
                          </div>
                        </div>
                      )}
                      {system.setup_time && (
                        <div className="flex items-start gap-3">
                          <Clock className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                          <div>
                            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block mb-0.5">Setup Time</span>
                            <span className="text-sm font-medium text-foreground">{system.setup_time}</span>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 mt-auto">
                      <Link to={`/system/${system.id}`} className="saas-button flex-1">
                        View System <ArrowUpRight className="w-4 h-4 ml-2" />
                      </Link>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}

        </div>
      </main>

      <Footer />
    </div>
  );
};

export default SystemsForGoalPage;