import React from 'react';
import { Layers } from 'lucide-react';
import SystemDetailTemplate from '@/components/SystemDetailTemplate.jsx';

const System05DetailPage = () => {
  const tools = [
    {
      name: "DigiMember",
      purpose: "Membership Protection",
      explanation: "Locks your content behind a paywall and handles the subscription management on your site.",
      affiliate_link: "https://digimember.com",
      image: "https://images.unsplash.com/photo-1499951360447-b19be8fe80f5?auto=format&fit=crop&w=800&q=80"
    },
    {
      name: "AI Book Writer",
      purpose: "Digital Product Creation",
      explanation: "Used to rapidly generate the core curriculum, guides, and written content for your membership site.",
      affiliate_link: "https://aibookwriter.com",
      image: "https://images.unsplash.com/photo-1455390582262-044cdead2708?auto=format&fit=crop&w=800&q=80"
    }
  ];

  const workflow = [
    { phase: "Product Creation", tool: "AI Book Writer", time: "2 hours", description: "Generate core guides and resources." },
    { phase: "Site Setup", tool: "WordPress", time: "2 hours", description: "Install theme and basic pages." },
    { phase: "Protection", tool: "DigiMember", time: "1 hour", description: "Lock content and connect payment gateway." },
    { phase: "Launch", tool: "Automated", time: "Ongoing", description: "Collect recurring subscription revenue." }
  ];

  const instructions = [
    {
      title: "Generate Premium Content",
      location: "AI Book Writer",
      action: "Create Project",
      details: "Generate comprehensive guides, cheat sheets, and resources for your niche. Download these as PDFs. This forms the 'vault' of your membership site.",
      expectedOutput: "3-5 high-value digital resources."
    },
    {
      title: "Configure Membership Tiers",
      location: "WordPress Dashboard",
      action: "DigiMember > Products",
      details: "Create a new product (e.g., 'Inner Circle'). Set the pages containing your PDFs to be protected and only accessible to users with the 'Inner Circle' product.",
      expectedOutput: "Content is successfully locked behind a paywall."
    },
    {
      title: "Connect Payment Gateway",
      location: "DigiMember Settings",
      action: "Payment Providers",
      details: "Connect Stripe or PayPal. Create a recurring subscription plan (e.g., $29/month). Map the successful payment to grant access to the 'Inner Circle' product in DigiMember.",
      expectedOutput: "A functional checkout page that automatically creates user accounts upon payment."
    }
  ];

  const monetization = [
    "Recurring Monthly Revenue (MRR): Charge a monthly fee for continuous access to the vault and community.",
    "Annual Upfront: Offer a discount for yearly billing to secure cash flow upfront."
  ];

  const checklist = [
    "Premium content generated and uploaded",
    "DigiMember plugin installed and activated",
    "Content pages successfully protected",
    "Stripe/PayPal connected for recurring billing",
    "Test transaction completed and access verified"
  ];

  return (
    <SystemDetailTemplate
      slug="system-05"
      title="Recurring Revenue Vault"
      subtitle="Build a subscription membership site with AI-generated premium content."
      icon={Layers}
      description="Create a predictable recurring revenue stream. Generate high-value digital resources using AI, host them on your own site, and lock them behind a paid membership wall."
      revenueModel="Subscription (MRR)"
      automationLevel="Medium Setup, High Passive"
      bestFor="Educators, Creators, Experts"
      tools={tools}
      instructions={instructions}
      workflow={workflow}
      monetization={monetization}
      checklist={checklist}
    />
  );
};

export default System05DetailPage;