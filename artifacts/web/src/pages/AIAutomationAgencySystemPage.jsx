import React from 'react';
import BlueprintDetailTemplate from '@/components/BlueprintDetailTemplate.jsx';

const AIAutomationAgencySystemPage = () => {
  const blueprintData = {
    name: 'AI Automation Agency System',
    headline: 'AI AUTOMATION AGENCY SYSTEM',
    subheadline: 'Build a highly profitable, automated AI service business that delivers massive value to clients while running on autopilot. Note: This system utilizes external tools and is not built directly on the Starks platform.',
    incomeRange: '$5,000–$50,000+/month',
    launchTime: '6–12 Hours',
    skillLevel: 'Advanced',
    
    howItWorks: [
      {
        title: 'Content Generation',
        description: 'AI creates marketing assets and outreach materials automatically.'
      },
      {
        title: 'Lead Capture',
        description: 'Optimized funnels convert incoming traffic into qualified leads.'
      },
      {
        title: 'Lead Nurture',
        description: 'Automated email and SMS sequences warm up prospects.'
      },
      {
        title: 'Sales Conversion',
        description: 'AI chatbots qualify leads and book appointments directly to your calendar.'
      },
      {
        title: 'Client Onboarding',
        description: 'Automated workflows handle contracts, invoices, and intake forms.'
      },
      {
        title: 'Service Delivery',
        description: 'AI agents and automated pipelines perform the core service fulfillment.'
      },
      {
        title: 'Support',
        description: 'CustomGPT handles routine client queries and support tickets 24/7.'
      },
      {
        title: 'Billing',
        description: 'Automated recurring invoicing ensures consistent cash flow.'
      },
      {
        title: 'Reporting',
        description: 'Automated performance dashboards keep clients updated on results.'
      }
    ],

    toolStack: [
      {
        name: 'GoHighLevel',
        description: 'Agency CRM & Funnels',
        whyNeeded: 'The core operating system for your agency and clients. Replaces 10+ tools.',
        link: 'https://www.gohighlevel.com/?fp_ref=t04hj'
      },
      {
        name: 'Make.com',
        description: 'Workflow Automation',
        whyNeeded: 'Connects all your apps to automate data transfer and complex logic.',
        link: 'https://www.make.com/en/register?pc=starksglobalgroup'
      },
      {
        name: 'CustomGPT',
        description: 'Custom AI Agents',
        whyNeeded: 'Builds specialized AI assistants trained specifically on client data.',
        link: 'https://customgpt.ai/?fpr=timothy99'
      },
      {
        name: 'Systeme.io',
        description: 'All-in-one Marketing',
        whyNeeded: 'Alternative lightweight funnel and email builder for simpler client setups.',
        link: 'https://systeme.io/?sa=sa026857083720e8c1ed65e04111213cb70aebc598'
      },
      {
        name: 'ClickFunnels AI',
        description: 'Sales Funnels',
        whyNeeded: 'High-converting landing pages powered by AI copywriting.',
        link: 'https://www.clickfunnels.com/signup-flow?aff=66821e69515f2c10e8ecf0e2aa6249e202c19d4cd4106dbbc85c2c6035e10132'
      },
      {
        name: 'Relay.app',
        description: 'Human-in-loop Automation',
        whyNeeded: 'Automates workflows that require manual approval steps before proceeding.',
        link: 'https://relay.app/?via=timothy'
      },
      {
        name: 'Albato AI',
        description: 'Data Transfer',
        whyNeeded: 'Fast API connections between SaaS tools for seamless integration.',
        link: 'https://albato.com?fpr=timothy81'
      },
      {
        name: 'Magai',
        description: 'AI Content Workspace',
        whyNeeded: 'Generates high-converting copy and content for clients at scale.',
        link: 'https://magai.co/?via=timothy-starks'
      },
      {
        name: 'GetResponse',
        description: 'Email Marketing',
        whyNeeded: 'Advanced email automation and newsletter management for client retention.',
        link: 'https://try.getresponsetoday.com/0b323twnmh5c'
      }
    ],

    stepByStep: [
      {
        title: 'Create Agency Offer',
        instructions: 'Define your niche and the specific AI automation service you will provide (e.g., AI chatbots for real estate, automated lead gen for roofers).',
        outcome: 'A clear, high-ticket offer ready to sell.',
        time: '1 Hour'
      },
      {
        title: 'Set Up GoHighLevel',
        instructions: 'Configure your agency sub-account, sales pipelines, calendars, and white-label settings.',
        outcome: 'Agency CRM and operating system ready.',
        time: '2 Hours'
      },
      {
        title: 'Build Lead Capture Funnel',
        instructions: 'Create a landing page offering a free AI audit or lead magnet to attract your target niche.',
        outcome: 'Lead generation system live.',
        time: '2 Hours'
      },
      {
        title: 'Connect Automations',
        instructions: 'Use Make.com to link your funnel to your CRM, email sequences, and notification channels.',
        outcome: 'Automated data flow established.',
        time: '1.5 Hours'
      },
      {
        title: 'Add AI Content System',
        instructions: 'Set up Magai to generate client content, ad copy, and email sequences at scale.',
        outcome: 'Content fulfillment engine operational.',
        time: '1 Hour'
      },
      {
        title: 'Build AI Client Support',
        instructions: 'Deploy CustomGPT to handle client FAQs, onboarding questions, and basic support tickets.',
        outcome: '24/7 automated client support.',
        time: '1.5 Hours'
      },
      {
        title: 'Client Onboarding Automation',
        instructions: 'Create automated workflows for sending contracts, processing invoices, and collecting intake forms.',
        outcome: 'Frictionless, zero-touch onboarding.',
        time: '2 Hours'
      },
      {
        title: 'Scale the Agency',
        instructions: 'Launch outreach campaigns and paid ads to drive consistent traffic to your automated funnel.',
        outcome: 'Predictable client acquisition.',
        time: 'Ongoing'
      }
    ],

    outputs: [
      { name: 'Automated Lead Gen', description: 'A system that consistently attracts and captures qualified prospects.' },
      { name: 'Frictionless Onboarding', description: 'Zero-touch client setup from payment to project kickoff.' },
      { name: 'Scalable Fulfillment', description: 'AI-driven service delivery that does not rely on your personal time.' },
      { name: '24/7 Support', description: 'AI agents handling routine client communications and queries.' },
      { name: 'Recurring Revenue', description: 'Predictable monthly income from retainer clients and software subscriptions.' },
      { name: 'Performance Dashboards', description: 'Real-time metrics on agency health and client campaign results.' }
    ],

    monetization: [
      {
        name: 'AI Chatbot Development',
        description: 'Build and deploy custom AI agents for local businesses to handle customer service.',
        potential: '$1,500 - $5,000/client'
      },
      {
        name: 'Workflow Automation',
        description: 'Connect and automate client software stacks using Make.com to save them hours of manual work.',
        potential: '$2,000 - $10,000/project'
      },
      {
        name: 'Content Systems',
        description: 'Set up automated AI content generation pipelines for brands and creators.',
        potential: '$1,000 - $3,000/mo'
      },
      {
        name: 'CRM Implementation',
        description: 'Build out GoHighLevel workspaces tailored for specific industry niches.',
        potential: '$2,500 - $8,000/setup'
      },
      {
        name: 'AI Consulting',
        description: 'Advise enterprises on AI adoption, tool selection, and implementation strategy.',
        potential: '$200 - $500/hour'
      },
      {
        name: 'SaaS Reselling',
        description: 'White-label GoHighLevel and sell it as your own proprietary software to clients.',
        potential: '$97 - $497/mo per user'
      }
    ],

    mistakes: [
      {
        title: 'Overcomplicating the Offer',
        problem: 'Trying to sell too many different AI services at once confuses prospects and complicates fulfillment.',
        fix: 'Start with one specific solution for one specific niche. Master it before expanding.'
      },
      {
        title: 'Ignoring Fulfillment',
        problem: 'Selling a complex service you cannot reliably deliver at scale, leading to churn.',
        fix: 'Build and rigorously test the automation workflow yourself before selling it to a client.'
      },
      {
        title: 'Manual Onboarding',
        problem: 'Wasting hours setting up accounts, sending emails, and chasing documents manually.',
        fix: 'Automate the entire intake process with GoHighLevel and Make.com from day one.'
      },
      {
        title: 'Underpricing Services',
        problem: 'Charging hourly instead of based on the massive value and time the automation saves the client.',
        fix: 'Price based on the ROI (time or money) the automation delivers to the client\'s business.'
      }
    ],

    ctaText: 'Get Instant Access',
    ctaDescription: 'Ready to Build Your AI Automation Agency? Get the exact templates, automation scripts, and step-by-step video training to launch your agency today.'
  };

  return <BlueprintDetailTemplate data={blueprintData} />;
};

export default AIAutomationAgencySystemPage;