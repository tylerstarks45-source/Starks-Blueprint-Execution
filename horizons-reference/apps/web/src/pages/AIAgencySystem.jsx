import React from 'react';
import { Layers } from 'lucide-react';
import SystemDetailTemplate from '@/components/SystemDetailTemplate.jsx';

const AIAgencySystem = () => {
  const tools = [
    {
      name: "Syllaby AI",
      purpose: "Content Research & Strategy",
      explanation: "Discovers exactly what your target audience is searching for online. Eliminates guesswork by providing data-backed, viral content topics.",
      affiliate_link: "https://syllaby.io/?via=tyler73",
      image: "https://images.unsplash.com/photo-1611339555312-e607c25352ba?w=500&h=300&fit=crop"
    },
    {
      name: "Magai",
      purpose: "AI Script Copywriting",
      explanation: "Generates highly engaging, hook-driven video scripts based on your Syllaby research. Ensures your videos capture attention in the first 3 seconds.",
      affiliate_link: "https://magai.co",
      image: "https://images.unsplash.com/photo-1455390582262-044cdead2708?auto=format&fit=crop&w=800&q=80"
    },
    {
      name: "Vidfly AI",
      purpose: "Faceless Video Generation",
      explanation: "Transforms your text scripts into professional, ready-to-post short-form videos complete with AI voiceovers, dynamic captions, and background footage.",
      affiliate_link: "https://vidfly.ai/?ref=yti5zjv",
      image: "https://images.unsplash.com/photo-1682056598904-9aa7ea5e8991?auto=format&fit=crop&w=800&q=80"
    },
    {
      name: "Make.com",
      purpose: "Workflow Automation",
      explanation: "Connects your cloud storage to your social media accounts, allowing you to automatically publish your generated videos on a set schedule.",
      affiliate_link: "https://make.com",
      image: "https://images.unsplash.com/photo-1648134859211-4a1b57575f4e?auto=format&fit=crop&w=800&q=80"
    }
  ];

  const workflow = [
    { phase: "Research", tool: "Syllaby AI", time: "15 mins", description: "Identify high-volume, low-competition questions in your niche." },
    { phase: "Scripting", tool: "Magai", time: "10 mins", description: "Write engaging, hook-heavy scripts optimized for short-form video." },
    { phase: "Production", tool: "Vidfly AI", time: "20 mins", description: "Generate faceless videos with AI voiceovers and captions." },
    { phase: "Distribution", tool: "Social Media", time: "Automated", description: "Publish videos to TikTok, Reels, and Shorts to drive traffic." },
    { phase: "Monetization", tool: "Affiliate Links", time: "Passive", description: "Viewers click your bio link and purchase affiliate offers." }
  ];

  const instructions = [
    {
      title: "Create Required Accounts",
      location: "Various Platforms",
      action: "Sign Up",
      details: "1. Sign up for the core stack: Magai, Syllaby AI, Vidfly AI, and Make.com.\n2. Register for an affiliate network relevant to your niche (e.g., ClickBank, Impact, PartnerStack, or Amazon Associates).\n3. Create fresh, niche-specific social media accounts on TikTok, Instagram, and YouTube.",
      expectedOutput: "All necessary software and social accounts are active and ready for content."
    },
    {
      title: "Find Viral Content Ideas",
      location: "Syllaby AI",
      action: "Search Topics",
      whatToType: "Enter your broad niche keyword (e.g., 'Personal Finance', 'Dog Training', or 'SaaS Tools').",
      details: "1. Review the list of questions people are actively searching for online.\n2. Select 5-10 topics that show high search volume but low competition.\n3. Save these topics to your content calendar for the week.",
      expectedOutput: "A list of 5-10 proven, data-backed video topics that your audience actually wants to see."
    },
    {
      title: "Write Engaging Video Scripts",
      location: "Magai",
      action: "New Chat",
      whatToType: "Write a 45-second viral TikTok script answering this question: [Insert Syllaby Topic]. Start with a controversial or highly engaging hook. End with a call-to-action telling them to check the link in my bio.",
      details: "1. Paste your Syllaby topics into Magai one by one.\n2. Refine the generated scripts to ensure they sound conversational and punchy.\n3. Keep sentences relatively short so the on-screen captions look clean.",
      expectedOutput: "Completed text scripts ready to be turned into videos."
    },
    {
      title: "Generate Faceless Videos",
      location: "Vidfly AI",
      action: "Text to Video",
      details: "1. Paste your Magai script into the Vidfly AI prompt box.\n2. Select a realistic, engaging AI voiceover that fits your niche's tone.\n3. Choose background footage style (or let the AI auto-select based on context).\n4. Enable dynamic, Alex Hormozi-style captions.\n5. Generate and download the final MP4 file.",
      expectedOutput: "Professional, ready-to-post short-form videos saved to your computer."
    },
    {
      title: "Publish to Social Media",
      location: "TikTok / IG / YouTube",
      action: "Upload Video",
      details: "1. Upload your downloaded videos natively to TikTok, Instagram Reels, and YouTube Shorts.\n2. Add 3-5 relevant hashtags and a brief, keyword-rich description.\n3. Post consistently (1-2 times per day) to trigger algorithmic growth and build an audience.",
      expectedOutput: "Videos are live on all major platforms and accumulating organic views."
    },
    {
      title: "Monetize with Affiliate Links",
      location: "Social Media Profiles",
      action: "Edit Profile",
      details: "1. Get your unique tracking link for the product you are promoting from your affiliate network.\n2. Use a link shortener or link-in-bio tool (like Bitly or Linktree) to make it look clean.\n3. Place this link in your TikTok, Instagram, and YouTube bios.\n4. Ensure your video scripts always point viewers to this link.",
      expectedOutput: "A clear, clickable path for viewers to purchase your recommended products."
    },
    {
      title: "Optional: Automate the Posting Process",
      location: "Make.com",
      action: "Create Scenario",
      details: "1. Connect a Google Drive folder to Make.com.\n2. Connect your social media accounts (Instagram for Business, YouTube, etc.).\n3. Set up a trigger: 'When a new video file is added to the Drive folder, automatically post it to my social accounts'.\n4. Turn the scenario ON.",
      expectedOutput: "A fully automated pipeline that publishes your videos while you sleep."
    }
  ];

  const monetization = [
    "Affiliate Commissions: Earn $20-$100+ per sale by promoting software, courses, or physical products in your niche. This is your primary revenue engine.",
    "Platform Creator Funds: Once you hit 10,000 followers, you can earn ad revenue directly from TikTok and YouTube based purely on your video views.",
    "Brand Sponsorships: Companies will pay you fixed rates ($100-$500+ per dedicated video) to feature their products once you have an established, engaged audience."
  ];

  const checklist = [
    "All tool accounts created (Magai, Syllaby, Vidfly, Make)",
    "Affiliate network accounts created and tracking links secured",
    "First 5 content ideas researched and saved in Syllaby",
    "5 engaging video scripts generated and refined in Magai",
    "5 faceless videos created and downloaded from Vidfly AI",
    "Social media profiles optimized with bio links",
    "First video successfully posted to all platforms"
  ];

  return (
    <SystemDetailTemplate
      slug="ai-agency"
      title="AI Affiliate Content Engine"
      subtitle="Build a faceless, automated traffic machine that generates affiliate commissions."
      icon={Layers}
      description="Deploy a complete content ecosystem that requires zero camera time. Use AI to find viral topics, write scripts, generate faceless videos, and drive massive organic traffic to high-paying affiliate offers."
      revenueModel="Affiliate Commissions & Ad Revenue"
      automationLevel="High"
      bestFor="Affiliate Marketers & Faceless Creators"
      tools={tools}
      instructions={instructions}
      workflow={workflow}
      monetization={monetization}
      checklist={checklist}
    />
  );
};

export default AIAgencySystem;