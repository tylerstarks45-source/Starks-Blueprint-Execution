
import React from 'react';
import { Helmet } from 'react-helmet';
import CanonicalUrl from '@/components/CanonicalUrl.jsx';
import Header from '@/components/Header.jsx';
import Footer from '@/components/Footer.jsx';
import { ShieldCheck } from 'lucide-react';
import VideoBackground from '@/components/VideoBackground.jsx';

const PrivacyPolicy = () => {
  return (
    <VideoBackground>
      <CanonicalUrl />
      <Helmet>
        <title>Privacy Policy | Starks Global Group</title>
        <meta name="description" content="How we collect, use, and protect your data at Starks Global Group." />
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
            <p className="text-sm font-mono text-zinc-300 mb-12 uppercase font-bold text-shadow-sm">Last Updated: June 3, 2026</p>

            <div className="prose prose-invert max-w-none text-zinc-200 font-medium space-y-8">
              <p className="text-lg leading-relaxed text-shadow-sm">
                At Starks Global Group ("we," "us," or "our"), we are committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use the Starks Blueprint Execution Platform (SBEP) and related services at starksglobalgroup.net.
              </p>

              <hr className="border-white/10 my-8" />

              <div>
                <h2 className="text-2xl font-bold text-foreground mb-4 text-shadow-sm">1. Data We Collect</h2>
                <p className="mb-4">We collect information you voluntarily provide and data generated through your use of the platform:</p>
                <ul className="list-disc pl-6 space-y-2 mb-6">
                  <li><strong>Account Data:</strong> Name, email address, and hashed password upon registration.</li>
                  <li><strong>Subscription & Billing Data:</strong> Subscription tier (Free, Builder, Operator, Empire), billing history, and payment processing data handled by Stripe, Inc. We do not store full card numbers — Stripe handles all payment data under their PCI-DSS compliance.</li>
                  <li><strong>Platform Activity:</strong> AI systems you create, blueprints you select, tools you add to your stack, and credit usage history.</li>
                  <li><strong>AI Interaction Data:</strong> Prompts and goals you submit to the AI system builder. These may be processed by OpenRouter (openrouter.ai) to generate system recommendations. We send only the content necessary to produce your result.</li>
                  <li><strong>Authentication Tokens:</strong> A JSON Web Token (JWT) is stored in your browser's localStorage to maintain your session. This token expires after 7 days.</li>
                  <li><strong>Usage Metadata:</strong> Page views, feature interactions, and error logs used for platform improvement. We do not sell this data.</li>
                </ul>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-foreground mb-4 text-shadow-sm">2. How We Use Your Data</h2>
                <ul className="list-disc pl-6 space-y-2">
                  <li>To operate your account and deliver platform services.</li>
                  <li>To process subscription payments and credit purchases via Stripe.</li>
                  <li>To power the AI system builder using your submitted goals via OpenRouter.</li>
                  <li>To send transactional emails (account verification, password reset, billing receipts) via Resend.</li>
                  <li>To respond to contact form submissions sent to our team.</li>
                  <li>To improve and secure the platform based on usage patterns.</li>
                </ul>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-foreground mb-4 text-shadow-sm">3. Third-Party Services</h2>
                <p className="mb-4">The following third-party services process data on our behalf:</p>
                <ul className="list-disc pl-6 space-y-3">
                  <li><strong>Stripe</strong> — Payment processing and subscription billing. Subject to Stripe's Privacy Policy at stripe.com/privacy.</li>
                  <li><strong>OpenRouter</strong> — AI model routing for the system builder. Your prompts are transmitted to OpenRouter's infrastructure to generate responses. Subject to OpenRouter's terms at openrouter.ai.</li>
                  <li><strong>Resend</strong> — Transactional email delivery. Your email address is used to send you account and system emails. Subject to Resend's Privacy Policy at resend.com/legal/privacy-policy.</li>
                </ul>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-foreground mb-4 text-shadow-sm">4. Data Retention</h2>
                <p>We retain your account data for as long as your account is active. If you delete your account, your personal data is removed within 30 days, except where retention is required by law (e.g., billing records). AI interaction logs may be retained in anonymized form for model improvement.</p>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-foreground mb-4 text-shadow-sm">5. Your Rights</h2>
                <p className="mb-4">You have the right to:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Access the personal data we hold about you.</li>
                  <li>Request correction of inaccurate data.</li>
                  <li>Request deletion of your account and associated data.</li>
                  <li>Opt out of non-transactional communications at any time.</li>
                </ul>
                <p className="mt-4">To exercise any of these rights, contact us at the address below.</p>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-foreground mb-4 text-shadow-sm">6. Security</h2>
                <p>We implement industry-standard security measures including bcrypt password hashing, JWT-based authentication with expiry, HTTPS-only data transmission, and rate limiting on authentication endpoints. No method of transmission over the internet is 100% secure, and we cannot guarantee absolute security.</p>
              </div>

              <div>
                <h2 className="text-2xl font-bold text-foreground mb-4 text-shadow-sm">7. Cookies & Local Storage</h2>
                <p>We use browser localStorage to store your authentication JWT. We do not use third-party tracking cookies for advertising. Essential session data may be stored in cookies to maintain your logged-in state.</p>
              </div>

              <div className="bg-primary/10 backdrop-blur-md p-8 rounded-2xl border border-primary/20 mt-12 shadow-inner">
                <h2 className="text-xl font-bold text-foreground mb-4 text-shadow-sm">Contact for Privacy Concerns</h2>
                <p className="mb-2">If you have questions or comments about this Privacy Policy, please contact us at:</p>
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

export default PrivacyPolicy;
