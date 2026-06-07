import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ShoppingBag, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const initials = (name) =>
  (name || '?')
    .split(/[\s/]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

const ACCENTS = [
  'bg-purple-500/10 text-purple-500',
  'bg-blue-500/10 text-blue-500',
  'bg-emerald-500/10 text-emerald-500',
];

const UserMarketplaceToolsCard = () => {
  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [catsRes, toolsRes] = await Promise.all([
          fetch('/api/tool-categories').catch(() => null),
          fetch('/api/tools').catch(() => null),
        ]);

        const cats = catsRes?.ok ? await catsRes.json() : [];
        const tools = toolsRes?.ok ? await toolsRes.json() : [];

        const counts = {};
        (Array.isArray(tools) ? tools : []).forEach((t) => {
          if (t.categoryId != null) counts[t.categoryId] = (counts[t.categoryId] || 0) + 1;
        });

        const enriched = (Array.isArray(cats) ? cats : [])
          .map((c) => ({ ...c, count: counts[c.id] || 0 }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 3);

        setCategories(enriched);
      } catch {
        setCategories([]);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  return (
    <Card className="h-full flex flex-col border-white/10 bg-black/80 backdrop-blur-sm shadow-xl">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-medium flex items-center gap-2">
          <ShoppingBag className="w-5 h-5 text-purple-500" /> Marketplace
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col">
        <div className="grid grid-cols-1 gap-3 flex-1 mb-6">
          {isLoading ? (
            [1, 2, 3].map((i) => <div key={i} className="h-[58px] rounded-lg bg-muted/30 animate-pulse" />)
          ) : categories.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-center py-4">
              <p className="text-sm text-muted-foreground">Browse our curated tool directory.</p>
            </div>
          ) : (
            categories.map((cat, i) => (
              <Link
                key={cat.id}
                to={`/marketplace`}
                className="p-3 rounded-lg border border-border/50 bg-muted/5 flex items-center gap-3 hover:bg-muted/20 transition-colors"
              >
                <div className={`w-10 h-10 rounded-md flex items-center justify-center shrink-0 ${ACCENTS[i % ACCENTS.length]}`}>
                  <span className="font-bold text-xs">{initials(cat.name)}</span>
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">{cat.name}</p>
                  <p className="text-xs text-muted-foreground line-clamp-1">
                    {cat.count} {cat.count === 1 ? 'tool' : 'tools'} available
                  </p>
                </div>
              </Link>
            ))
          )}
        </div>
        <Button variant="outline" className="w-full mt-auto" asChild>
          <Link to="/marketplace">
            Browse Tools <ArrowRight className="w-4 h-4 ml-2" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
};

export default UserMarketplaceToolsCard;
