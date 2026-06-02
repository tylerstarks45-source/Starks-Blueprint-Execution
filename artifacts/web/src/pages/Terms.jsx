import React from 'react';
import { Helmet } from 'react-helmet';
import Header from '@/components/Header.jsx';
import Footer from '@/components/Footer.jsx';
import { Scale } from 'lucide-react';

const Terms = () => {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Helmet>
        <title>Terms & Conditions | Starks Global Group</title>
        <meta name="description" content="Terms of service and conditions for using Starks Global Group." />
      </Helmet>
      
      <Header />
      
      <main className="flex-grow pt-32 pb-24">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-4xl">
          <div className="bg-card border border-border rounded-2xl p-8 md:p-12 shadow-lg">
            <div className="flex items-center gap-3 mb-6">
              <Scale className="w-8 h-8 text-primary" />
              <span className="text-sm font-mono text-primary uppercase tracking-widest block">Legal Compliance</span>
            </div>

            <h1 className="text-4xl md:text-5xl font-extrabold text-foreground mb-4 tracking-tight">Terms & Conditions</h1>
            <p className="text-sm font-mono text-muted-foreground mb-12 uppercase">Last Updated: April 11, 2026</p>

            <div className="prose prose-invert max-w-none text-muted-foreground space-y-8">
              <p className="text-lg leading-relaxed font-medium text-foreground/80">
                These Terms and Conditions constitute a legally binding agreement made between you, whether personally or on behalf of an entity ("you") and Starks Global Group ("we," "us" or "our"), concerning your access to and use of our platform, blueprints, and software recommendations.
              </p>

              <hr className="border-border my-8" />

              <div>
                <h2 className="text-2xl font-bold text-foreground mb-4">1. Platform Usage Rules & Restrictions</h2>
                <p className="mb-4">By accessing the platform, you agree to use it only for lawful purposes. You agree NOT to:</p>
                <ul className="list-disc pl-6 space-y-2 mb-6">
                  <li>Systematically retrieve data or content to create a collection, database, or directory without written permission.</li>
                  <li>Circumvent, disable, or interfere with security-related features of the platform.</li>
                  <li>Use the platform or our system blueprints to engage in illegal, fraudulent, or malicious business practices.</li>
                  <li>Attempt to access unauthorized portions of the database or other user accounts.</li>
                </ul>
              </div>

              <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-6 mb-8">
                <h2 className="text-xl font-bold text-amber-500 mb-3">2. No Guarantees of Financial Results</h2>
                <p className="text-amber-500/90 font-medium">
                  Starks Global Group provides educational frameworks, tool recommendations, and system architectures. We make absolutely no guarantees of financial results, income generation, or specific business outcomes. Your success depends entirely on your own execution, market conditions, effort, and skill level. Automation tools facilitate workflows; they do not guarantee profit.
                </p>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-foreground mb-4">3. Limitation of Liability</h2>
                <p className="mb-4">
                  In no event will we or our directors, employees, or agents be liable to you or any third party for any direct, indirect, consequential, exemplary, incidental, special, or punitive damages, including lost profit, lost revenue, loss of data, or other damages arising from your use of the site, implementation of our blueprints, or usage of third-party tools recommended on our platform. All software usage is at your own risk.
                </p>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-foreground mb-4">4. User Responsibilities</h2>
                <p className="mb-4">As a user of this platform, you are responsible for:</p>
                <ul className="list-disc pl-6 space-y-2 mb-6">
                  <li>Maintaining the confidentiality of your account credentials.</li>
                  <li>Verifying the pricing, terms, and capabilities of any third-party software before purchasing or integrating it.</li>
                  <li>Ensuring your use of automation systems complies with local laws, CAN-SPAM, GDPR, and platform-specific terms of service (e.g., social media network rules).</li>
                </ul>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-foreground mb-4">5. Intellectual Property Rights</h2>
                <p className="mb-4">
                  The Site is our proprietary property. All source code, databases, functionality, software, website designs, audio, video, text, photographs, system blueprints, and graphics on the Site (collectively, the "Content") are owned or controlled by us and are protected by copyright and trademark laws. You may utilize the blueprints to build systems for your own business, but you may not resell, redistribute, or white-label our Content as your own.
                </p>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-foreground mb-4">6. Termination of Service</h2>
                <p className="mb-4">
                  We reserve the right to suspend or terminate your account and block access to the platform without prior notice if you violate these Terms and Conditions, engage in fraudulent activity, or utilize our platform in a manner that harms our reputation or the integrity of our systems.
                </p>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-foreground mb-4">7. Dispute Resolution</h2>
                <p className="mb-4">
                  These Terms shall be governed by and defined following the laws of the jurisdiction in which Starks Global Group is established. You irrevocably consent that the courts of that jurisdiction shall have exclusive jurisdiction to resolve any dispute which may arise in connection with these terms.
                </p>
              </div>

              <div className="bg-secondary/30 p-8 rounded-xl border border-border mt-12">
                <p className="mb-2">For legal inquiries regarding these terms, contact us at:</p>
                <p className="font-mono text-primary">contact@starksglobalgroup.com</p>
              </div>
            </div>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default Terms;