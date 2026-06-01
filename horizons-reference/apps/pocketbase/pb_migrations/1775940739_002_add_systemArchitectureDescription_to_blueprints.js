/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("blueprints");

  const existing = collection.fields.getByName("systemArchitectureDescription");
  if (existing) {
    if (existing.type === "text") {
      return; // field already exists with correct type, skip
    }
    collection.fields.removeByName("systemArchitectureDescription"); // exists with wrong type, remove first
  }

  collection.fields.add(new TextField({
    name: "systemArchitectureDescription",
    required: false
  }));

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("blueprints");
  collection.fields.removeByName("systemArchitectureDescription");
  return app.save(collection);
})