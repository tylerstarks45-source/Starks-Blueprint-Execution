/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("blueprints");

  const existing = collection.fields.getByName("systemArchitectureImage");
  if (existing) {
    if (existing.type === "text") {
      return; // field already exists with correct type, skip
    }
    collection.fields.removeByName("systemArchitectureImage"); // exists with wrong type, remove first
  }

  collection.fields.add(new TextField({
    name: "systemArchitectureImage",
    required: false
  }));

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("blueprints");
  collection.fields.removeByName("systemArchitectureImage");
  return app.save(collection);
})