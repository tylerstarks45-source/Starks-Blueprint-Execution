import React from 'react';
import BlueprintDetailTemplate from '@/components/BlueprintDetailTemplate.jsx';

const AIVideoContentSystemPage = () => {
  const blueprintData = {
    name: 'AI Video Content System',
    headline: 'AI VIDEO CONTENT SYSTEM',
    subheadline: 'Fully automated pipeline to generate, edit, and publish high-converting short-form videos.',
    incomeRange: '$1,000–$10,000+/month',
    launchTime: '2–6 Hours',
    skillLevel: 'Beginner Friendly',
    
    howItWorks: [
      {
        title: 'Google Sheets',
        description: 'Acts as your content database, storing topics, keywords, and prompts.'
      },
      {
        title: 'AI Script Generation',
        description: 'Make.com triggers OpenRouter to write viral scripts based on your sheet data.'
      },
      {
        title: 'Video AI Tools',
        description: 'Scripts are sent to AI video generators to create visuals and voiceovers.'
      },
      {
        title: 'Auto-Rendering',
        description: 'The system automatically renders the final MP4 video file.'
      },
      {
        title: 'Caption & Hashtag',
        description: 'AI generates optimized captions and trending hashtags for the video.'
      },
      {
        title: 'Scheduling',
        description: 'Videos are queued up in your scheduling tool automatically.'
      },
      {
        title: 'Social Distribution',
        description: 'Content is published across TikTok, Reels, and Shorts hands-free.'
      }
    ],

    toolStack: [
      // CORE AUTOMATION TOOLS
      {
        category: 'CORE AUTOMATION TOOLS',
        name: 'Make.com',
        description: 'Workflow Automation',
        whyNeeded: 'The brain of the operation. Connects your database to AI models and video generators.',
        link: 'https://www.make.com/en/register?pc=starksglobalgroup'
      },
      {
        category: 'CORE AUTOMATION TOOLS',
        name: 'Google Sheets',
        description: 'Content Database',
        whyNeeded: 'Stores your content ideas and triggers the automation when new rows are added.',
        link: 'https://workspace.google.com/products/sheets/'
      },
      {
        category: 'CORE AUTOMATION TOOLS',
        name: 'OpenRouter',
        description: 'AI Model Aggregator',
        whyNeeded: 'Provides access to top AI models (Claude, GPT-4) for writing viral scripts.',
        link: 'https://openrouter.ai/'
      },
      
      // VIDEO CREATION TOOLS
      {
        category: 'VIDEO CREATION TOOLS',
        name: 'Pollo AI',
        description: 'AI Video Generation',
        whyNeeded: 'Generates high-quality video clips from text prompts.',
        link: 'https://pollo.ai/'
      },
      {
        category: 'VIDEO CREATION TOOLS',
        name: 'Zebracat AI',
        description: 'Text-to-Video',
        whyNeeded: 'Turns scripts into engaging marketing videos with AI avatars and voiceovers.',
        link: 'https://www.zebracat.ai/?via=timothy'
      },
      {
        category: 'VIDEO CREATION TOOLS',
        name: 'Viddeos AI',
        description: 'Automated Video Creation',
        whyNeeded: 'Creates faceless videos optimized for social media algorithms.',
        link: 'https://viddeos.com/'
      },
      {
        category: 'VIDEO CREATION TOOLS',
        name: 'Opus Pro',
        description: 'AI Video Clipping',
        whyNeeded: 'Automatically chops long-form videos into viral shorts with captions.',
        link: 'https://www.opus.pro/?via=22f2ba'
      },
      {
        category: 'VIDEO CREATION TOOLS',
        name: 'Predis.ai',
        description: 'Social Media AI',
        whyNeeded: 'Generates video content and schedules it directly to your platforms.',
        link: 'https://predis.ai?ref=timothy97'
      },
      {
        category: 'VIDEO CREATION TOOLS',
        name: 'TubeMagic',
        description: 'YouTube Optimization',
        whyNeeded: 'Helps optimize video titles, descriptions, and tags for maximum reach.',
        link: 'https://tubemagic.com/ds#aff=Starks'
      },

      // DISTRIBUTION/BUSINESS TOOLS
      {
        category: 'DISTRIBUTION/BUSINESS TOOLS',
        name: 'GoHighLevel',
        description: 'All-in-One CRM',
        whyNeeded: 'Captures leads generated from your videos and automates follow-ups.',
        link: 'https://www.gohighlevel.com/?fp_ref=t04hj'
      },
      {
        category: 'DISTRIBUTION/BUSINESS TOOLS',
        name: 'Systeme.io',
        description: 'Funnel Builder',
        whyNeeded: 'Creates simple landing pages to monetize your video traffic.',
        link: 'https://systeme.io/?sa=sa026857083720e8c1ed65e04111213cb70aebc598'
      },
      {
        category: 'DISTRIBUTION/BUSINESS TOOLS',
        name: 'GetResponse',
        description: 'Email Marketing',
        whyNeeded: 'Builds your email list and sends automated newsletters to your audience.',
        link: 'https://try.getresponsetoday.com/0b323twnmh5c'
      }
    ],

    stepByStep: [
      {
        title: 'Create Your Content Niche',
        instructions: 'Define your target audience and the specific problem your content solves. Research trending topics in your niche.',
        outcome: 'A clear content strategy and list of 30+ video ideas.',
        time: '1 Hour'
      },
      {
        title: 'Create Google Sheets Content Database',
        instructions: 'Set up a Google Sheet with columns for Topic, Hook, Script, Status, and Video URL. This will act as your command center.',
        outcome: 'A structured database ready to trigger automations.',
        time: '30 Mins'
      },
      {
        title: 'Connect Google Sheets to Make.com',
        instructions: 'Create a Make.com scenario that watches your Google Sheet for new rows and extracts the topic data.',
        outcome: 'Automated data extraction pipeline.',
        time: '45 Mins'
      },
      {
        title: 'Generate AI Scripts',
        instructions: 'Add an OpenRouter module in Make.com. Prompt the AI to write a 30-second viral script based on the topic from your sheet.',
        outcome: 'High-converting scripts generated instantly.',
        time: '45 Mins'
      },
      {
        title: 'Generate AI Videos',
        instructions: 'Connect your chosen video AI tool (e.g., Zebracat or Viddeos) in Make.com to turn the generated script into a rendered video.',
        outcome: 'Automated video rendering without manual editing.',
        time: '1 Hour'
      },
      {
        title: 'Create Captions & Hashtags',
        instructions: 'Use another AI module to generate an engaging caption and trending hashtags based on the video script.',
        outcome: 'SEO-optimized metadata for social platforms.',
        time: '30 Mins'
      },
      {
        title: 'Distribute Content',
        instructions: 'Connect a scheduling tool (like Predis.ai or Buffer) to automatically post the final video and caption to TikTok, IG Reels, and YouTube Shorts.',
        outcome: 'Hands-free multi-platform publishing.',
        time: '1 Hour'
      },
      {
        title: 'Build Monetization System',
        instructions: 'Set up a Link-in-Bio pointing to a Systeme.io or GoHighLevel funnel to capture emails and promote affiliate offers.',
        outcome: 'A system that turns views into revenue.',
        time: '1.5 Hours'
      }
    ],

    outputs: [
      { name: 'Rapid Audience Growth', description: 'Consistent daily posting triggers algorithm favorability.' },
      { name: 'Automated Traffic', description: 'A steady stream of viewers directed to your links.' },
      { name: 'Affiliate Commissions', description: 'Passive income generated from product recommendations.' },
      { name: 'Scalable Production', description: 'Create 100 videos in the time it used to take to make 1.' },
      { name: 'Multi-Platform Exposure', description: 'Omnipresence across TikTok, Instagram, and YouTube.' },
      { name: 'Automated Lead Generation', description: 'Viewers converted into email subscribers automatically.' }
    ],

    monetization: [
      {
        name: 'Affiliate Marketing',
        description: 'Promote software or products in your videos and earn a commission on sales.',
        potential: '$500 - $5,000+/mo'
      },
      {
        name: 'Sponsorships',
        description: 'Get paid by brands to feature their products in your automated content.',
        potential: '$1,000 - $10,000/mo'
      },
      {
        name: 'Ad Revenue',
        description: 'Earn money directly from YouTube, TikTok, and Instagram creator funds.',
        potential: '$200 - $3,000+/mo'
      },
      {
        name: 'Lead Generation',
        description: 'Capture emails and sell the leads to businesses in your niche.',
        potential: '$1,000 - $5,000/mo'
      },
      {
        name: 'Consulting',
        description: 'Charge clients to set up this exact automated video system for them.',
        potential: '$2,000 - $5,000/client'
      },
      {
        name: 'Digital Products',
        description: 'Sell your own courses, templates, or guides to your growing audience.',
        potential: '$1,000 - $10,000+/mo'
      },
      {
        name: 'AI Services',
        description: 'Offer "Content as a Service" to local businesses using your automated pipeline.',
        potential: '$1,500 - $5,000/mo'
      }
    ],

    mistakes: [
      {
        title: 'Posting Inconsistently',
        problem: 'Algorithms punish accounts that post sporadically, killing your reach.',
        fix: 'Use the automation to schedule at least 1-2 videos every single day.'
      },
      {
        title: 'Weak Hooks',
        problem: 'Viewers scroll past your video in the first 3 seconds.',
        fix: 'Prompt the AI to spend 80% of its effort crafting a pattern-interrupting hook.'
      },
      {
        title: 'Over-Editing Videos',
        problem: 'Spending hours tweaking visuals manually defeats the purpose of automation.',
        fix: 'Trust the AI tools. Done is better than perfect when scaling volume.'
      },
      {
        title: 'No Call to Action (CTA)',
        problem: 'Getting millions of views but zero clicks or sales.',
        fix: 'Always include a clear CTA in the video and caption directing users to your link.'
      },
      {
        title: 'Using Generic Content',
        problem: 'Creating broad, boring videos that don\'t target a specific audience.',
        fix: 'Niche down. Create highly specific content that solves a distinct problem.'
      }
    ],

    ctaText: 'Ready to Build Your AI Video Content System?',
    ctaDescription: 'Instant download. Start building today. Get the exact Make.com blueprints, AI prompts, and step-by-step video training to launch your automated content machine.'
  };

  return <BlueprintDetailTemplate data={blueprintData} />;
};

export default AIVideoContentSystemPage;