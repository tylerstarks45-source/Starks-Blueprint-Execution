import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Rocket, Zap, DollarSign, CheckCircle2, AlertTriangle } from 'lucide-react';
import pb from '@/lib/pocketbaseClient.js';
import { useAuth } from '@/contexts/AuthContext.jsx';
import Header from '@/components/Header.jsx';
import Footer from '@/components/Footer.jsx';
import SystemInstructionsEngine from '@/components/SystemInstructionsEngine.jsx';
import SystemCTASection from '@/components/SystemCTASection.jsx';
import SaveSystemModal from '@/components/SaveSystemModal.jsx';
import { toolAffiliateLinks } from '@/config/toolAffiliateLinks.js';

const SystemDetailTemplate = ({ 
  slug,
  title, 
  subtitle, 
  icon: Icon = Rocket, 
  description, 
  revenueModel,
  automationLevel,
  bestFor,
  tools = [],
  instructions = [],
  workflow = [],
  monetization,
  checklist = []
}) => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  
  const [systemId, setSystemId] = useState(null);
  const [dbTools, setDbTools] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);

  useEffect(() => {
    const fetchSystemData = async () => {
      try {
        const record = await pb.collection('blueprints').getFirstListItem(`slug="${slug}"`, {
          expand: 'required_tools,tools_required',
          $autoCancel: false
        });
        setSystemId(record.id);
        
        const fetchedTools = record.expand?.required_tools || record.expand?.tools_required || [];
        setDbTools(fetchedTools);
      } catch (error) {
        console.warn("Could not load DB record for slug:", slug, error);
      } finally {
        setIsLoading(false);
      }
    };
    
    if (slug) {
      fetchSystemData();
    } else {
      setIsLoading(false);
    }
  }, [slug]);

  // Merge DB tools with hardcoded props & align with centralized toolAffiliateLinks config
  const getAlignedTool = (rawTool) => {
    const configMatch = Object.values(toolAffiliateLinks).find(
      c => c.name.toLowerCase() === rawTool.name.toLowerCase() || 
           rawTool.name.toLowerCase().includes(c.name.toLowerCase())
    );
    
    return {
      name: configMatch ? configMatch.name : rawTool.name,
      purpose: configMatch ? configMatch.category : (rawTool.category || rawTool.purpose),
      explanation: configMatch ? configMatch.description : (rawTool.description || rawTool.explanation || 'Core system component.'),
      affiliate_link: configMatch ? configMatch.affiliateLink : rawTool.affiliate_link,
      image: null
    };
  };

  const displayTools = tools.length > 0 
    ? tools.map(getAlignedTool)
    : dbTools.map(getAlignedTool);

  const handlePrimaryClick = () => {
    const el = document.getElementById('build-instructions');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    } else {
      window.scrollTo({ top: document.body.scrollHeight / 2, behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background selection:bg-primary/20 bg-grid-pattern">
      <Helmet>
        <title>{title} | System Blueprint</title>
        <meta name="description" content={subtitle} />
      </Helmet>

      <Header />

      <main className="flex-grow pt-24">
        
        {/* OVERVIEW HERO SECTION */}
        <section className="relative pt-12 pb-16 border-b border-border mb-16 bg-gradient-dark">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-6xl text-center">
            <Link to="/blueprints" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground mb-8 transition-colors">
              <ArrowLeft className="w-4 h-4 mr-2" /> Back to Blueprints
            </Link>
            
            <div className={`inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-primary/10 border border-primary/30 text-primary mb-8 shadow-neon-blue`}>
              <Icon className="w-10 h-10" />
            </div>
            
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-foreground mb-6 tracking-tight">
              {title}
            </h1>
            
            <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto mb-8 leading-relaxed font-medium">
              {description}
            </p>
            
            <div className="flex flex-wrap justify-center gap-3">
              <span className="px-4 py-2 rounded-full bg-card border border-border text-sm font-bold flex items-center shadow-sm">
                <DollarSign className="w-4 h-4 mr-2 text-primary"/> Revenue Model: <span className="text-foreground ml-1">{revenueModel}</span>
              </span>
              <span className="px-4 py-2 rounded-full bg-card border border-border text-sm font-bold flex items-center shadow-sm">
                <Zap className="w-4 h-4 mr-2 text-primary"/> Automation Level: <span className="text-foreground ml-1">{automationLevel}</span>
              </span>
              <span className="px-4 py-2 rounded-full bg-card border border-border text-sm font-bold flex items-center shadow-sm">
                <CheckCircle2 className="w-4 h-4 mr-2 text-primary"/> Best For: <span className="text-foreground ml-1">{bestFor}</span>
              </span>
            </div>
          </div>
        </section>

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-5xl">
          {/* COMPLIANCE DISCLAIMER */}
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-6 flex gap-4 items-start shadow-sm mb-16">
            <AlertTriangle className="w-6 h-6 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-amber-500 mb-2 uppercase tracking-wide text-sm">Important Setup Notice</h4>
              <p className="text-sm text-amber-500/90 leading-relaxed font-medium">
                Follow these instructions exactly as outlined. The tools listed are specifically chosen for their integration capabilities. Substituting tools may break the automation flow.
              </p>
            </div>
          </div>

          {/* INSTRUCTIONS ENGINE */}
          <SystemInstructionsEngine 
            tools={displayTools}
            instructions={instructions}
            workflow={workflow}
            monetization={monetization}
            checklist={checklist}
            systemId={systemId || slug}
          />
        </div>
        
        {/* BOTTOM CTA SECTION */}
        <SystemCTASection 
          onPrimaryClick={handlePrimaryClick}
          onSaveClick={() => setIsSaveModalOpen(true)}
        />

      </main>

      <Footer />

      <SaveSystemModal 
        isOpen={isSaveModalOpen}
        onOpenChange={setIsSaveModalOpen}
        blueprintId={systemId}
        defaultSystemName={title}
      />
    </div>
  );
};

export default SystemDetailTemplate;