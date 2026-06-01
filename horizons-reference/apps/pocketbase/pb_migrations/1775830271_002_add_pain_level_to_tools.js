/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("tools");

  const existing = collection.fields.getByName("pain_level");
  if (existing) {
    if (existing.type === "number") {
      return; // field already exists with correct type, skip
    }
    collection.fields.removeByName("pain_level"); // exists with wrong type, remove first
  }

  collection.fields.add(new NumberField({
    name: "pain_level",
    required: false,
    min: 1,
    max: 10
  }));

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("tools");
  collection.fields.removeByName("pain_level");
  return app.save(collection);
})