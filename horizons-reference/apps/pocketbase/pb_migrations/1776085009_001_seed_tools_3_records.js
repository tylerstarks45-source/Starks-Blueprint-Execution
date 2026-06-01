/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("tools");

  const record0 = new Record(collection);
    record0.set("name", "Magai AI");
    record0.set("description", "All-in-one AI platform that lets you use 50+ AI models (ChatGPT, Claude, Gemini, etc.) inside one chat to create content, automate workflows, and run AI-powered operations.");
    record0.set("full_description", "Access 50+ AI models in one platform | Switch models mid-conversation (no reset) | AI personas (custom GPT-style workflows) | Built-in document editor (export to PDF/DOCX) | Prompt library + reusable instructions | File uploads + web browsing inside chat | Team collaboration + shared workspaces | AI image + video generation tools. Instead of paying for multiple AI tools, Magai combines everything into one system\u2014saving time, money, and workflow complexity. Starter: ~$20/month | Pro: ~$40/month | Enterprise: Custom | Includes access to premium AI tools that would normally cost hundreds/month individually. Best for: Content creators | AI automation builders | Agencies | Entrepreneurs building systems. Use cases: AI Script Generation | AI Content Engine | AI Automation Brain");
    record0.set("category", "AI Software");
    record0.set("target_audience", "Content creators, AI automation builders, Agencies, Entrepreneurs building systems");
    record0.set("affiliate_link", "https://magai.co/?via=timothy-starks");
    record0.set("core_problem", "Managing multiple AI tools and subscriptions costs time and money");
    record0.set("big_outcome", "One unified AI platform replacing dozens of separate tools");
    record0.set("transformation", "Streamlined AI workflows with instant access to best-in-class models");
    record0.set("emotional_trigger", "Overwhelm from tool complexity");
    record0.set("pain_level", 8);
    record0.set("offer_type", "Software");
    record0.set("unique_angle", "50+ AI models in single interface with no context reset");
    record0.set("competition_level", "High");
    record0.set("price_perception", "Mid");
    record0.set("trust_level", "High");
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
    record1.set("name", "Albato AI");
    record1.set("description", "No-code automation platform that connects apps and automates workflows between tools like Shopify, Gmail, Slack, and more.");
    record1.set("full_description", "Connect 1,000+ apps | Drag-and-drop automation builder | API + webhook integrations | AI-powered automation tools | Real-time workflow execution | Data migration + auto replay | Error handling + logs | Parallel workflow execution. Automates your entire business backend\u2014replacing manual work with fully automated systems. Free Plan: $0 (basic automations) | Pro: ~$15\u2013$22/month | Teams: ~$65/month+ | Enterprise: Custom | Transaction-based pricing (you pay based on automation usage). Best for: Automation systems | SaaS integrations | Ecommerce workflows | AI business builders. Use cases: Automation layer (CORE system engine) | Data syncing between tools | Backend workflow control");
    record1.set("category", "AI Automation");
    record1.set("target_audience", "Automation systems builders, SaaS integrations, Ecommerce, AI business builders");
    record1.set("affiliate_link", "https://albato.com?fpr=timothy81");
    record1.set("core_problem", "Manual workflows and disconnected business tools waste time");
    record1.set("big_outcome", "Fully automated business backend with zero manual intervention");
    record1.set("transformation", "Complete workflow automation across all business tools");
    record1.set("emotional_trigger", "Frustration with manual data entry and tool switching");
    record1.set("pain_level", 9);
    record1.set("offer_type", "Software");
    record1.set("unique_angle", "1,000+ app integrations with AI-powered automation");
    record1.set("competition_level", "High");
    record1.set("price_perception", "Low");
    record1.set("trust_level", "High");
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

  const record2 = new Record(collection);
    record2.set("name", "GetResponse");
    record2.set("description", "All-in-one marketing platform for email campaigns, funnels, automation, landing pages, and customer conversion.");
    record2.set("full_description", "Email marketing + autoresponders | AI email generator | Marketing automation workflows | Landing page builder | Funnel builder (sales + lead gen) | Webinars + course creation | SMS + push notifications | Ecommerce integrations. Combines email marketing + funnels + automation into one platform\u2014no need for multiple tools. Free Plan available | Starter: ~$13\u2013$19/month | Marketer: ~$50+/month | Creator: ~$60+/month | Enterprise: Custom | Pricing scales based on number of contacts. Best for: Affiliate marketing systems | Email funnels | Lead generation | Online businesses. Use cases: Funnel & Email Automation | Lead capture + nurturing | Conversion system");
    record2.set("category", "Email Marketing");
    record2.set("target_audience", "Affiliate marketing systems, Email funnels, Lead generation, Online businesses");
    record2.set("affiliate_link", "https://try.getresponsetoday.com/0b323twnmh5c");
    record2.set("core_problem", "Managing email, funnels, and automation across multiple platforms");
    record2.set("big_outcome", "Complete marketing funnel automation in one platform");
    record2.set("transformation", "Unified email and funnel system replacing multiple tools");
    record2.set("emotional_trigger", "Complexity of managing separate email and funnel tools");
    record2.set("pain_level", 7);
    record2.set("offer_type", "Software");
    record2.set("unique_angle", "Email + funnels + automation + webinars in one platform");
    record2.set("competition_level", "High");
    record2.set("price_perception", "Mid");
    record2.set("trust_level", "High");
    record2.set("status", "ACTIVE");
  try {
    app.save(record2);
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