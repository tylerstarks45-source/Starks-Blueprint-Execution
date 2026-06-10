
import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import PageMeta from '@/components/PageMeta.jsx';
import { ArrowLeft, CheckCircle2, Star, ShieldCheck, Zap, ExternalLink, HelpCircle, MessageSquare, ArrowRight } from 'lucide-react';
import Header from '@/components/Header.jsx';
import Footer from '@/components/Footer.jsx';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { productsData } from '@/data/ProductsData.js';
import { getAffiliateLink } from '@/config/toolAffiliateLinks.js';
import pb from '@/lib/pocketbaseClient.js';
import VideoBackground from '@/components/VideoBackground.jsx';

const ProductDetailPage = () => {
  const { productId } = useParams();
  const [product, setProduct] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [relatedProducts, setRelatedProducts] = useState([]);

  useEffect(() => {
    const fetchProduct = async () => {
      setIsLoading(true);
      try {
        let found = productsData.find(p => p.id === productId || p.name.toLowerCase().replace(/\s+/g, '-') === productId);
        if (!found) {
          try {
            const pbTool = await pb.collection('tools').getOne(productId, { $autoCancel: false });
            found = {
              id: pbTool.id,
              name: pbTool.name,
              category: pbTool.category,
              description: pbTool.description,
              full_description: pbTool.full_description,
              image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=800&q=80",
              cta_link: pbTool.affiliateLink || pbTool.affiliate_link || getAffiliateLink(pbTool.name) || "#",
              features: pbTool.full_description ? [pbTool.full_description] : [],
              use_cases: pbTool.core_problem ? [pbTool.core_problem] : [],
              social_proof: ["4.8/5 ⭐", "Verified Users"],
              badges: pbTool.verified_use_case ? ["✅ Verified"] : [],
              customCTA: "Access Tool"
            };
          } catch (e) {
            console.error("Not found in PB either", e);
          }
        }
        setProduct(found);
        if (found) {
          const related = productsData.filter(p => p.category === found.category && p.id !== found.id).slice(0, 3);
          setRelatedProducts(related);
        }
      } catch (error) {
        console.error("Error fetching product details:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchProduct();
    window.scrollTo(0, 0);
  }, [productId]);

  if (isLoading || !product) {
    return (
      <VideoBackground>
        <Header />
        <div className="flex-grow flex items-center justify-center p-8 text-center bg-background/50 backdrop-blur-sm">
          {isLoading ? (
            <div className="animate-pulse flex flex-col items-center">
              <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4 shadow-[0_0_15px_hsl(var(--primary))]"></div>
              <p className="text-zinc-100 font-bold text-shadow-sm">Loading product details...</p>
            </div>
          ) : (
            <div className="bg-card/90 backdrop-blur-2xl p-12 rounded-3xl border border-white/20 shadow-2xl">
              <h1 className="text-4xl font-bold mb-4 text-shadow-sm">Product Not Found</h1>
              <p className="text-zinc-300 font-medium mb-8 text-shadow-sm">The tool or system you are looking for does not exist or has been removed.</p>
              <Button asChild className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-lg">
                <Link to="/marketplace">Return to Marketplace</Link>
              </Button>
            </div>
          )}
        </div>
        <Footer />
      </VideoBackground>
    );
  }

  const price = product.price || (product.badges?.includes('💎 Premium') ? '$99/mo' : 'Free Trial Available');
  const rating = product.social_proof?.[0]?.split('/')[0] || '4.8';
  const users = product.social_proof?.[1] || '10,000+ Active Users';

  return (
    <VideoBackground>
      <PageMeta
        title={`${product.name} | Starks Global Marketplace`}
        description={product.description}
      />
      
      <Header />
      
      <main className="flex-grow bg-background/30 backdrop-blur-sm">
        <div className="bg-card/80 backdrop-blur-xl border-b border-white/10 shadow-lg">
          <div className="container mx-auto px-4 py-4 max-w-7xl flex items-center gap-4 text-sm font-bold text-shadow-sm">
            <Link to="/marketplace" className="text-zinc-300 hover:text-white flex items-center transition-colors">
              <ArrowLeft className="w-4 h-4 mr-1" /> Back to Marketplace
            </Link>
            <span className="text-white/30">/</span>
            <span className="text-zinc-300">{product.category}</span>
            <span className="text-white/30">/</span>
            <span className="text-white">{product.name}</span>
          </div>
        </div>

        <section className="py-16 lg:py-24 relative overflow-hidden">
          <div className="container mx-auto px-4 max-w-7xl relative z-10">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              
              <div className="flex flex-col items-start bg-card/60 backdrop-blur-md border border-white/10 p-8 rounded-3xl shadow-2xl">
                <div className="flex flex-wrap gap-2 mb-6">
                  <Badge variant="secondary" className="text-sm px-3 py-1 bg-secondary/20 text-secondary border border-secondary/30 backdrop-blur-sm">{product.category}</Badge>
                  {product.badges?.map((badge, idx) => (
                    <Badge key={idx} variant="outline" className="text-sm px-3 py-1 border-primary/40 text-primary bg-primary/20 backdrop-blur-sm shadow-[0_0_10px_hsl(var(--primary)/0.2)]">
                      {badge}
                    </Badge>
                  ))}
                </div>
                
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight mb-6 text-balance text-shadow-lg">
                  {product.name}
                </h1>
                
                <p className="text-xl text-zinc-100 font-medium leading-relaxed mb-8 max-w-2xl text-shadow-sm">
                  {product.description}
                </p>

                <div className="flex flex-wrap items-center gap-6 mb-10 p-5 bg-background/80 backdrop-blur-xl border border-white/20 rounded-2xl w-full max-w-xl shadow-inner">
                  <div className="flex flex-col">
                    <span className="text-sm text-zinc-400 font-bold mb-1 text-shadow-sm">Pricing</span>
                    <span className="text-2xl font-extrabold text-foreground text-shadow-sm">{price}</span>
                  </div>
                  <div className="w-px h-10 bg-white/20 hidden sm:block"></div>
                  <div className="flex flex-col">
                    <span className="text-sm text-zinc-400 font-bold mb-1 text-shadow-sm">Rating</span>
                    <div className="flex items-center gap-1">
                      <Star className="w-5 h-5 fill-amber-400 text-amber-400 drop-shadow-[0_0_5px_rgba(251,191,36,0.5)]" />
                      <span className="text-xl font-extrabold text-foreground text-shadow-sm">{rating}/5</span>
                    </div>
                  </div>
                  <div className="w-px h-10 bg-white/20 hidden sm:block"></div>
                  <div className="flex flex-col">
                    <span className="text-sm text-zinc-400 font-bold mb-1 text-shadow-sm">Trusted By</span>
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-5 h-5 text-emerald-400 drop-shadow-[0_0_5px_rgba(52,211,153,0.5)]" />
                      <span className="text-lg font-extrabold text-foreground text-shadow-sm">{users}</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 w-full max-w-xl">
                  <Button asChild size="lg" className="w-full sm:w-auto text-lg h-14 px-8 bg-primary hover:bg-primary/90 shadow-[0_0_20px_hsl(var(--primary)/0.4)]">
                    <a href={product.cta_link} target="_blank" rel="noopener noreferrer" className="font-bold tracking-wide">
                      {product.customCTA || "Get Access Now"}
                      <ExternalLink className="w-5 h-5 ml-2" />
                    </a>
                  </Button>
                  <p className="text-sm text-zinc-300 font-bold text-center sm:text-left mt-2 sm:mt-0 flex items-center justify-center sm:justify-start text-shadow-sm">
                    <ShieldCheck className="w-4 h-4 mr-1 text-emerald-400" /> 30-Day Guarantee
                  </p>
                </div>
              </div>

              <div className="relative rounded-3xl overflow-hidden border-2 border-white/20 shadow-[0_20px_50px_rgba(0,0,0,0.5)] group">
                <img src={product.image} alt={product.name} className="w-full h-auto object-cover aspect-video transition-transform duration-700 group-hover:scale-105" />
                <div className="absolute inset-0 bg-gradient-to-t from-background/90 to-transparent opacity-80" />
              </div>

            </div>
          </div>
        </section>

      </main>
      <Footer />
    </VideoBackground>
  );
};

export default ProductDetailPage;
