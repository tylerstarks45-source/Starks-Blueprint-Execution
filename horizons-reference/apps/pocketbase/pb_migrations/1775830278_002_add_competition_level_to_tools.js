/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("tools");

  const existing = collection.fields.getByName("competition_level");
  if (existing) {
    if (existing.type === "select") {
      return; // field already exists with correct type, skip
    }
    collection.fields.removeByName("competition_level"); // exists with wrong type, remove first
  }

  collection.fields.add(new SelectField({
    name: "competition_level",
    required: false,
    values: ["Low", "Medium", "High"]
  }));

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("tools");
  collection.fields.removeByName("competition_level");
  return app.save(collection);
})