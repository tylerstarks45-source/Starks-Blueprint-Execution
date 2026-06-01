/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("blueprints");

  const existing = collection.fields.getByName("difficulty_level");
  if (existing) {
    if (existing.type === "select") {
      return; // field already exists with correct type, skip
    }
    collection.fields.removeByName("difficulty_level"); // exists with wrong type, remove first
  }

  collection.fields.add(new SelectField({
    name: "difficulty_level",
    required: false,
    values: ["beginner", "intermediate", "advanced"],
    maxSelect: 1
  }));

  return app.save(collection);
}, (app) => {
  try {
    const collection = app.findCollectionByNameOrId("blueprints");
    collection.fields.removeByName("difficulty_level");
    return app.save(collection);
  } catch (e) {
    if (e.message.includes("no rows in result set")) {
      console.log("Collection not found, skipping revert");
      return;
    }
    throw e;
  }
})