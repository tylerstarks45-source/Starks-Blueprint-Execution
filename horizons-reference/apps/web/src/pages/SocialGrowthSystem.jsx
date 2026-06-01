import React from 'react';
import { Layers } from 'lucide-react';
import SystemDetailTemplate from '@/components/SystemDetailTemplate.jsx';

const SocialGrowthSystem = () => {
  const tools = [
    {
      name: "Syllaby AI",
      purpose: "Viral Script & Video Gen",
      explanation: "Finds trending topics in your niche, writes the scripts, and generates the videos using AI avatars.",
      affiliate_link: "https://syllaby.io/?via=tyler73",
      image: "https://images.unsplash.com/photo-1611339555312-e607c25352ba?w=500&h=300&fit=crop"
    },
    {
      name: "Predis.ai",
      purpose: "Social Scheduling",
      explanation: "Takes the generated content and automatically schedules and posts it across Instagram, TikTok, and YouTube.",
      affiliate_link: "https://predis.ai",
      image: "https://images.unsplash.com/photo-1611162617474-5b21e879e113?auto=format&fit=crop&w=800&q=80"
    }
  ];

  const workflow = [
    { phase: "Topic Research", tool: "Syllaby AI", time: "15 mins", description: "Identify high-search, low-competition keywords." },
    { phase: "Content Gen", tool: "Syllaby AI", time: "10 mins", description: "Generate scripts and AI avatar videos." },
    { phase: "Scheduling", tool: "Predis.ai", time: "15 mins", description: "Load videos into the calendar for the week." },
    { phase: "Growth", tool: "Social Platforms", time: "Automated", description: "Consistent posting triggers algorithmic growth." }
  ];

  const instructions = [
    {
      title: "Discover Viral Topics",
      location: "Syllaby AI",
      action: "Search Topics",
      whatToType: "Enter your broad industry keyword (e.g., 'Real Estate Investing').",
      details: "Look for questions that have high search volume but low competition. Add 5-10 of these to your content calendar in Syllaby.",
      expectedOutput: "A list of proven topics your audience is actively searching for."
    },
    {
      title: "Generate AI Avatar Videos",
      location: "Syllaby AI",
      action: "Content > Generate Video",
      details: "Select a topic. Let the AI write the script. Choose an AI avatar and voice that fits your brand. Review the script and click 'Generate Video'.",
      expectedOutput: "Completed MP4 videos featuring an AI spokesperson delivering the script."
    },
    {
      title: "Schedule the Content",
      location: "Predis.ai",
      action: "Content Calendar",
      whatToClick: "Create Post > Upload Video",
      details: "Upload the videos from Syllaby. Connect your TikTok, Instagram, and YouTube accounts. Schedule one video per day at optimal times.",
      expectedOutput: "A fully scheduled week of social media content."
    }
  ];

  const monetization = [
    "Brand Deals: As your audience grows, charge for sponsored posts.",
    "Link in Bio: Drive traffic to an affiliate link or lead magnet.",
    "Platform Payouts: Earn directly from YouTube Shorts monetization."
  ];

  const checklist = [
    "Syllaby connected and topics researched",
    "First 7 videos generated and downloaded",
    "Predis.ai accounts connected (IG, TikTok, YT)",
    "7 videos scheduled in Predis.ai calendar",
    "Link in bio configured on all platforms"
  ];

  return (
    <SystemDetailTemplate
      slug="social-growth"
      title="Social Growth System"
      subtitle="Automated viral content creation and scheduling."
      icon={Layers}
      description="Scale your social media presence without being on camera. Use AI to find trending topics, generate avatar-led videos, and schedule them across all major platforms."
      revenueModel="Audience Monetization"
      automationLevel="High"
      bestFor="Creators & Faceless Brands"
      tools={tools}
      instructions={instructions}
      workflow={workflow}
      monetization={monetization}
      checklist={checklist}
    />
  );
};

export default SocialGrowthSystem;