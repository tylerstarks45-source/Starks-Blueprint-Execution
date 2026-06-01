/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("tools");

  const existing = collection.fields.getByName("offer_type");
  if (existing) {
    if (existing.type === "select") {
      return; // field already exists with correct type, skip
    }
    collection.fields.removeByName("offer_type"); // exists with wrong type, remove first
  }

  collection.fields.add(new SelectField({
    name: "offer_type",
    required: false,
    values: ["Software", "Course"]
  }));

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("tools");
  collection.fields.removeByName("offer_type");
  return app.save(collection);
})