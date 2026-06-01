
import React from 'react';
import { Helmet } from 'react-helmet';
import Header from '@/components/Header.jsx';
import Footer from '@/components/Footer.jsx';
import { ShieldCheck } from 'lucide-react';
import VideoBackground from '@/components/VideoBackground.jsx';

const TermsAndConditionsPage = () => {
  return (
    <VideoBackground>
      <Helmet>
        <title>Terms & Conditions | Starks Global Group</title>
        <meta name="description" content="Terms and conditions for using Starks Global Group services and platform." />
      </Helmet>
      
      <Header />
      
      <main className="flex-grow pt-32 pb-24 bg-background/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl">
          <div className="bg-card/90 backdrop-blur-2xl border border-white/20 rounded-3xl p-8 md:p-12 shadow-2xl">
            <div className="flex items-center gap-3 mb-6">
              <ShieldCheck className="w-8 h-8 text-primary" />
              <span className="text-sm font-mono text-primary uppercase tracking-widest block font-bold text-shadow-sm">Legal Compliance</span>
            </div>
            
            <h1 className="text-4xl md:text-5xl font-extrabold text-foreground mb-4 tracking-tight text-shadow-sm">Terms & Conditions</h1>
            <p className="text-sm font-mono text-zinc-300 mb-12 uppercase font-bold text-shadow-sm">Last Updated: April 12, 2026</p>

            <div className="prose prose-invert max-w-none text-zinc-200 font-medium space-y-8">
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-4 text-shadow-sm">1. Acceptance of Terms</h2>
                <p>By accessing and using the Starks Global Group website and platform, you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by these terms, please do not use this service.</p>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-foreground mb-4 text-shadow-sm">2. Affiliate Relationships & Compensation Disclosure</h2>
                <p>Some of the links on this website are affiliate links. This means if you click on the link and purchase the item, Starks Global Group will receive an affiliate commission at no extra cost to you. We only recommend products or services we use personally and believe will add value to our readers.</p>
              </div>
              
              <div className="bg-primary/10 backdrop-blur-md p-8 rounded-2xl border border-primary/20 mt-12 shadow-inner">
                <h2 className="text-xl font-bold text-foreground mb-4 text-shadow-sm">Contact Information</h2>
                <p>If you have any questions about these Terms, please contact us at ceo@starksglobalgroup.com.</p>
              </div>
            </div>
          </div>
        </div>
      </main>
      
      <Footer />
    </VideoBackground>
  );
};

export default TermsAndConditionsPage;
