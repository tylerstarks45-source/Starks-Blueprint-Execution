
import React from 'react';
import PageMeta from '@/components/PageMeta.jsx';
import Header from '@/components/Header.jsx';
import Footer from '@/components/Footer.jsx';
import { motion } from 'framer-motion';
import { ArrowRight, Beaker } from 'lucide-react';
import VideoBackground from '@/components/VideoBackground.jsx';

const articles = [
  {
    title: 'Best AI Video Tools (Tested & Compared)',
    summary: 'We tested the top AI video generators to see which ones actually produce usable content for marketing and social media.',
    audience: 'Content Creators, Marketers',
    takeaway: 'Most tools fail at consistency, but a select few are ready for production.'
  },
  {
    title: 'Top Funnel Builders for Conversions',
    summary: 'A deep dive into the funnel builders that offer the best speed, flexibility, and integration capabilities for modern campaigns.',
    audience: 'Agency Owners, Affiliates',
    takeaway: 'Speed and native integrations matter more than flashy templates.'
  },
  {
    title: 'Best Email Automation Tools for Beginners',
    summary: 'Comparing email platforms based on deliverability, ease of use, and automation logic capabilities.',
    audience: 'Beginners, Small Businesses',
    takeaway: 'Start simple, but ensure the tool has tagging and branching logic.'
  },
  {
    title: "We Tested 5 AI Tools — Here's What Actually Works",
    summary: 'An honest breakdown of 5 trending AI tools. We reveal which ones are hype and which ones actually save time.',
    audience: 'Entrepreneurs, Operators',
    takeaway: 'Only 2 out of 5 tools provided measurable ROI in our tests.'
  },
  {
    title: 'Best Automation Platforms for Scaling',
    summary: 'Evaluating Zapier, Make, and custom solutions for handling complex, multi-step business workflows.',
    audience: 'Operations Managers, Agencies',
    takeaway: 'Make offers better visual routing for complex, multi-branch systems.'
  },
  {
    title: 'Beginner AI Stack (What You Actually Need)',
    summary: 'Cut through the noise. Here is the minimal, essential AI software stack needed to start automating your business today.',
    audience: 'Beginners, Solopreneurs',
    takeaway: 'You only need 3 core tools to automate 80% of standard workflows.'
  }
];

const ResearchLabPage = () => {
  return (
    <VideoBackground>
      <PageMeta
        title="Research & Testing Lab | Starks Global Group"
        description="We test, compare, and break down AI tools so you know what actually works."
      />
      <Header />
      <main className="flex-grow pt-32 pb-24 bg-background/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
          <section className="text-center mb-20">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/20 backdrop-blur-md text-primary mb-6 shadow-lg border border-primary/30">
              <Beaker className="w-8 h-8" />
            </div>
            <h1 className="text-4xl md:text-6xl font-extrabold text-foreground mb-6 tracking-tight text-shadow-lg">
              Research & Testing Lab
            </h1>
            <p className="text-xl md:text-2xl text-zinc-100 max-w-3xl mx-auto mb-6 text-shadow-md font-medium">
              We test, compare, and break down AI tools so you know what actually works.
            </p>
            <p className="text-lg text-primary font-bold max-w-2xl mx-auto bg-card/80 backdrop-blur-md border border-white/10 rounded-xl p-4 shadow-lg text-shadow-sm">
              We do not list random tools. Every tool on this platform is tested inside real automation systems.
            </p>
          </section>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {articles.map((article, idx) => (
              <motion.div 
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                className="bg-card/80 backdrop-blur-xl border border-white/20 p-8 rounded-2xl flex flex-col h-full hover:border-primary/60 transition-all shadow-xl group cursor-pointer"
              >
                <h3 className="text-2xl font-bold text-foreground mb-4 group-hover:text-primary transition-colors text-shadow-sm">
                  {article.title}
                </h3>
                <p className="text-zinc-200 mb-6 flex-grow font-medium">
                  {article.summary}
                </p>
                <div className="space-y-3 mb-8 pt-6 border-t border-white/10">
                  <div>
                    <span className="text-xs font-mono text-primary uppercase tracking-wider block mb-1 font-bold text-shadow-sm">Who it's for</span>
                    <span className="text-sm text-foreground font-bold">{article.audience}</span>
                  </div>
                  <div>
                    <span className="text-xs font-mono text-primary uppercase tracking-wider block mb-1 font-bold text-shadow-sm">Key takeaway</span>
                    <span className="text-sm text-foreground font-bold">{article.takeaway}</span>
                  </div>
                </div>
                <div className="mt-auto flex items-center text-primary font-bold text-sm bg-primary/10 rounded-lg p-3 justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  Read Full Report <ArrowRight className="w-4 h-4 ml-2" />
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </VideoBackground>
  );
};

export default ResearchLabPage;
