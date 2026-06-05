
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
        <meta name="description" content="Terms and conditions for using the Starks Blueprint Execution Platform." />
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
            <p className="text-sm font-mono text-zinc-300 mb-12 uppercase font-bold text-shadow-sm">Last Updated: June 3, 2026</p>

            <div className="prose prose-invert max-w-none text-zinc-200 font-medium space-y-8">

              <div>
                <h2 className="text-2xl font-bold text-foreground mb-4 text-shadow-sm">1. Acceptance of Terms</h2>
                <p>By accessing and using starksglobalgroup.net and the Starks Blueprint Execution Platform ("SBEP," "the Platform"), you accept and agree to be bound by these Terms & Conditions. If you do not agree, please do not use the service. These terms apply to all users, including free-tier visitors and paying subscribers.</p>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-foreground mb-4 text-shadow-sm">2. Platform Description</h2>
                <p className="mb-4">SBEP is an AI-powered automation platform that provides:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li><strong>Blueprints:</strong> Pre-built AI system architectures for automating business processes.</li>
                  <li><strong>AI System Builder:</strong> An AI agent (powered by OpenRouter) that matches your goals to blueprints and creates personalized system plans.</li>
                  <li><strong>Tool Marketplace:</strong> A curated directory of third-party tools with affiliate links.</li>
                  <li><strong>Credit System:</strong> A platform credit balance used for AI-powered features. Credits are allocated based on your subscription tier.</li>
                </ul>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-foreground mb-4 text-shadow-sm">3. Subscriptions & Billing</h2>
                <p className="mb-4">The Platform offers the following subscription tiers, billed through Stripe, Inc.:</p>
                <ul className="list-disc pl-6 space-y-2 mb-4">
                  <li><strong>Free:</strong> Limited access with a base credit allocation. No payment required.</li>
                  <li><strong>Builder:</strong> Enhanced access with expanded credit limits and additional blueprints.</li>
                  <li><strong>Operator:</strong> Full platform access with priority AI processing and higher credit limits.</li>
                  <li><strong>Empire:</strong> Unlimited access with maximum credit allocation and dedicated support.</li>
                </ul>
                <p className="mb-4">Subscriptions are billed on a recurring basis. You may cancel at any time; cancellation takes effect at the end of the current billing period. We do not offer refunds for partial billing periods unless required by applicable law. All payments are processed securely by Stripe — we do not store your card details.</p>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-foreground mb-4 text-shadow-sm">4. AI Credits & Usage</h2>
                <p>Credits are consumed when you use AI-powered features including the System Builder and automated blueprint execution. Credits are non-transferable and do not roll over between billing periods unless your plan explicitly states otherwise. Unused credits at the end of a billing period are forfeited. We reserve the right to adjust credit allocations per tier with 30 days' notice.</p>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-foreground mb-4 text-shadow-sm">5. Affiliate Relationships & Compensation</h2>
                <p>Some links in the Tool Marketplace are affiliate links. If you click a link and purchase a product or service, Starks Global Group may receive a referral commission at no additional cost to you. We only recommend tools we have evaluated and believe provide genuine value. Affiliate relationships do not influence the system recommendations generated by the AI builder.</p>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-foreground mb-4 text-shadow-sm">6. Acceptable Use</h2>
                <p className="mb-4">You agree not to:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Use the platform to generate, distribute, or automate illegal content.</li>
                  <li>Attempt to reverse engineer, scrape, or extract AI models or blueprint data at scale.</li>
                  <li>Share account credentials or attempt to circumvent subscription limits.</li>
                  <li>Use the AI builder to create systems designed to harm, defraud, or deceive third parties.</li>
                  <li>Submit malicious prompts designed to abuse the AI processing infrastructure.</li>
                </ul>
                <p className="mt-4">Violations may result in immediate account suspension without refund.</p>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-foreground mb-4 text-shadow-sm">7. Intellectual Property</h2>
                <p>All blueprints, platform content, and AI-generated system plans produced by SBEP are the property of Starks Global Group. You are granted a limited, non-exclusive license to use these plans for your own business purposes. You may not resell, sublicense, or redistribute blueprint content without written permission.</p>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-foreground mb-4 text-shadow-sm">8. Limitation of Liability</h2>
                <p>The Platform is provided "as is." Starks Global Group makes no warranties regarding uptime, AI output accuracy, or fitness for a particular purpose. We are not liable for business losses, lost revenue, or indirect damages arising from your use of AI-generated systems or third-party tool recommendations. You assume full responsibility for how you implement and operate any system built using this platform.</p>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-foreground mb-4 text-shadow-sm">9. Changes to Terms</h2>
                <p>We reserve the right to modify these Terms at any time. Continued use of the platform after changes constitutes acceptance of the revised terms. Material changes will be communicated via email to registered users at least 14 days before taking effect.</p>
              </div>

              <div className="bg-primary/10 backdrop-blur-md p-8 rounded-2xl border border-primary/20 mt-12 shadow-inner">
                <h2 className="text-xl font-bold text-foreground mb-4 text-shadow-sm">Contact Information</h2>
                <p>If you have any questions about these Terms, please contact us at:</p>
                <p className="font-mono text-primary font-bold text-shadow-sm mt-2">contact@starksglobalgroup.net</p>
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
