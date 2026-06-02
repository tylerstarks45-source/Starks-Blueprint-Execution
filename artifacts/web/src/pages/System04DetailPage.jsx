import React from 'react';
import { Layers } from 'lucide-react';
import SystemDetailTemplate from '@/components/SystemDetailTemplate.jsx';

const System04DetailPage = () => {
  const tools = [
    {
      name: "Fast SEO Hub",
      purpose: "SEO Analytics & Audits",
      explanation: "Used to identify technical errors and discover high-traffic keywords you can easily rank for.",
      affiliate_link: "https://fastseohub.com",
      image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=800&q=80"
    },
    {
      name: "Magai",
      purpose: "SEO Content Generation",
      explanation: "Writes highly optimized, long-form blog articles based on the keywords found in the SEO tool.",
      affiliate_link: "https://magai.co",
      image: "https://images.unsplash.com/photo-1455390582262-044cdead2708?auto=format&fit=crop&w=800&q=80"
    }
  ];

  const workflow = [
    { phase: "Audit", tool: "Fast SEO Hub", time: "30 mins", description: "Fix site errors preventing ranking." },
    { phase: "Keyword Discovery", tool: "Fast SEO Hub", time: "1 hour", description: "Find low KD, high volume keywords." },
    { phase: "Content Creation", tool: "Magai", time: "30 mins", description: "Generate SEO-optimized articles." },
    { phase: "Publishing", tool: "CMS", time: "Weekly", description: "Publish to capture organic traffic." }
  ];

  const instructions = [
    {
      title: "Run Technical Site Audit",
      location: "Fast SEO Hub",
      action: "Site Audit",
      whatToType: "Enter your domain URL.",
      details: "Review the generated report. Fix critical errors like broken links (404s), missing H1 tags, and slow page speeds.",
      expectedOutput: "A clean, technically sound website ready for traffic."
    },
    {
      title: "Discover Keyword Opportunities",
      location: "Fast SEO Hub",
      action: "Keyword Research",
      details: "Look for keywords with a Keyword Difficulty (KD) under 30 and Search Volume over 500. Export a list of 10 target keywords.",
      expectedOutput: "A prioritized list of 10 keywords to target this month."
    },
    {
      title: "Generate Optimized Articles",
      location: "Magai",
      action: "New Chat",
      whatToType: "Write a comprehensive, 1500-word blog post optimized for the keyword '[Target Keyword]'. Use clear H2 and H3 headings. Include an FAQ section at the bottom.",
      details: "Review the content. Ensure the keyword is in the Title, the first paragraph, and a few subheadings. Publish to your blog.",
      expectedOutput: "A published, SEO-optimized blog post."
    }
  ];

  const monetization = [
    "Organic Lead Generation: Free traffic converts into email subscribers or direct leads.",
    "Ad Revenue: Monetize the blog traffic with Mediavine or Google AdSense.",
    "Affiliate Links: Embed affiliate links contextually within the articles."
  ];

  const checklist = [
    "Technical SEO errors fixed",
    "List of 10 low-competition keywords generated",
    "First optimized article generated in Magai",
    "Article published with correct H1/H2 tags",
    "Rank tracking set up in Fast SEO Hub"
  ];

  return (
    <SystemDetailTemplate
      slug="system-04"
      title="Automated Organic Traffic Engine"
      subtitle="Capture high-intent search traffic with AI-optimized content."
      icon={Layers}
      description="Stop relying on paid ads. Use analytics to find hidden keyword opportunities, and use AI to generate comprehensive, SEO-optimized articles that rank on Google and drive free traffic."
      revenueModel="Organic Traffic / Ads / Affiliates"
      automationLevel="Medium"
      bestFor="Bloggers & Content Marketers"
      tools={tools}
      instructions={instructions}
      workflow={workflow}
      monetization={monetization}
      checklist={checklist}
    />
  );
};

export default System04DetailPage;