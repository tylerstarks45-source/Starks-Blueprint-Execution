/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("tools");

  const existing = collection.fields.getByName("core_problem");
  if (existing) {
    if (existing.type === "text") {
      return; // field already exists with correct type, skip
    }
    collection.fields.removeByName("core_problem"); // exists with wrong type, remove first
  }

  collection.fields.add(new TextField({
    name: "core_problem",
    required: false
  }));

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("tools");
  collection.fields.removeByName("core_problem");
  return app.save(collection);
})