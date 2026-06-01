import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import pb from '@/lib/pocketbaseClient.js';
import { useAuth } from '@/contexts/AuthContext.jsx';
import ToolCard from '@/components/ToolCard.jsx';
import { toast } from 'sonner';
import { Save, Layers } from 'lucide-react';
import { toolAffiliateLinks, getAffiliateLink } from '@/config/toolAffiliateLinks.js';

const BlueprintToolsSection = ({ blueprintId, systemName }) => {
  const { isAuthenticated, currentUser } = useAuth();
  const navigate = useNavigate();
  
  const [tools, setTools] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Sync tools with the centralized affiliate config
  const syncWithCentralConfig = (rawTools) => {
    return rawTools.map(t => {
      const configMatch = Object.values(toolAffiliateLinks).find(
        c => c.name.toLowerCase() === t.name.toLowerCase() || 
             t.name.toLowerCase().includes(c.name.toLowerCase())
      );
      
      if (configMatch) {
        return {
          ...t,
          affiliate_link: configMatch.affiliateLink,
          description: configMatch.description || t.description,
          category: configMatch.category || t.category
        };
      }
      return t;
    });
  };

  useEffect(() => {
    let isMounted = true;
    
    const fetchRequiredTools = async () => {
      if (!blueprintId) {
        if (isMounted) setIsLoading(false);
        return;
      }

      // Handle static blueprint overrides
      if (blueprintId === 'system-05') {
        if (isMounted) {
          setTools(syncWithCentralConfig([
            { id: 'static-1', name: 'Make.com', category: 'Automation', description: 'Workflow automation between apps.' },
            { id: 'static-2', name: 'AutoDS', category: 'Product Sourcing', description: 'Automated product importing and fulfillment.' },
            { id: 'static-3', name: 'Pollo AI', category: 'AI Ad Creation', description: 'AI video generation for ad creatives.' }
          ]));
          setIsLoading(false);
        }
        return;
      }

      if (blueprintId === 'system-04') {
        if (isMounted) {
          setTools(syncWithCentralConfig([
            { id: 'static-04-1', name: 'GoHighLevel', category: 'Lead Data Tools', description: 'B2B database and CRM.' },
            { id: 'static-04-2', name: 'CustomGPT', category: 'AI Personalization', description: 'AI models for crafting personalized emails.' },
            { id: 'static-04-3', name: 'Make.com', category: 'Automation', description: 'Connects data sourcing to outreach.' }
          ]));
          setIsLoading(false);
        }
        return;
      }
      
      try {
        const blueprint = await pb.collection('blueprints').getOne(blueprintId, {
          expand: 'required_tools',
          $autoCancel: false
        });
        
        if (isMounted && blueprint.expand?.required_tools) {
          setTools(syncWithCentralConfig(blueprint.expand.required_tools));
        }
      } catch (error) {
        console.error(`Error fetching tools for blueprint ${blueprintId}:`, error);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchRequiredTools();
    
    return () => {
      isMounted = false;
    };
  }, [blueprintId]);

  const handleSaveSystem = async () => {
    if (!isAuthenticated) {
      toast.error("Please login to save systems");
      navigate('/login');
      return;
    }

    if (blueprintId === 'system-05' || blueprintId === 'system-04') {
      toast.success("System saved to your dashboard.");
      return;
    }

    setIsSaving(true);
    try {
      const user = await pb.collection('users').getOne(currentUser.id, { $autoCancel: false });
      
      const currentBlueprints = user.saved_blueprints || [];
      const currentTools = user.saved_tools || [];
      
      const newBlueprints = [...new Set([...currentBlueprints, blueprintId])];
      const newTools = [...new Set([...currentTools, ...tools.map(t => t.id)])];
      
      await pb.collection('users').update(currentUser.id, {
        saved_blueprints: newBlueprints,
        saved_tools: newTools
      }, { $autoCancel: false });
      
      toast.success("System and required tools saved to your dashboard.");
    } catch (error) {
      console.error("Save error:", error);
      toast.error("Failed to save system.");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="mt-6 pt-4 border-t border-border/50 text-center animate-pulse">
        <div className="h-4 w-32 bg-secondary/50 rounded mx-auto mb-3"></div>
        <div className="h-16 w-full bg-secondary/30 rounded-lg"></div>
      </div>
    );
  }

  if (tools.length === 0) {
    return null;
  }

  return (
    <div className="mt-6 pt-4 border-t border-border/50 flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-xs font-bold text-foreground uppercase tracking-widest flex items-center gap-2">
          <Layers className="w-4 h-4 text-primary" />
          Required Stack
        </h4>
        <span className="text-xs font-mono bg-secondary/50 border border-border text-muted-foreground px-2 py-0.5 rounded">
          {tools.length} Tools
        </span>
      </div>
      
      <div className="space-y-3 mb-4 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
        {tools.map(tool => (
          <ToolCard key={tool.id} tool={tool} compact={true} />
        ))}
      </div>
      
      <button 
        onClick={handleSaveSystem}
        disabled={isSaving}
        className="w-full saas-button-secondary text-xs py-2 mt-auto flex items-center justify-center gap-2"
      >
        <Save className="w-3.5 h-3.5" />
        {isSaving ? "Saving Stack..." : "Save Tools & Architecture"}
      </button>
    </div>
  );
};

export default BlueprintToolsSection;