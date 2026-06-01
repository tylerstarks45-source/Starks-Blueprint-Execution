/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("tools");

  const record0 = new Record(collection);
    record0.set("name", "Convert Experiences");
    record0.set("description", "Privacy-first A/B testing platform trusted by growth marketers and ecommerce brands to increase conversions and optimize websites.");
    record0.set("category", "Marketing Tools");
    record0.set("affiliate_link", "https://www.convert.com/");
    record0.set("full_description", "Enterprise-level A/B testing platform with privacy-first approach, GDPR-friendly, fast page loading, and AI copy optimization tools. Features include A/B testing, split testing, multivariate testing, personalization, visual editor, AI writing assistant, advanced targeting, Shopify testing, and full-stack experimentation. Trusted by ecommerce brands, SaaS companies, marketing agencies, CRO specialists, website owners, startups, and growth marketers. Starts around $399/month with 15-day free trial (no credit card required).");
    record0.set("big_outcome", "Increase conversions and optimize websites with enterprise-level A/B testing");
    record0.set("core_problem", "Marketers struggle to optimize websites and increase conversions without privacy concerns");
    record0.set("transformation", "Convert privacy-first A/B testing into measurable conversion improvements");
    record0.set("emotional_trigger", "Confidence in data-driven optimization");
    record0.set("pain_level", 8);
    record0.set("status", "ACTIVE");
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
    record1.set("description", "AI-powered Google Ads automation platform that optimizes campaigns daily, reduces ad spend waste, and improves ROAS for ecommerce and agencies.");
    record1.set("category", "AI Marketing");
    record1.set("affiliate_link", "https://www.adturbo.ai/");
    record1.set("full_description", "AI-powered Google Ads automation platform that optimizes campaigns daily and reduces ad spend waste. Features include bid optimization, keyword management, search term analysis, budget allocation, daily campaign optimization, automated recommendations, and AI campaign analysis. Works 24/7 to improve ROAS and save time on ad management. Pricing: Single User Plan $149/month, Agency Plan ~$1000/month. 7-day free trial available. Ideal for small businesses, ecommerce stores, agencies, advertisers, entrepreneurs, and marketing teams.");
    record1.set("big_outcome", "Improve ROAS and reduce ad spend waste with AI-powered Google Ads optimization");
    record1.set("core_problem", "Agencies and ecommerce stores waste money on poorly optimized Google Ads campaigns");
    record1.set("transformation", "Convert wasted ad spend into profitable, optimized campaigns");
    record1.set("emotional_trigger", "Relief from manual ad management and confidence in AI optimization");
    record1.set("pain_level", 9);
    record1.set("status", "ACTIVE");
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