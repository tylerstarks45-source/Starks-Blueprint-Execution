
import React from 'react';
import { Helmet } from 'react-helmet';
import CanonicalUrl from '@/components/CanonicalUrl.jsx';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ShieldCheck, TestTube2, Link as LinkIcon, Activity, RefreshCw, XCircle, ArrowRight, BadgeDollarSign, AlertTriangle, Target, CheckCircle2 } from 'lucide-react';

import Header from '@/components/Header.jsx';
import Footer from '@/components/Footer.jsx';
import { Button } from '@/components/ui/button';
import VideoBackground from '@/components/VideoBackground.jsx';

const WhyTrustUsPage = () => {
  return (
    <VideoBackground>
      <CanonicalUrl />
      <Helmet>
        <title>Why Trust Us | Starks Global Group</title>
        <meta name="description" content="Learn how Starks Global Group tests, validates, and deploys AI tools and automation systems before recommending them." />
      </Helmet>
      
      <Header />
      
      <main className="flex-grow">
        
        <section className="relative pt-32 pb-20 lg:pt-40 lg:pb-24 overflow-hidden border-b border-white/10 bg-background/50 backdrop-blur-sm">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10 max-w-4xl text-center">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
              <div className="inline-flex items-center gap-2 px-3 py-1 mb-6 border border-primary/30 bg-primary/20 backdrop-blur-md text-primary text-xs font-mono uppercase tracking-widest rounded-md shadow-lg">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Platform Integrity</span>
              </div>
              <h1 className="text-4xl md:text-6xl font-extrabold text-foreground leading-tight tracking-tight mb-6 text-shadow-lg">
                Why Businesses Trust Starks Global Group
              </h1>
              <p className="text-lg md:text-xl text-zinc-100 leading-relaxed max-w-3xl mx-auto font-bold text-shadow-md">
                We don't promote tools—we test, validate, and deploy them inside real automation systems before they ever reach this platform.
              </p>
            </motion.div>
          </div>
        </section>

        <section className="py-20 bg-background/40 backdrop-blur-md relative border-b border-white/10">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-5xl">
            <div className="bg-card/80 backdrop-blur-2xl border border-primary/40 rounded-3xl p-8 md:p-12 shadow-2xl flex flex-col md:flex-row gap-8 items-center">
              <div className="shrink-0 p-6 bg-primary/20 rounded-full border border-primary/30">
                <CheckCircle2 className="w-12 h-12 text-primary" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-4 text-shadow-sm">Independent Verification</h2>
                <p className="text-zinc-200 mb-4 leading-relaxed font-bold text-shadow-sm">
                  Every tool in our marketplace is independently tested by our team. We remove tools that fail to meet our standards or provide poor user experience.
                </p>
                <p className="text-zinc-200 leading-relaxed font-bold text-shadow-sm">
                  We do not earn more money by recommending certain tools — our commission structure is consistent across all partners, ensuring our recommendations remain completely objective and focused on capability, not payout.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="py-24 bg-background/60 backdrop-blur-sm relative overflow-hidden">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center max-w-3xl">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight mb-8 text-shadow-md">
              Start With Verified Systems
            </h2>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button asChild variant="outline" className="w-full sm:w-auto h-12 px-8 bg-card/50 backdrop-blur-md border-white/20 hover:bg-card">
                <Link to="/marketplace">Browse Marketplace</Link>
              </Button>
              <Button asChild className="w-full sm:w-auto h-12 px-8 group bg-primary hover:bg-primary/90 text-primary-foreground shadow-xl">
                <Link to="/signup">
                  Create Free Account
                  <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </Link>
              </Button>
            </div>
          </div>
        </section>

      </main>
      
      <Footer />
    </VideoBackground>
  );
};

export default WhyTrustUsPage;
