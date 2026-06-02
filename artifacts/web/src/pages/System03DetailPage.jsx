import React from 'react';
import { Layers } from 'lucide-react';
import SystemDetailTemplate from '@/components/SystemDetailTemplate.jsx';

const System03DetailPage = () => {
  const tools = [
    {
      name: "GODII AI",
      purpose: "Conversational Sales",
      explanation: "Acts as a 24/7 sales rep on your website, answering questions and pushing visitors to buy or book.",
      affiliate_link: "https://godii.ai",
      image: "https://images.unsplash.com/photo-1675023035272-3426884896f8?auto=format&fit=crop&w=800&q=80"
    }
  ];

  const workflow = [
    { phase: "Training", tool: "GODII AI", time: "1 hour", description: "Upload PDFs, FAQs, and product details." },
    { phase: "Integration", tool: "Website", time: "10 mins", description: "Paste the widget code into your site header." },
    { phase: "Engagement", tool: "Automated", time: "24/7", description: "Bot greets visitors and answers objections." },
    { phase: "Conversion", tool: "Automated", time: "Instant", description: "Bot provides checkout links or calendar booking." }
  ];

  const instructions = [
    {
      title: "Train the Sales Bot",
      location: "GODII Dashboard",
      action: "Knowledge Base",
      details: "Upload your pricing sheets, product descriptions, and a document detailing how to handle common objections (e.g., 'It's too expensive').",
      expectedOutput: "A bot that understands your products perfectly."
    },
    {
      title: "Configure the Goal",
      location: "GODII Dashboard",
      action: "Bot Settings",
      details: "Set the primary directive. If you sell software, set it to provide the checkout link. If you sell services, give it your Calendly link and instruct it to push for a booked call.",
      expectedOutput: "Bot is optimized for conversion, not just chatting."
    },
    {
      title: "Deploy to Website",
      location: "Website Builder (e.g., Systeme, Webflow)",
      action: "Inject Code",
      whatToType: "Paste the GODII javascript snippet into the <head> tag of your site.",
      expectedOutput: "The chat widget appears on the bottom right of your live website."
    }
  ];

  const monetization = [
    "Increased Conversion Rate: Recover abandoned visitors by answering their questions instantly.",
    "Lower Support Costs: Reduce the need for human live chat agents."
  ];

  const checklist = [
    "Knowledge base uploaded to GODII",
    "Bot tested with difficult questions",
    "Booking/Checkout links added to bot instructions",
    "Code snippet embedded on live website",
    "Live test interaction completed on site"
  ];

  return (
    <SystemDetailTemplate
      slug="ai-chatbot-sales"
      title="AI Chatbot Sales Closer"
      subtitle="Turn website visitors into buyers with conversational AI."
      icon={Layers}
      description="Deploy an intelligent sales assistant on your website that engages visitors, answers objections using your specific business data, and closes sales directly in the chat window."
      revenueModel="Increased Conversions"
      automationLevel="Very High"
      bestFor="E-commerce, SaaS, Service Biz"
      tools={tools}
      instructions={instructions}
      workflow={workflow}
      monetization={monetization}
      checklist={checklist}
    />
  );
};

export default System03DetailPage;