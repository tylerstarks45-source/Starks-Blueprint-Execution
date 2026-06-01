/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("blueprints");

  const record0 = new Record(collection);
    record0.set("name", "AI Chatbot Sales Funnel System");
    record0.set("system_name", "System 03");
    record0.set("description", "This system uses AI chatbots to automatically handle customer conversations, qualify leads, answer objections, and guide users through a sales funnel without human involvement.");
    record0.set("systemArchitectureImage", "https://horizons-cdn.hostinger.com/c23c9050-cfff-41bf-82a4-af121e0b4678/c6ffd1d0693fb65bac5f1ccd0b285810.png");
    record0.set("systemArchitectureDescription", "Each layer works together to convert traffic into customers through intelligent AI-driven conversations.");
    record0.set("system_details", "{'tags': ['Revenue Model: Sales / Conversion', 'Automation Level: High', 'Skill Level: Beginner \u2192 Advanced', 'Use Case: SaaS, Agencies, Affiliate Funnels'], 'short_description': 'A fully automated AI-powered sales system that engages visitors, answers questions, and converts traffic into paying customers 24/7.', 'systemFlow': [{'step': 1, 'title': 'Traffic Acquisition', 'description': 'Visitors come from: Social media, Ads, SEO, Affiliate content'}, {'step': 2, 'title': 'AI Chatbot Engagement', 'description': 'Chatbot instantly: Greets user, Asks qualifying questions, Understands intent'}, {'step': 3, 'title': 'Lead Qualification', 'description': 'Bot determines: Budget, Needs, Buying intent'}, {'step': 4, 'title': 'Sales Conversation', 'description': 'AI handles: Product explanation, Objections, FAQs'}, {'step': 5, 'title': 'Conversion Action', 'description': 'User is directed to: Checkout page OR Booking call'}, {'step': 6, 'title': 'Data Capture & Tracking', 'description': 'System logs: User responses, Behavior, Conversion actions'}, {'step': 7, 'title': 'Optimization Loop', 'description': 'AI improves: Responses, Conversion flow, Messaging'}], 'deploymentRoadmap': [{'step': 1, 'title': 'Define your offer', 'description': 'Product / service / affiliate funnel'}, {'step': 2, 'title': 'Build landing page', 'description': 'Simple, clean conversion page'}, {'step': 3, 'title': 'Install AI chatbot', 'description': 'Connect GPT-powered chatbot'}, {'step': 4, 'title': 'Train chatbot', 'description': 'Feed: FAQs, Sales scripts, Objection handling'}, {'step': 5, 'title': 'Connect conversion action', 'description': 'Stripe checkout, Calendly booking'}, {'step': 6, 'title': 'Launch traffic', 'description': 'Drive users into funnel'}, {'step': 7, 'title': 'Optimize conversations', 'description': 'Improve based on user behavior'}], 'softwareStack': {'AI Chatbot Engine': ['ChatGPT API / OpenRouter', 'Custom GPT agents'], 'Website / Funnel Builder': ['Webflow', 'Wix', 'ClickFunnels'], 'Payment System': ['Stripe', 'PayPal'], 'Booking System': ['Calendly', 'TidyCal'], 'Automation Layer': ['Make.com', 'Zapier'], 'Analytics': ['Google Analytics', 'Hotjar']}, 'initializationCTA': 'Start System Setup Console', 'initializationText': 'Launch your AI-powered sales system step-by-step. Connect your chatbot, configure your funnel, and activate automated conversions.'}");
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