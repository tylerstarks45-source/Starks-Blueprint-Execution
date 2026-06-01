import React, { useMemo } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { ShieldCheck } from 'lucide-react';
import Header from '@/components/Header.jsx';
import Footer from '@/components/Footer.jsx';
import ProductCard from '@/components/ProductCard.jsx';
import { productsData } from '@/data/ProductsData.js';

const SYSTEM_CATEGORIES = [
  "AI Software", 
  "Automation Systems", 
  "Marketing & Traffic", 
  "Funnel & Email Tools", 
  "Website Builders", 
  "Sales & Outreach", 
  "Data & Intelligence"
];

const ProductsPage = () => {
  // Ensure we only render categories that actually have products
  const categoriesWithProducts = useMemo(() => {
    return SYSTEM_CATEGORIES.map(category => ({
      name: category,
      products: productsData.filter(p => p.systemCategory === category)
    })).filter(cat => cat.products.length > 0);
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Helmet>
        <title>Verified Marketplace | Starks Global Group</title>
        <meta name="description" content="Curated marketplace of AI tools and software tested in real-world automation systems." />
      </Helmet>
      
      <Header />
      
      <main className="flex-grow pt-32 pb-32">
        <div className="container mx-auto px-[var(--container-px)] sm:px-6 lg:px-8 max-w-7xl">
          
          {/* Marketplace Intro */}
          <section className="text-center mb-24 relative">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="max-w-4xl mx-auto"
            >
              <div className="inline-flex items-center justify-center px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-bold tracking-wide mb-8 shadow-[0_0_15px_hsl(var(--primary)/0.1)]">
                <ShieldCheck className="w-4 h-4 mr-2" /> Starks Global Group Verified
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-7xl font-extrabold text-foreground mb-8 tracking-tight">
                Verified Tool Marketplace
              </h1>
              <p className="text-xl md:text-2xl text-muted-foreground leading-relaxed font-medium">
                These tools are selected based on real-world testing and system integration. Every tool listed is part of a working automation system.
              </p>
            </motion.div>
          </section>

          {/* Product Categories */}
          <div className="space-y-16">
            {categoriesWithProducts.map((categoryGroup, index) => (
              <motion.section 
                key={categoryGroup.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.5 }}
              >
                <h2 className="category-separator text-2xl md:text-3xl font-bold text-foreground">
                  {categoryGroup.name}
                  <span className="ml-4 text-sm font-mono text-muted-foreground px-2 py-0.5 rounded-md bg-secondary border border-white/5">
                    {categoryGroup.products.length} {categoryGroup.products.length === 1 ? 'System' : 'Systems'}
                  </span>
                </h2>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-10">
                  {categoryGroup.products.map(product => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>
              </motion.section>
            ))}
          </div>

        </div>
      </main>

      <Footer />
    </div>
  );
};

export default ProductsPage;