import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import PageMeta from '@/components/PageMeta.jsx';
import pb from '@/lib/pocketbaseClient.js';
import Header from '@/components/Header.jsx';
import Footer from '@/components/Footer.jsx';
import { ArrowLeft, ExternalLink, ShieldCheck, CheckCircle2, BookmarkPlus } from 'lucide-react';
import { useToolSave } from '@/hooks/useToolSave.js';

const ToolDetailPage = () => {
  const { id } = useParams();
  const [tool, setTool] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const { isToolSaved, toggleToolSave } = useToolSave();

  useEffect(() => {
    const fetchTool = async () => {
      try {
        const record = await pb.collection('tools').getOne(id, { $autoCancel: false });
        setTool(record);
      } catch (err) {
        console.error("Error fetching tool:", err);
      } finally {
        setIsLoading(false);
      }
    };
    if (id) fetchTool();
  }, [id]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <main className="flex-grow flex items-center justify-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </main>
      </div>
    );
  }

  if (!tool) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <main className="flex-grow flex flex-col items-center justify-center p-4">
          <h2 className="text-2xl font-bold mb-4">Tool not found</h2>
          <Link to="/marketplace" className="text-primary hover:underline">Back to Marketplace</Link>
        </main>
      </div>
    );
  }

  const description = tool.description
    ? tool.description.slice(0, 155).replace(/\s+\S*$/, '') + (tool.description.length > 155 ? '…' : '')
    : `${tool.name} — an AI tool curated by Starks Global Group for building automated income systems.`;

  return (
    <div className="min-h-screen bg-background flex flex-col bg-grid-pattern">
      <PageMeta
        title={`${tool.name} | Starks Global Marketplace`}
        description={description}
      />
      <Header />
      
      <main className="flex-grow pt-24 pb-20 container mx-auto px-4 max-w-4xl">
        <Link to="/marketplace" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Marketplace
        </Link>
        
        <div className="cinematic-card p-8 md:p-12">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8 border-b border-border/50 pb-8">
            <div>
              <span className="px-3 py-1 bg-secondary/10 text-secondary text-xs font-bold uppercase tracking-wider border border-secondary/20 rounded-md mb-4 inline-block">
                {tool.category}
              </span>
              <h1 className="text-4xl font-extrabold text-foreground tracking-tight font-mono">{tool.name}</h1>
              {tool.verified_use_case && (
                <div className="flex items-center text-sm text-emerald-400 font-bold mt-3 bg-emerald-400/10 w-fit px-3 py-1 rounded border border-emerald-400/20">
                  <ShieldCheck className="w-4 h-4 mr-1.5" /> Verified Integration Partner
                </div>
              )}
            </div>
            
            <div className="flex flex-col w-full md:w-auto gap-3 shrink-0">
              {tool.affiliate_link && (
                <a 
                  href={tool.affiliate_link} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="saas-button py-3 px-6 text-sm"
                >
                  Access Tool <ExternalLink className="w-4 h-4 ml-2" />
                </a>
              )}
              <button 
                onClick={() => toggleToolSave(tool.id)}
                className={`w-full py-3 px-6 rounded-lg text-sm font-bold border transition-colors flex items-center justify-center gap-2 ${isToolSaved(tool.id) ? 'bg-primary/20 text-primary border-primary/50' : 'bg-transparent text-foreground border-border hover:bg-muted'}`}
              >
                <BookmarkPlus className="w-4 h-4" /> {isToolSaved(tool.id) ? 'Saved to Stack' : 'Save to Stack'}
              </button>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="md:col-span-2 space-y-8">
              <section>
                <h3 className="text-xl font-bold mb-4 font-mono">Overview</h3>
                <p className="text-lg text-muted-foreground leading-relaxed mb-6">{tool.description}</p>
                {tool.full_description && (
                  <div className="prose prose-invert max-w-none text-muted-foreground">
                    <p>{tool.full_description}</p>
                  </div>
                )}
              </section>

              <section>
                <h3 className="text-xl font-bold mb-4 font-mono">System Blueprint Compatibility</h3>
                <div className="bg-muted/20 border border-border rounded-xl p-5">
                  <p className="text-sm text-foreground mb-4">This tool is fully compatible and recommended for the following architectures:</p>
                  <ul className="space-y-2">
                    <li className="flex items-center text-sm font-medium text-muted-foreground"><CheckCircle2 className="w-4 h-4 text-emerald-400 mr-2"/> Content Traffic Sales System</li>
                    <li className="flex items-center text-sm font-medium text-muted-foreground"><CheckCircle2 className="w-4 h-4 text-emerald-400 mr-2"/> AI Video Content System</li>
                  </ul>
                  <Link to="/blueprints" className="inline-block mt-4 text-sm text-primary font-bold hover:underline">Explore Compatible Blueprints &rarr;</Link>
                </div>
              </section>
            </div>
            
            <div className="space-y-6">
              <div className="p-6 bg-card border border-border/50 rounded-xl">
                <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-4 border-b border-border/50 pb-2">Tool Details</h4>
                <div className="space-y-4">
                  <div>
                    <span className="block text-xs text-muted-foreground mb-1">Target Audience</span>
                    <span className="font-medium text-sm text-foreground">{tool.target_audience || 'All Creators'}</span>
                  </div>
                  <div>
                    <span className="block text-xs text-muted-foreground mb-1">Core Problem Solved</span>
                    <span className="font-medium text-sm text-foreground">{tool.core_problem || 'Automation bottleneck'}</span>
                  </div>
                  <div>
                    <span className="block text-xs text-muted-foreground mb-1">Transformation</span>
                    <span className="font-medium text-sm text-foreground">{tool.transformation || 'Manual to Automated'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default ToolDetailPage;