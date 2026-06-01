/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("tools");

  const record0 = new Record(collection);
    record0.set("name", "Convert Experiences");
    record0.set("category", "Marketing Tools");
    record0.set("description", "Privacy-first A/B testing platform trusted by growth marketers and ecommerce brands to increase conversions and optimize websites.");
    record0.set("full_description", "Privacy-first A/B testing platform trusted by growth marketers and ecommerce brands to increase conversions and optimize websites. Features include A/B testing, split testing, multivariate testing, personalization, visual editor, AI writing assistant, advanced targeting, Shopify testing, and full-stack experimentation. Benefits: Enterprise-level A/B testing, Privacy-focused, GDPR-friendly, Fast page loading, AI copy optimization tools. 15-day free trial with no credit card required. Starts around $399/month.");
    record0.set("affiliate_link", "https://www.convert.com/");
    record0.set("verified_use_case", true);
    record0.set("status", "ACTIVE");
    record0.set("system_tags", ["A/B Testing", "CRO", "Privacy-First", "Ecommerce", "Personalization"]);
    record0.set("system_context", "{'features': ['A/B testing', 'Split testing', 'Multivariate testing', 'Personalization', 'Visual editor', 'AI writing assistant', 'Advanced targeting', 'Shopify testing', 'Full-stack experimentation'], 'benefits': ['Enterprise-level A/B testing', 'Privacy-focused', 'GDPR-friendly', 'Fast page loading', 'AI copy optimization tools', 'No credit card free trial', 'Strong support team'], 'audience': ['Ecommerce brands', 'SaaS companies', 'Marketing agencies', 'CRO specialists', 'Website owners', 'Startups', 'Growth marketers'], 'freeTrial': '15-day free trial, no credit card required', 'pricing': 'Starts around $399/month', 'ctaText': 'Start Free Trial'}");
  try {
    app.save(record0);
  } catch (e) {
    if (e.message.includes("Value must be unique")) {
      console.log("Record with unique value already exists, skipping");
    } else {
      throw e;
    }
  }

  const record1 = new Record(collection);
    record1.set("name", "AdTurbo AI");
    record1.set("category", "AI Marketing");
    record1.set("description", "AI-powered Google Ads automation platform that optimizes campaigns daily, reduces ad spend waste, and improves ROAS for ecommerce and agencies.");
    record1.set("full_description", "AI-powered Google Ads automation platform that optimizes campaigns daily, reduces ad spend waste, and improves ROAS for ecommerce and agencies. Features include bid optimization, keyword management, search term analysis, budget allocation, daily campaign optimization, automated recommendations, and AI campaign analysis. Benefits: AI-powered Google Ads management, Daily optimization automation, Lower ad management costs, Improves ROAS, Saves time, Works 24/7. Pricing: Single User Plan $149/month, Agency Plan ~$1000/month. 7-day free trial available.");
    record1.set("affiliate_link", "https://www.adturbo.ai/");
    record1.set("verified_use_case", true);
    record1.set("status", "ACTIVE");
    record1.set("system_tags", ["Google Ads", "AI Automation", "ROAS", "Ecommerce", "Agencies"]);
    record1.set("system_context", "{'features': ['Bid optimization', 'Keyword management', 'Search term analysis', 'Budget allocation', 'Daily campaign optimization', 'Automated recommendations', 'AI campaign analysis'], 'benefits': ['AI-powered Google Ads management', 'Daily optimization automation', 'Lower ad management costs', 'Improves ROAS', 'Saves time', 'Works 24/7'], 'audience': ['Small businesses', 'Ecommerce stores', 'Agencies', 'Advertisers', 'Entrepreneurs', 'Marketing teams'], 'freeTrial': '7-day free trial', 'pricing': 'Single User Plan: $149/month, Agency Plan: ~$1000/month', 'ctaText': 'Start Free Trial'}");
  try {
    app.save(record1);
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