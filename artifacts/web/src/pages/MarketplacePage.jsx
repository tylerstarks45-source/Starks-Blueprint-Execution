
import React, { useEffect, useState, useMemo } from 'react';
import { Helmet } from 'react-helmet';
import CanonicalUrl from '@/components/CanonicalUrl.jsx';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Search, Filter, SlidersHorizontal, ShieldCheck, Star, Users, Zap, ArrowRight } from 'lucide-react';
import Header from '@/components/Header.jsx';
import Footer from '@/components/Footer.jsx';
import ProductCard from '@/components/ProductCard.jsx';
import PaginationControls from '@/components/PaginationControls.jsx';
import { productsData } from '@/data/ProductsData.js';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import pb from '@/lib/pocketbaseClient.js';
import VideoBackground from '@/components/VideoBackground.jsx';

const ITEMS_PER_PAGE = 12;
const CATEGORIES = [
  'All', 
  'Content Creation', 
  'Automation', 
  'Funnels / Marketing', 
  'SEO / Traffic', 
  'AI Tools', 
  'Business Systems'
];

const MarketplacePage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const [tools, setTools] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters State
  const currentPage = parseInt(searchParams.get('page') || '1', 10);
  const searchTerm = searchParams.get('q') || '';
  const selectedCategory = searchParams.get('category') || 'All';
  const sortBy = searchParams.get('sort') || 'popular';

  const updateURLParams = (updates) => {
    const newParams = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === '' || value === 'All' || value === 'popular') {
        newParams.delete(key);
      } else {
        newParams.set(key, value.toString());
      }
    });
    setSearchParams(newParams);
    if (updates.page) {
      document.getElementById('marketplace-grid')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const fetchTools = async () => {
    setIsLoading(true);
    try {
      const dbTools = await pb.collection('tools').getFullList({
        filter: 'activeOnly=true',
        $autoCancel: false
      }).catch(() => []);

      // Presentation source: rich card content keyed by tool name
      const cardByName = {};
      productsData.forEach((p) => { cardByName[p.name.toLowerCase()] = p; });

      // DB is authoritative for existence + affiliate link; enrich presentation from config
      const mappedDbTools = dbTools.map((tool) => {
        const card = cardByName[tool.name.toLowerCase()] || {};
        return {
          ...card,
          id: tool.id,
          name: tool.name,
          category: card.category || "AI Tools",
          description: tool.description || card.description || "",
          cta_link: tool.affiliateLink || card.cta_link || "#",
          customCTA: card.customCTA || "Access Tool",
        };
      });

      // Safety net: include any config tools not yet persisted in the DB
      const dbNames = new Set(mappedDbTools.map((t) => t.name.toLowerCase()));
      const missingFromDb = productsData.filter((t) => !dbNames.has(t.name.toLowerCase()));

      const all = [...mappedDbTools, ...missingFromDb].filter((t) => t.cta_link && t.cta_link !== "#");
      setTools(all.length ? all : productsData);
    } catch (err) {
      console.error("Error fetching tools:", err);
      setTools(productsData);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTools();
  }, []);

  const filteredTools = useMemo(() => {
    let result = tools.filter(tool => {
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        return [tool.name, tool.description, tool.category, ...(tool.features || [])]
          .some(val => val?.toLowerCase().includes(term));
      }
      if (selectedCategory !== 'All' && tool.category !== selectedCategory) {
        return false;
      }
      return true;
    });

    result.sort((a, b) => {
      if (sortBy === 'newest') {
        return (b.badges?.includes('🆕 New') ? 1 : 0) - (a.badges?.includes('🆕 New') ? 1 : 0);
      }
      if (sortBy === 'rating') {
        const ratingA = parseFloat(a.social_proof?.[0] || '0');
        const ratingB = parseFloat(b.social_proof?.[0] || '0');
        return ratingB - ratingA;
      }
      return (b.badges?.includes('🔥 Popular') ? 1 : 0) - (a.badges?.includes('🔥 Popular') ? 1 : 0);
    });

    return result;
  }, [tools, searchTerm, selectedCategory, sortBy]);

  const totalPages = Math.ceil(filteredTools.length / ITEMS_PER_PAGE);
  const validCurrentPage = Math.max(1, Math.min(currentPage, Math.max(1, totalPages)));
  
  const paginatedTools = useMemo(() => {
    const start = (validCurrentPage - 1) * ITEMS_PER_PAGE;
    return filteredTools.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredTools, validCurrentPage]);

  const featuredTools = tools.filter(t => t.badges?.includes('💎 Premium') || t.badges?.includes('⭐ Best Value')).slice(0, 4);

  return (
    <VideoBackground>
      <CanonicalUrl />
      <Helmet>
        <title>Premium Tools Marketplace | Starks Global Group</title>
        <meta name="description" content="Discover expert-curated AI tools, automation systems, and marketing software to scale your business." />
      </Helmet>
      
      <Header />
      
      <main className="flex-grow">
        
        {/* Hero Section */}
        <section className="relative pt-24 pb-16 lg:pt-32 lg:pb-24 overflow-hidden border-b border-white/10 bg-background/50 backdrop-blur-sm">
          <div className="container mx-auto px-4 max-w-5xl relative z-10 text-center">
            <Badge variant="outline" className="mb-6 border-primary/30 text-primary bg-primary/20 backdrop-blur-md px-4 py-1.5 text-sm">
              <Star className="w-4 h-4 mr-2 inline" /> Expert-Curated Software Stack
            </Badge>
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight mb-6 text-balance text-shadow-lg">
              The Ultimate Growth <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">Marketplace</span>
            </h1>
            <p className="text-xl text-zinc-100 mb-10 max-w-3xl mx-auto leading-relaxed text-shadow-lg">
              Stop wasting time on unproven software. Discover the exact AI tools, automation platforms, and marketing systems we use to scale 7-figure businesses.
            </p>

            {/* Search Bar */}
            <div className="max-w-2xl mx-auto relative flex items-center shadow-2xl shadow-black/50 rounded-full bg-card/90 backdrop-blur-lg border border-border p-2">
              <Search className="w-6 h-6 text-muted-foreground ml-4 absolute" />
              <Input 
                type="text" 
                placeholder="Search for tools, categories, or features..." 
                className="w-full pl-12 pr-32 h-14 text-lg bg-transparent border-none focus-visible:ring-0 focus-visible:ring-offset-0 text-foreground"
                value={searchTerm}
                onChange={(e) => updateURLParams({ q: e.target.value, page: 1 })}
              />
              <Button className="absolute right-2 h-10 rounded-full px-6" onClick={() => document.getElementById('marketplace-grid')?.scrollIntoView({ behavior: 'smooth' })}>
                Search
              </Button>
            </div>
          </div>
        </section>

        {/* Trust Signals Strip */}
        <div className="bg-background/70 backdrop-blur-md border-b border-white/10 py-6">
          <div className="container mx-auto px-4 max-w-7xl">
            <div className="flex flex-wrap justify-center gap-8 md:gap-16 text-sm font-medium text-zinc-200 text-shadow-sm">
              <div className="flex items-center gap-2"><Users className="w-5 h-5 text-primary" /> 10,000+ Satisfied Customers</div>
              <div className="flex items-center gap-2"><ShieldCheck className="w-5 h-5 text-emerald-400" /> 30-Day Money-Back Guarantee</div>
              <div className="flex items-center gap-2"><Zap className="w-5 h-5 text-orange-400" /> Instant Access & Setup</div>
            </div>
          </div>
        </div>

        {/* Featured Section */}
        {!searchTerm && selectedCategory === 'All' && currentPage === 1 && (
          <section className="py-16 container mx-auto px-4 max-w-7xl">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-3xl font-bold flex items-center gap-3 text-shadow-md">
                <Star className="w-8 h-8 text-amber-500 fill-amber-500" /> Featured Bestsellers
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {featuredTools.map(tool => <ProductCard key={tool.id} product={tool} />)}
            </div>
          </section>
        )}

        {/* Main Grid Section */}
        <section id="marketplace-grid" className="py-16 container mx-auto px-4 max-w-7xl">
          
          {/* Filters & Sort Bar */}
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-10 bg-card/80 backdrop-blur-xl p-4 rounded-2xl border border-white/10 shadow-lg">
            
            {/* Categories */}
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((cat) => (
                <Button
                  key={cat}
                  variant={selectedCategory === cat ? "default" : "outline"}
                  size="sm"
                  onClick={() => updateURLParams({ category: cat, page: 1 })}
                  className={`rounded-full ${selectedCategory !== cat ? 'bg-background/50 border-white/20 hover:bg-background' : ''}`}
                >
                  {cat}
                </Button>
              ))}
            </div>

            {/* Sort & Results Count */}
            <div className="flex items-center gap-4 w-full lg:w-auto justify-between lg:justify-end">
              <span className="text-sm text-zinc-300 font-medium whitespace-nowrap text-shadow-sm">
                {filteredTools.length} Results
              </span>
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-zinc-300" />
                <Select value={sortBy} onValueChange={(val) => updateURLParams({ sort: val, page: 1 })}>
                  <SelectTrigger className="w-[160px] bg-background/80 border-white/20">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent className="z-50">
                    <SelectItem value="popular">Most Popular</SelectItem>
                    <SelectItem value="newest">Newest Arrivals</SelectItem>
                    <SelectItem value="rating">Highest Rated</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Grid */}
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="h-[400px] rounded-2xl bg-card/50 backdrop-blur-sm border border-white/10 animate-pulse" />
              ))}
            </div>
          ) : filteredTools.length === 0 ? (
            <div className="text-center py-24 bg-card/80 backdrop-blur-xl border border-white/10 rounded-2xl shadow-xl">
              <Search className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <h3 className="text-2xl font-bold mb-2">No tools found</h3>
              <p className="text-zinc-300 mb-6">We couldn't find any tools matching your criteria.</p>
              <Button onClick={() => updateURLParams({ q: '', category: 'All' })}>Clear All Filters</Button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
                {paginatedTools.map(tool => (
                  <ProductCard key={tool.id} product={tool} />
                ))}
              </div>

              {totalPages > 1 && (
                <div className="flex justify-center pt-8 border-t border-white/10">
                  <PaginationControls 
                    currentPage={validCurrentPage} 
                    totalPages={totalPages} 
                    onPageChange={(page) => updateURLParams({ page })} 
                  />
                </div>
              )}
            </>
          )}
        </section>

        {/* FAQ Section */}
        <section className="py-20 bg-background/60 backdrop-blur-md border-t border-white/10">
          <div className="container mx-auto px-4 max-w-3xl">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4 text-shadow-md">Marketplace FAQ</h2>
              <p className="text-zinc-300 text-shadow-sm">Common questions about our curated tools and systems.</p>
            </div>
            
            <Accordion type="single" collapsible className="w-full bg-card/80 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-xl">
              <AccordionItem value="item-1">
                <AccordionTrigger className="text-left font-semibold">Are these tools tested by your team?</AccordionTrigger>
                <AccordionContent className="text-zinc-300">
                  Yes. Every single tool listed in our marketplace has been rigorously tested in live production environments by the Starks Global team. We only recommend software we actually use or have verified to deliver exceptional results.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-2">
                <AccordionTrigger className="text-left font-semibold">Do I get support for the tools I purchase?</AccordionTrigger>
                <AccordionContent className="text-zinc-300">
                  Support for individual tools is provided directly by the software vendor. However, if you purchase a tool as part of one of our Blueprints, we provide guidance on how to integrate it into your overall system.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-3">
                <AccordionTrigger className="text-left font-semibold">What if a tool doesn't work for me?</AccordionTrigger>
                <AccordionContent className="text-zinc-300">
                  Most of our recommended partners offer a 14 to 30-day money-back guarantee. We specifically select vendors with strong refund policies to ensure your investment is protected.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-4">
                <AccordionTrigger className="text-left font-semibold">Are these affiliate links?</AccordionTrigger>
                <AccordionContent className="text-zinc-300">
                  Yes, some links in our marketplace are affiliate links. This means we may earn a commission if you purchase through our link, at no additional cost to you. This helps support our research and testing lab.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </section>

      </main>

      <Footer />
    </VideoBackground>
  );
};

export default MarketplacePage;
