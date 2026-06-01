/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("tools");

  const existing = collection.fields.getByName("transformation");
  if (existing) {
    if (existing.type === "text") {
      return; // field already exists with correct type, skip
    }
    collection.fields.removeByName("transformation"); // exists with wrong type, remove first
  }

  collection.fields.add(new TextField({
    name: "transformation",
    required: false
  }));

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("tools");
  collection.fields.removeByName("transformation");
  return app.save(collection);
})