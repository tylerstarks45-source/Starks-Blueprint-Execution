/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("blueprints");

  const record0 = new Record(collection);
    record0.set("name", "AI Chatbot Sales Funnel System");
    record0.set("description", "A fully automated AI-powered sales system that engages visitors, answers questions, and converts traffic into paying customers 24/7.");
    record0.set("system_name", "AI Chatbot Sales Funnel System");
    record0.set("system_details", "{'tags': ['Revenue Model: Sales / Conversion', 'Automation Level: High', 'Skill Level: Beginner \u2192 Advanced', 'Use Case: SaaS, Agencies, Affiliate Funnels'], 'what_it_does': 'This system uses AI chatbots to automatically handle customer conversations, qualify leads, answer objections, and guide users through a sales funnel without human involvement.'}");
    record0.set("systemArchitectureImage", "https://horizons-cdn.hostinger.com/c23c9050-cfff-41bf-82a4-af121e0b4678/c6ffd1d0693fb65bac5f1ccd0b285810.png");
    record0.set("systemArchitectureDescription", "Each layer works together to convert traffic into customers through intelligent AI-driven conversations.");
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