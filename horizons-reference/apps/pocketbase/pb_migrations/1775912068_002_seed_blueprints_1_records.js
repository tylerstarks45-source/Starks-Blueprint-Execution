/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("blueprints");

  const record0 = new Record(collection);
    record0.set("name", "AI Affiliate Content Engine");
    record0.set("description", "A fully automated system designed to generate traffic and affiliate revenue using AI-generated content and short-form video.");
    record0.set("system_name", "AI Affiliate Content Engine");
    record0.set("required_tools", []);
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