/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("blueprints");

  const record0 = new Record(collection);
    record0.set("name", "Funnel & Email Automator");
    record0.set("description", "A fully automated funnel and email system designed to capture leads, nurture audiences, and convert traffic into consistent revenue.");
    record0.set("system_name", "Funnel & Email Automator");
    record0.set("system_details", "{'tags': ['Funnel', 'Email Marketing', 'Automation', 'Beginner-Intermediate'], 'revenueModel': 'Funnel + Email Marketing', 'skillLevel': 'Beginner \u2192 Intermediate', 'automationLevel': 'High', 'targetAudience': ['Affiliate marketers', 'Coaches', 'Service providers', 'Beginners building online income'], 'systemOverview': 'This system captures traffic, converts it into leads, nurtures those leads with automated emails, and turns them into customers. It runs fully on autopilot once setup.', 'systemFlow': ['Drive Traffic: Users bring traffic from short-form content, ads, or organic sources', 'Capture Leads: Traffic lands on landing pages and opt-in forms to collect emails', 'Funnel Conversion: Users enter sales funnel and offer pages to move toward purchase', 'Email Automation: System sends welcome emails, follow-ups, and offer emails to build trust and push conversions', 'Generate Revenue: Users buy products or click affiliate links, system earns commissions or sales'], 'deploymentRoadmap': ['STEP 1 \u2014 Choose Offer: Pick affiliate product OR your own product', 'STEP 2 \u2014 Build Funnel: Create landing page, opt-in page, thank you page', 'STEP 3 \u2014 Connect Email System: Set up email platform, subscriber list', 'STEP 4 \u2014 Build Email Sequence: Create 5\u201310 automated emails with value + promotion mix', 'STEP 5 \u2014 Drive Traffic: Connect TikTok / YouTube / Ads', 'STEP 6 \u2014 Optimize: Track click rates, conversions, revenue'], 'softwareStackCategories': ['Funnel Builder (ClickFunnels, Systeme.io, GoHighLevel)', 'Email Marketing Platform (ConvertKit, ActiveCampaign, Mailchimp)', 'Landing Page Builder (Webflow, Leadpages, Framer)', 'Automation Platform (Make.com, Zapier)', 'Analytics Tools (Google Analytics, Funnel tracking tools)'], 'bestFor': ['Affiliate marketers', 'Coaches / service providers', 'Beginners building online income', 'Anyone with traffic but no conversion system']}");
  try {
    app.save(record0);
  } catch (e) {
    if (e.message.includes("Value must be unique")) {
      console.log("Record with unique value already exists, skipping");
    } else {
      throw e;
    }
  }
}, (app) => {
  // Rollback: record IDs not known, manual cleanup needed
})