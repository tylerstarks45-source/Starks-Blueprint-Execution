/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("tools");

  const existing = collection.fields.getByName("big_outcome");
  if (existing) {
    if (existing.type === "text") {
      return; // field already exists with correct type, skip
    }
    collection.fields.removeByName("big_outcome"); // exists with wrong type, remove first
  }

  collection.fields.add(new TextField({
    name: "big_outcome",
    required: false
  }));

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("tools");
  collection.fields.removeByName("big_outcome");
  return app.save(collection);
})