/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("blueprints");

  const existing = collection.fields.getByName("system_details");
  if (existing) {
    if (existing.type === "json") {
      return; // field already exists with correct type, skip
    }
    collection.fields.removeByName("system_details"); // exists with wrong type, remove first
  }

  collection.fields.add(new JSONField({
    name: "system_details",
    required: false
  }));

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("blueprints");
  collection.fields.removeByName("system_details");
  return app.save(collection);
})