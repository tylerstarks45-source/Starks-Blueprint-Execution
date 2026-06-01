/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("blueprints");

  const record0 = new Record(collection);
    record0.set("name", "AI Affiliate Content Engine");
    record0.set("description", "A complete system for creating and distributing AI-powered affiliate content");
    record0.set("system_name", "AI Affiliate Content Engine");
    record0.set("slug", "ai-affiliate-content-engine");
    record0.set("goal_tags", ["Make Money with AI"]);
    record0.set("difficulty_level", "intermediate");
    record0.set("setup_time", "2-3 weeks");
    record0.set("expected_outcome", "Automated affiliate content generation and distribution system");
    record0.set("system_details", "{}");
    record0.set("setup_steps", []);
    record0.set("tools_required", []);
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