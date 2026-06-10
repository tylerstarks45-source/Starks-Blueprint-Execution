
import React from 'react';
import { Helmet } from 'react-helmet';
import CanonicalUrl from '@/components/CanonicalUrl.jsx';
import Header from '@/components/Header.jsx';
import Footer from '@/components/Footer.jsx';
import { BadgeDollarSign } from 'lucide-react';
import VideoBackground from '@/components/VideoBackground.jsx';

const AffiliateDisclosure = () => {
  return (
    <VideoBackground>
      <CanonicalUrl />
      <Helmet>
        <title>Affiliate Disclosure | Starks Global Group</title>
        <meta name="description" content="Our transparent affiliate disclosure and commitment to unbiased system building." />
      </Helmet>
      
      <Header />
      
      <main className="flex-grow pt-32 pb-24 bg-background/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl">
          <div className="bg-card/90 backdrop-blur-2xl border border-white/20 rounded-3xl p-8 md:p-12 shadow-2xl">
            <div className="flex items-center gap-3 mb-6">
              <BadgeDollarSign className="w-8 h-8 text-primary" />
              <span className="text-sm font-mono text-primary uppercase tracking-widest block font-bold text-shadow-sm">Legal Compliance</span>
            </div>

            <h1 className="text-4xl md:text-5xl font-extrabold text-foreground mb-4 tracking-tight text-shadow-sm">Affiliate Disclosure</h1>
            <p className="text-sm font-mono text-zinc-300 mb-12 uppercase font-bold text-shadow-sm">Last Updated: June 3, 2026</p>

            <div className="prose prose-invert max-w-none text-zinc-200 font-medium space-y-8">
              
              <div className="bg-primary/20 backdrop-blur-md border border-primary/40 rounded-2xl p-6 mb-8 text-white shadow-inner">
                <h2 className="text-xl font-bold text-white mb-2 text-shadow-sm">Our Core Promise</h2>
                <p className="font-bold">
                  We may earn commissions when users click links and purchase products or services recommended on this platform. This comes at absolutely no extra cost to you. Our platform is funded by these commissions, allowing us to provide system blueprints and infrastructure guides for free.
                </p>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-foreground mb-4 text-shadow-sm">How Affiliate Links Work</h2>
                <p className="mb-4">
                  When you click on an affiliate link on our site and make a purchase or sign up for a paid subscription, the software vendor pays us a small referral fee. 
                </p>
                <p className="mb-4 font-bold text-foreground">
                  Important: You pay the exact same price whether you use our link or go directly to the vendor's website.
                </p>
              </div>

              <div className="bg-card/80 backdrop-blur-xl p-8 rounded-2xl border border-white/10 mt-12 shadow-lg">
                <p className="mb-2 text-foreground font-bold">If you have any questions regarding this disclosure, please contact us at:</p>
                <p className="font-mono text-primary font-bold text-shadow-sm">contact@starksglobalgroup.net</p>
              </div>
            </div>
          </div>
        </div>
      </main>
      
      <Footer />
    </VideoBackground>
  );
};

export default AffiliateDisclosure;
