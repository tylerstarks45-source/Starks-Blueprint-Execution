
import React from 'react';
import { Helmet } from 'react-helmet';
import CanonicalUrl from '@/components/CanonicalUrl.jsx';
import Header from '@/components/Header.jsx';
import Footer from '@/components/Footer.jsx';
import { AlertTriangle } from 'lucide-react';
import VideoBackground from '@/components/VideoBackground.jsx';

const EarningsDisclaimer = () => {
  return (
    <VideoBackground>
      <CanonicalUrl />
      <Helmet>
        <title>Earnings Disclaimer | Starks Global Group</title>
        <meta name="description" content="Important disclaimer regarding earnings, results, and system implementation." />
      </Helmet>
      
      <Header />
      
      <main className="flex-grow pt-32 pb-24 bg-background/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl">
          <div className="bg-card/90 backdrop-blur-2xl border border-white/20 rounded-3xl p-8 md:p-12 shadow-2xl">
            <div className="flex items-center gap-3 mb-6">
              <AlertTriangle className="w-8 h-8 text-primary" />
              <span className="text-sm font-mono text-primary uppercase tracking-widest block font-bold text-shadow-sm">Legal Compliance</span>
            </div>

            <h1 className="text-4xl md:text-5xl font-extrabold text-foreground mb-4 tracking-tight text-shadow-sm">Earnings Disclaimer</h1>
            <p className="text-sm font-mono text-zinc-300 mb-12 uppercase font-bold text-shadow-sm">Last Updated: June 3, 2026</p>

            <div className="prose prose-invert max-w-none text-zinc-200 font-medium space-y-8">
              
              <div className="bg-amber-500/20 backdrop-blur-md border border-amber-500/40 rounded-2xl p-6 mb-8 shadow-inner">
                <h2 className="text-xl font-bold text-amber-400 mb-2 text-shadow-sm">No Income Guarantees</h2>
                <p className="font-bold text-amber-100 mb-0">
                  Starks Global Group makes no income guarantees. The blueprints, tool recommendations, and architectures detailed on this website are designed for educational purposes only. We do not promise specific earnings or business outcomes.
                </p>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-foreground mb-4 text-shadow-sm">User Responsibility</h2>
                <p className="mb-4">
                  The user is responsible for implementation and results. These systems are automation frameworks—they do not run a business for you. Building automation infrastructure requires a significant time investment, rigorous testing, iteration, and continuous optimization. You are solely responsible for your own success or failure.
                </p>
              </div>

              <div className="bg-card/80 backdrop-blur-xl p-8 rounded-2xl border border-white/10 mt-12 shadow-lg">
                <p className="mb-2 text-foreground font-bold">We provide the blueprints, the research, and the guidance, but your ultimate results depend entirely on your execution.</p>
                <p className="text-sm mt-4">If you have questions regarding this disclaimer, please contact us at:</p>
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

export default EarningsDisclaimer;
