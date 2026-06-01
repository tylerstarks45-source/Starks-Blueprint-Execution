/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("blueprints");

  const existing = collection.fields.getByName("goal_tags");
  if (existing) {
    if (existing.type === "select") {
      return; // field already exists with correct type, skip
    }
    collection.fields.removeByName("goal_tags"); // exists with wrong type, remove first
  }

  collection.fields.add(new SelectField({
    name: "goal_tags",
    required: false,
    values: ["Make Money with AI", "Grow Social Media", "Generate Leads", "Start Online Business", "Build Automation Systems"],
    maxSelect: 5
  }));

  return app.save(collection);
}, (app) => {
  try {
    const collection = app.findCollectionByNameOrId("blueprints");
    collection.fields.removeByName("goal_tags");
    return app.save(collection);
  } catch (e) {
    if (e.message.includes("no rows in result set")) {
      console.log("Collection not found, skipping revert");
      return;
    }
    throw e;
  }
})