import React from 'react';
import { Layers } from 'lucide-react';
import SystemDetailTemplate from '@/components/SystemDetailTemplate.jsx';

const AffiliateSystem = () => {
  const tools = [
    {
      name: "Systeme.io",
      purpose: "Bridge Page & Email",
      explanation: "Used to create a bridge page to collect emails before sending traffic to the affiliate offer. Crucial for building your own asset.",
      affiliate_link: "https://systeme.io",
      image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=800&q=80"
    },
    {
      name: "Pollo AI",
      purpose: "Traffic Generation",
      explanation: "Used to create viral, faceless video ads and organic content to drive clicks to your bridge page.",
      affiliate_link: "https://pollo.ai?ref=ztbhnmj",
      image: "https://images.unsplash.com/photo-1696389500310-cd6d247cb609?auto=format&fit=crop&w=800&q=80"
    }
  ];

  const workflow = [
    { phase: "Content", tool: "Pollo AI", time: "20 mins", description: "Generate hook-heavy videos promoting the outcome." },
    { phase: "Capture", tool: "Systeme.io", time: "Automated", description: "Viewer clicks link, enters email on bridge page." },
    { phase: "Redirect", tool: "Affiliate Link", time: "Instant", description: "User is forwarded to the affiliate sales page." },
    { phase: "Follow-up", tool: "Systeme.io", time: "Automated", description: "Email sequence follows up to secure the sale." }
  ];

  const instructions = [
    {
      title: "Build the Bridge Page",
      location: "Systeme.io",
      action: "Create Funnel",
      details: "Create a 1-page opt-in. Headline should match the affiliate offer's promise. 'Enter email to see the video/software'. Set the form action to 'Send email AND Redirect to URL'. Put your affiliate link as the redirect URL.",
      expectedOutput: "A live page that captures emails and forwards to your affiliate link."
    },
    {
      title: "Write Follow-up Sequence",
      location: "Systeme.io",
      action: "Emails > Campaigns",
      details: "Create a 3-day email campaign. Day 1: 'Here is the link you requested' (link to affiliate offer). Day 2: 'Did you see this feature?' (highlight a benefit). Day 3: Urgency/Testimonial.",
      expectedOutput: "An active campaign linked to your bridge page form."
    },
    {
      title: "Drive Traffic",
      location: "Pollo AI",
      action: "Generate Video",
      details: "Create vertical videos showcasing the problem the affiliate software solves. Do not mention the software name in the video—create curiosity so they click the link in your bio.",
      expectedOutput: "Videos posted to TikTok/Shorts driving clicks."
    }
  ];

  const monetization = [
    "Primary Affiliate Commissions: Earn 30-50% recurring commissions on software referrals.",
    "List Monetization: Now that you own the email list, you can broadcast related affiliate offers to them later."
  ];

  const checklist = [
    "Affiliate links secured and copied",
    "Systeme.io bridge page built and tested",
    "Redirect verified working",
    "3-day email sequence active",
    "First traffic videos posted"
  ];

  return (
    <SystemDetailTemplate
      slug="affiliate-machine"
      title="The Affiliate Machine"
      subtitle="Build an asset while promoting other people's products."
      icon={Layers}
      description="Never send traffic directly to an affiliate link. This system uses AI to drive traffic to a bridge page, captures the email to build your list, and then redirects them to the offer while following up automatically."
      revenueModel="Affiliate Commissions"
      automationLevel="High"
      bestFor="Affiliate Marketers"
      tools={tools}
      instructions={instructions}
      workflow={workflow}
      monetization={monetization}
      checklist={checklist}
    />
  );
};

export default AffiliateSystem;