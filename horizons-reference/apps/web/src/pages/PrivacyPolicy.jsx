
import React from 'react';
import { Helmet } from 'react-helmet';
import Header from '@/components/Header.jsx';
import Footer from '@/components/Footer.jsx';
import { ShieldCheck } from 'lucide-react';
import VideoBackground from '@/components/VideoBackground.jsx';

const PrivacyPolicy = () => {
  return (
    <VideoBackground>
      <Helmet>
        <title>Privacy Policy | Starks Global Group</title>
        <meta name="description" content="How we collect, use, and protect your data." />
      </Helmet>
      
      <Header />
      
      <main className="flex-grow pt-32 pb-24 bg-background/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl">
          <div className="bg-card/90 backdrop-blur-2xl border border-white/20 rounded-3xl p-8 md:p-12 shadow-2xl">
            <div className="flex items-center gap-3 mb-6">
              <ShieldCheck className="w-8 h-8 text-primary" />
              <span className="text-sm font-mono text-primary uppercase tracking-widest block font-bold text-shadow-sm">Legal Compliance</span>
            </div>
            
            <h1 className="text-4xl md:text-5xl font-extrabold text-foreground mb-4 tracking-tight text-shadow-sm">Privacy Policy</h1>
            <p className="text-sm font-mono text-zinc-300 mb-12 uppercase font-bold text-shadow-sm">Last Updated: April 11, 2026</p>

            <div className="prose prose-invert max-w-none text-zinc-200 font-medium space-y-8">
              <p className="text-lg leading-relaxed text-shadow-sm">
                At Starks Global Group ("we," "us," or "our"), we are committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website or use our services.
              </p>

              <hr className="border-white/10 my-8" />

              <div>
                <h2 className="text-2xl font-bold text-foreground mb-4 text-shadow-sm">1. Data Collection Practices</h2>
                <p className="mb-4">We collect information that you voluntarily provide to us when you register on the platform.</p>
                <ul className="list-disc pl-6 space-y-2 mb-6">
                  <li><strong>Personal Data:</strong> Name, email address, password.</li>
                  <li><strong>Account Data:</strong> Information related to the systems you save.</li>
                </ul>
              </div>

              <div className="bg-primary/10 backdrop-blur-md p-8 rounded-2xl border border-primary/20 mt-12 shadow-inner">
                <h2 className="text-xl font-bold text-foreground mb-4 text-shadow-sm">Contact for Privacy Concerns</h2>
                <p className="mb-2">If you have questions or comments about this Privacy Policy, please contact our Data Protection Officer at:</p>
                <p className="font-mono text-primary font-bold text-shadow-sm">contact@starksglobalgroup.com</p>
              </div>
            </div>
          </div>
        </div>
      </main>
      
      <Footer />
    </VideoBackground>
  );
};

export default PrivacyPolicy;
