import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useParams, useNavigate } from 'react-router-dom';
import pb from '@/lib/pocketbaseClient.js';
import { systemsData } from '@/data/SystemsData.js';
import { AlertTriangle, Rocket } from 'lucide-react';
import { toolAffiliateLinks } from '@/config/toolAffiliateLinks.js';

import Header from '@/components/Header.jsx';
import Footer from '@/components/Footer.jsx';
import SystemDetailTemplate from '@/components/SystemDetailTemplate.jsx';
import SystemCard from '@/components/SystemCard.jsx';

const SystemDetailPage = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  
  const [blueprint, setBlueprint] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchBlueprint = async () => {
      setIsLoading(true);
      setError(false);
      try {
        // Try Pocketbase First
        const record = await pb.collection('blueprints').getFirstListItem(`slug="${slug}"`, {
          $autoCancel: false
        });
        setBlueprint(record);
      } catch (err) {
        console.warn("Blueprint not found in DB by slug, checking fallback data...");
        // Fallback to SystemsData.js
        const fallbackSystem = systemsData.find(s => s.slug === slug);
        if (fallbackSystem) {
          setBlueprint(fallbackSystem);
        } else {
          setError(true);
        }
      } finally {
        setIsLoading(false);
      }
    };

    if (slug) {
      fetchBlueprint();
    } else {
      setError(true);
      setIsLoading(false);
    }
  }, [slug]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-grow pt-32 pb-24 flex items-center justify-center">
          <div className="flex flex-col items-center animate-pulse">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-muted-foreground font-medium">Loading System Architecture...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (error || !blueprint) {
    const availableSystems = systemsData.slice(0, 3); 

    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Helmet>
          <title>System Not Available | Starks Global Group</title>
        </Helmet>
        <Header />
        <main className="flex-grow pt-24 pb-24 px-4">
          <div className="container mx-auto max-w-6xl">
            <div className="text-center w-full max-w-2xl mx-auto p-10 bg-card rounded-3xl border border-border shadow-xl mb-16">
              <AlertTriangle className="w-16 h-16 text-amber-500 mx-auto mb-6 opacity-80" />
              <h2 className="text-3xl md:text-4xl font-extrabold text-foreground mb-4 tracking-tight">System Not Available Yet</h2>
              <p className="text-muted-foreground mb-8 text-lg font-medium">
                This system is currently being prepared. Explore other ready-to-use systems below.
              </p>
              <button 
                onClick={() => navigate('/blueprints')} 
                className="saas-button px-8 py-4"
              >
                View All Blueprints
              </button>
            </div>

            <div className="mb-10 flex items-center justify-between">
              <h3 className="text-2xl font-extrabold text-foreground tracking-tight">Ready-to-Use Systems</h3>
              <div className="h-px flex-grow bg-border ml-6"></div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {availableSystems.map((sys, index) => (
                <SystemCard key={sys.id} system={sys} index={index} />
              ))}
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Ensure blueprint tools map correctly to affiliate links via central config logic
  // SystemDetailTemplate handles DB expansion logic, but if falling back to raw list:
  const getMappedTools = () => {
    const toolsList = blueprint.tools || [];
    return toolsList.map(t => {
      const match = Object.values(toolAffiliateLinks).find(c => c.name.toLowerCase() === t.name?.toLowerCase());
      if (match) {
        return {
          ...t,
          affiliate_link: match.affiliateLink,
          description: match.description || t.description
        };
      }
      return t;
    });
  };

  return (
    <SystemDetailTemplate
      slug={slug}
      title={blueprint.name || blueprint.system_name}
      subtitle={blueprint.description || "A complete automation infrastructure."}
      icon={Rocket}
      description={blueprint.description || "Detailed structural breakdown of the automated operations architecture."}
      revenueModel={blueprint.revenueModel || "Operational System"}
      automationLevel={blueprint.automationLevel || "High"}
      bestFor={blueprint.best_for || "Entrepreneurs"}
      flow={blueprint.setup_steps || ["Initialization", "Data Integration", "Content Generation", "Output Distribution", "Scaling"]}
      architectureDiagram={blueprint.systemArchitectureImage}
      tools={getMappedTools()}
      roadmapSteps={[
        { title: "Configure Foundations", description: "Establish base environments and accounts." },
        { title: "Connect APIs", description: "Link automation tools and software nodes." },
        { title: "Launch Automations", description: "Activate triggers to run on autopilot." }
      ]}
      fallbackTools={[]}
      monetizationExplanation="Constantly track KPIs, refine input prompts, and swap out software that underperforms. True scale happens when human intervention hits zero."
    />
  );
};

export default SystemDetailPage;