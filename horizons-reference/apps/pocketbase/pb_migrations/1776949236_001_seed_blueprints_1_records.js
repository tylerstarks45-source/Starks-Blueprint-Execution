/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("blueprints");

  const record0 = new Record(collection);
    record0.set("name", "AI Agency System");
    record0.set("description", "A complete system for building and scaling an AI-powered agency business. This blueprint includes everything you need to set up client acquisition, service delivery, and scaling strategies using AI tools and automation.");
    record0.set("system_name", "AI Agency System");
    record0.set("system_details", "{'overview': 'Build a profitable AI agency from scratch', 'modules': ['Client Acquisition', 'Service Delivery', 'Team Management', 'Scaling Strategies'], 'tools_required': ['AI Writing Tools', 'Automation Platforms', 'CRM Systems', 'Project Management'], 'estimated_setup_time': '2-4 weeks'}");
    record0.set("systemArchitectureDescription", "The AI Agency System architecture includes client intake, AI-powered service delivery, quality assurance, and scaling mechanisms.");
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