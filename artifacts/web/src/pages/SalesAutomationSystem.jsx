import React from 'react';
import { Layers } from 'lucide-react';
import SystemDetailTemplate from '@/components/SystemDetailTemplate.jsx';

const SalesAutomationSystem = () => {
  const tools = [
    {
      name: "GoHighLevel",
      purpose: "CRM & Pipelines",
      explanation: "The core CRM where all leads are managed. Handles the SMS, Email, and Voicemail drop automations.",
      affiliate_link: "https://www.gohighlevel.com/?fp_ref=t04hj",
      image: "https://images.unsplash.com/photo-1608222351212-18fe0ec7b13b?auto=format&fit=crop&w=800&q=80"
    },
    {
      name: "Albato AI",
      purpose: "Data Integration",
      explanation: "Connects your lead sources (Facebook Ads, Webhooks) directly into your CRM pipelines instantly.",
      affiliate_link: "https://albato.com",
      image: "https://images.unsplash.com/photo-1648134859211-4a1b57575f4e?auto=format&fit=crop&w=800&q=80"
    }
  ];

  const workflow = [
    { phase: "Lead Capture", tool: "External/Ads", time: "Instant", description: "Lead submits information on an ad or site." },
    { phase: "Data Sync", tool: "Albato AI", time: "Instant", description: "Routes lead data securely into CRM." },
    { phase: "Follow-up", tool: "GoHighLevel", time: "5 Mins", description: "Automated SMS/Email sent to prospect." },
    { phase: "Booking", tool: "GoHighLevel", time: "Automated", description: "Lead books call directly on calendar." }
  ];

  const instructions = [
    {
      title: "Set Up the Sales Pipeline",
      location: "GoHighLevel",
      action: "Opportunities > Pipelines",
      whatToClick: "Create New Pipeline",
      details: "Create stages: New Lead, Contacted, Appointment Booked, Closed Won, Closed Lost.",
      expectedOutput: "A visual kanban board for tracking leads."
    },
    {
      title: "Create the Follow-up Workflow",
      location: "GoHighLevel",
      action: "Automations",
      details: "Trigger: Pipeline Stage Changed to 'New Lead'. Actions: Wait 2 mins -> Send SMS ('Hi [Name], received your inquiry...') -> Wait 1 day -> Send Email.",
      expectedOutput: "A sequence that guarantees every new lead gets contacted."
    },
    {
      title: "Connect Lead Sources",
      location: "Albato AI",
      action: "Create Connection",
      details: "Select your lead source (e.g., Facebook Lead Ads) as the trigger. Select GoHighLevel as the action. Map the Name, Email, and Phone fields. Add the action to place them in the 'New Lead' pipeline stage.",
      expectedOutput: "Leads automatically flow from ads into the CRM and trigger the SMS."
    }
  ];

  const monetization = [
    "Increased Conversion: Follow up with leads in 5 minutes increases conversion by 400%.",
    "Saved Labor: Replace a human SDR with automated SMS/Email follow-up.",
    "Agency Service: Sell this entire setup as a service to real estate agents or roofers for $2,000."
  ];

  const checklist = [
    "GoHighLevel Pipeline created",
    "SMS follow-up workflow activated",
    "Albato connection tested with a dummy lead",
    "Calendar integrated for automated booking",
    "Pipeline movement confirmed on test lead"
  ];

  return (
    <SystemDetailTemplate
      slug="sales-automation"
      title="Sales Automation System"
      subtitle="Instantly follow up and book appointments with every lead."
      icon={Layers}
      description="Never lose a lead to slow follow-up again. This system catches leads from any source, drops them into a CRM, and immediately engages them via SMS and email to book appointments on autopilot."
      revenueModel="Service/B2B Sales"
      automationLevel="Very High"
      bestFor="Agencies, Sales Teams, Local Biz"
      tools={tools}
      instructions={instructions}
      workflow={workflow}
      monetization={monetization}
      checklist={checklist}
    />
  );
};

export default SalesAutomationSystem;