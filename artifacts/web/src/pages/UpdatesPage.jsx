import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import pb from '@/lib/pocketbaseClient';
import PageMeta from '@/components/PageMeta.jsx';
import Header from '@/components/Header.jsx';
import Footer from '@/components/Footer.jsx';

const UpdatesPage = () => {
  const [updates, setUpdates] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState('All');

  useEffect(() => {
    const fetchUpdates = async () => {
      try {
        const records = await pb.collection('updates').getFullList({
          sort: '-created',
          $autoCancel: false
        });
        setUpdates(records);
      } catch (error) {
        console.error("Error fetching updates:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUpdates();
  }, []);

  const filteredUpdates = filter === 'All' 
    ? updates 
    : updates.filter(u => u.update_type === filter);

  const getBadgeColor = (type) => {
    switch(type) {
      case 'New Tool': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-800';
      case 'New System': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 border-green-200 dark:border-green-800';
      case 'Platform Change': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 border-purple-200 dark:border-purple-800';
      default: return 'bg-secondary text-secondary-foreground border-border';
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <PageMeta
        title="Platform Updates | Starks Global Group"
        description="Stay up to date with the latest tool additions, new AI system blueprints, and platform improvements from Starks Global Group."
      />
      
      <Header />
      
      <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground mb-2">Platform Updates</h1>
          <p className="text-sm text-muted-foreground">Latest additions, changes, and improvements to the infrastructure.</p>
        </div>

        <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
          {['All', 'New Tool', 'New System', 'Platform Change'].map(type => (
            <button
              key={type}
              onClick={() => setFilter(type)}
              className={`px-4 py-1.5 text-sm font-medium rounded-full whitespace-nowrap transition-colors ${
                filter === type 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
              }`}
            >
              {type}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground text-sm">Loading updates...</div>
        ) : filteredUpdates.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-border rounded-lg bg-muted/10">
            <p className="text-muted-foreground text-sm">No updates found for this category.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {filteredUpdates.map(update => (
              <div key={update.id} className="bg-card border border-border rounded-lg p-6">
                <div className="flex items-center gap-3 mb-3">
                  <span className={`px-2.5 py-0.5 text-[10px] uppercase tracking-wider font-bold rounded border ${getBadgeColor(update.update_type)}`}>
                    {update.update_type}
                  </span>
                  <span className="text-xs text-muted-foreground font-mono">
                    {new Date(update.created).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                  </span>
                </div>
                <h2 className="text-lg font-semibold text-foreground mb-2">{update.title}</h2>
                {update.description && (
                  <p className="text-sm text-muted-foreground leading-relaxed">{update.description}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </main>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl py-12 border-t border-border mt-8">
        <p className="text-xs text-muted-foreground uppercase tracking-wider font-mono mb-4">Related Pages</p>
        <div className="flex flex-wrap gap-3">
          <Link to="/about" className="text-sm text-muted-foreground hover:text-primary transition-colors underline underline-offset-4">About Us</Link>
          <Link to="/why-trust-us" className="text-sm text-muted-foreground hover:text-primary transition-colors underline underline-offset-4">Why Trust Us</Link>
          <Link to="/business-model" className="text-sm text-muted-foreground hover:text-primary transition-colors underline underline-offset-4">Business Model</Link>
          <Link to="/blueprints" className="text-sm text-muted-foreground hover:text-primary transition-colors underline underline-offset-4">System Blueprints</Link>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default UpdatesPage;