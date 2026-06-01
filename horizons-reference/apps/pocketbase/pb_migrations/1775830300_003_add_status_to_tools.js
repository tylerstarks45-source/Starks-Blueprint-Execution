/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("tools");

  const existing = collection.fields.getByName("status");
  if (existing) {
    if (existing.type === "select") {
      return; // field already exists with correct type, skip
    }
    collection.fields.removeByName("status"); // exists with wrong type, remove first
  }

  collection.fields.add(new SelectField({
    name: "status",
    required: false,
    values: ["ACTIVE", "INACTIVE"]
  }));

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("tools");
  collection.fields.removeByName("status");
  return app.save(collection);
})