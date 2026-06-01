import React from 'react';
import BlueprintDetailTemplate from '@/components/BlueprintDetailTemplate.jsx';

const AIChatbotSalesFunnelSystemPage = () => {
  const blueprintData = {
    name: 'AI Chatbot Sales Funnel System',
    headline: 'AI CHATBOT SALES FUNNEL SYSTEM',
    subheadline: 'Build an automated AI chatbot funnel that captures leads, responds instantly, qualifies prospects, books appointments, automates follow-up, nurtures leads, and scales customer acquisition 24/7. Note: This system is built using recommended external tools and is not hosted directly on the Starks platform.',
    incomeRange: '$2,000–$25,000+/month',
    launchTime: '3–8 Hours',
    skillLevel: 'Intermediate',
    
    howItWorks: [
      {
        title: 'Traffic Generation',
        description: 'Targeted traffic enters your optimized landing pages through organic or paid social media campaigns.'
      },
      {
        title: 'Instant Engagement',
        description: 'An AI chatbot instantly greets visitors as soon as they land on your funnel pages.'
      },
      {
        title: 'Instant Answers',
        description: 'The AI chatbot answers customer questions in real-time based on your specific business data.'
      },
      {
        title: 'Lead Qualification',
        description: 'The AI intelligently qualifies leads by asking key pre-screening questions before booking.'
      },
      {
        title: 'Data Storage',
        description: 'Your CRM automatically captures and securely stores all lead information and chat transcripts.'
      },
      {
        title: 'Automated Follow-Up',
        description: 'Smart follow-up automations trigger instantly via email and SMS to keep the prospect engaged.'
      },
      {
        title: 'Appointment Booking',
        description: 'The automated booking system seamlessly schedules sales calls directly onto your calendar.'
      },
      {
        title: 'Sales Conversion',
        description: 'Optimized sales funnels and structured pipelines convert nurtured leads into paying customers.'
      }
    ],

    toolStack: [
      // AI CHATBOT TOOLS
      {
        category: 'AI CHATBOT TOOLS',
        name: 'CustomGPT',
        description: 'Custom AI Chatbots',
        whyNeeded: 'Builds a personalized AI assistant trained on your exact business data to answer questions and capture leads 24/7.',
        link: 'https://customgpt.ai/?via=starks'
      },
      {
        category: 'AI CHATBOT TOOLS',
        name: 'Magai',
        description: 'AI Content Workspace',
        whyNeeded: 'Generates the perfect chatbot prompts, conversation flows, and scripts to train your AI sales assistant.',
        link: 'https://magai.co/?via=timothy-starks'
      },

      // CRM & FUNNEL TOOLS
      {
        category: 'CRM & FUNNEL TOOLS',
        name: 'GoHighLevel',
        description: 'All-in-One CRM',
        whyNeeded: 'The core engine that hosts your funnels, manages leads, and runs your SMS/email automations.',
        link: 'https://www.gohighlevel.com/?fp_ref=t04hj'
      },
      {
        category: 'CRM & FUNNEL TOOLS',
        name: 'Systeme.io',
        description: 'Free Funnel Builder',
        whyNeeded: 'A beginner-friendly platform to build your initial landing pages and capture leads efficiently.',
        link: 'https://systeme.io/?sa=sa026857083720e8c1ed65e04111213cb70aebc598'
      },
      {
        category: 'CRM & FUNNEL TOOLS',
        name: 'ClickFunnels AI',
        description: 'Sales Funnels',
        whyNeeded: 'Builds high-converting, robust sales funnels utilizing built-in AI copywriting tools.',
        link: 'https://www.clickfunnels.com/signup-flow?aff=66821e69515f2c10e8ecf0e2aa6249e202c19d4cd4106dbbc85c2c6035e10132'
      },
      {
        category: 'CRM & FUNNEL TOOLS',
        name: 'Perspective Funnels',
        description: 'Mobile-First Funnels',
        whyNeeded: 'Creates highly engaging, interactive mobile funnels perfect for capturing social media traffic.',
        link: 'https://perspective.co/?via=starks'
      },

      // AUTOMATION TOOLS
      {
        category: 'AUTOMATION TOOLS',
        name: 'Make.com',
        description: 'Workflow Automation',
        whyNeeded: 'Connects your AI chatbot to your CRM and triggers backend workflows when a lead is captured.',
        link: 'https://www.make.com/en/register?pc=starksglobalgroup'
      },
      {
        category: 'AUTOMATION TOOLS',
        name: 'Albato AI',
        description: 'No-Code Integrations',
        whyNeeded: 'Alternative automation platform for connecting your various apps without writing custom code.',
        link: 'https://albato.com/?ref=starks'
      },
      {
        category: 'AUTOMATION TOOLS',
        name: 'Relay.app',
        description: 'Human-in-the-loop Automation',
        whyNeeded: 'Automates advanced workflows while allowing manual approval steps for high-ticket lead qualification.',
        link: 'https://relay.app/?via=starks'
      },

      // EMAIL & FOLLOW-UP TOOLS
      {
        category: 'EMAIL & FOLLOW-UP TOOLS',
        name: 'GetResponse',
        description: 'Email Marketing',
        whyNeeded: 'Nurtures your leads and sends automated promotional emails to drive backend sales effectively.',
        link: 'https://try.getresponsetoday.com/0b323twnmh5c'
      },

      // CONTENT & TRAFFIC TOOLS
      {
        category: 'CONTENT & TRAFFIC TOOLS',
        name: 'Predis.ai',
        description: 'Social Media AI',
        whyNeeded: 'Automates your social media content creation to drive organic traffic to your new chatbot funnel.',
        link: 'https://predis.ai?ref=timothy97'
      },
      {
        category: 'CONTENT & TRAFFIC TOOLS',
        name: 'Zebracat AI',
        description: 'Video Ad Creation',
        whyNeeded: 'Turns text into high-converting video ads to fuel paid traffic into your funnel.',
        link: 'http://studio.zebracat.ai/signup/?via=027997'
      },
      {
        category: 'CONTENT & TRAFFIC TOOLS',
        name: 'Pollo AI',
        description: 'AI Video Generation',
        whyNeeded: 'Creates engaging viral AI video clips to capture attention and direct viewers to your landing page.',
        link: 'https://pollo.ai?ref=ztbhnmj'
      }
    ],

    stepByStep: [
      {
        title: 'Define Your Offer',
        instructions: 'Determine exactly what you are selling, who your target audience is, and what primary problem your product or service solves.',
        outcome: 'A clear value proposition ready to be marketed.',
        time: '1 Hour'
      },
      {
        title: 'Build Landing Page Funnel',
        instructions: 'Use GoHighLevel or Systeme.io to build a clean, high-converting landing page optimized for lead capture.',
        outcome: 'A live, functioning funnel ready to receive traffic.',
        time: '2 Hours'
      },
      {
        title: 'Build AI Chatbot',
        instructions: 'Set up CustomGPT by uploading your business documents, FAQs, and pricing details so it can accurately represent your brand.',
        outcome: 'An intelligent AI assistant trained on your specific business.',
        time: '1.5 Hours'
      },
      {
        title: 'Connect Chatbot to CRM',
        instructions: 'Use Make.com or native integrations to ensure that any email or phone number captured by the chatbot is instantly sent to GoHighLevel.',
        outcome: 'Seamless data transfer between chat and your CRM.',
        time: '45 Mins'
      },
      {
        title: 'Build Appointment Automation',
        instructions: 'Embed a calendar link in your chatbot script so qualified leads can book calls directly, syncing instantly with your schedule.',
        outcome: 'An automated booking engine that fills your calendar.',
        time: '45 Mins'
      },
      {
        title: 'Create Follow-Up System',
        instructions: 'Configure an automated 5-day email and SMS sequence in GoHighLevel to nurture leads who interacted with the bot but didn’t book a call.',
        outcome: 'A backend follow-up engine that recovers lost opportunities.',
        time: '1.5 Hours'
      },
      {
        title: 'Generate Traffic',
        instructions: 'Use Predis.ai and Pollo AI to generate social media content that drives targeted visitors to your newly built landing page.',
        outcome: 'A steady stream of potential leads entering the funnel.',
        time: '1 Hour'
      },
      {
        title: 'Build Sales Pipeline',
        instructions: 'Set up visual sales pipelines in your CRM to track where every lead is in the buying journey (e.g., Lead, Call Booked, Closed Won).',
        outcome: 'Complete visibility over your sales metrics and conversions.',
        time: '30 Mins'
      },
      {
        title: 'Scale the System',
        instructions: 'Monitor the chatbot conversation logs to identify missing answers, update its knowledge base, and increase your traffic generation efforts.',
        outcome: 'An optimized, continuously improving sales machine.',
        time: 'Ongoing'
      }
    ],

    outputs: [
      { name: '24/7 Lead Capture', description: 'Never miss an opportunity with round-the-clock instant responses.' },
      { name: 'Higher Conversion Rates', description: 'Instant engagement significantly boosts your funnel conversion percentage.' },
      { name: 'Automated Qualification', description: 'Filter out bad leads automatically before they reach your sales team.' },
      { name: 'Filled Calendars', description: 'A calendar packed with high-quality, pre-screened sales appointments.' },
      { name: 'Organized CRM Data', description: 'Every interaction and lead detail perfectly tracked in one central hub.' },
      { name: 'Recovered Sales', description: 'Automated follow-ups that turn hesitant visitors into paying customers.' }
    ],

    monetization: [
      {
        name: 'Agency Retainers',
        description: 'Build and manage this system for local businesses for a monthly retainer fee.',
        potential: '$2,000 - $10,000+/mo'
      },
      {
        name: 'Consulting',
        description: 'Charge premium rates to advise established companies on implementing AI sales funnels.',
        potential: '$3,000 - $15,000/mo'
      },
      {
        name: 'SaaS Sales',
        description: 'White-label GoHighLevel and sell the software directly to other business owners.',
        potential: '$5,000 - $25,000+/mo'
      },
      {
        name: 'Coaching',
        description: 'Teach other entrepreneurs how to build their own AI sales chatbots and funnels.',
        potential: '$2,000 - $10,000/mo'
      },
      {
        name: 'Lead Generation',
        description: 'Use the system to capture leads in high-ticket niches and sell them to professionals.',
        potential: '$3,000 - $20,000/mo'
      },
      {
        name: 'Automation Services',
        description: 'Offer dedicated Make.com workflow building for businesses that need backend integration.',
        potential: '$1,500 - $8,000/mo'
      },
      {
        name: 'Chatbot Setup Services',
        description: 'Charge a one-time fee of $1k-$3k simply to build and train CustomGPT bots for clients.',
        potential: '$2,000 - $12,000/mo'
      }
    ],

    mistakes: [
      {
        title: 'Overcomplicating the Bot',
        problem: 'Adding too many conversation paths confuses the AI and frustrates the user.',
        fix: 'Keep the chatbot goal simple: answer basic questions and capture the lead\'s contact info.'
      },
      {
        title: 'Neglecting the Knowledge Base',
        problem: 'The AI gives incorrect answers because its training data is outdated or sparse.',
        fix: 'Regularly review chat logs and update the CustomGPT data source with new FAQs.'
      },
      {
        title: 'Ignoring Mobile Optimization',
        problem: 'Most social traffic is mobile. If your funnel breaks on phones, you lose the lead.',
        fix: 'Always test your landing pages and chatbot widgets on a mobile device before launching.'
      },
      {
        title: 'Weak Follow-Up Sequences',
        problem: 'Sending generic, boring emails that get ignored or marked as spam.',
        fix: 'Use Magai to write highly personalized, value-driven email follow-ups.'
      },
      {
        title: 'Delaying the CRM Connection',
        problem: 'Manually moving leads from the chat platform to your sales pipeline wastes time.',
        fix: 'Ensure Make.com automations are active on Day 1 to instantly sync data to GoHighLevel.'
      }
    ],

    ctaText: 'Get Instant Access',
    ctaDescription: 'Ready to Build Your AI Chatbot Sales Funnel System? Instant download. Start building today and get the exact automation templates, prompts, and training you need.'
  };

  return <BlueprintDetailTemplate data={blueprintData} />;
};

export default AIChatbotSalesFunnelSystemPage;