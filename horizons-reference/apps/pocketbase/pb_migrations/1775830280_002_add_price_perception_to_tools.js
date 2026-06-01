/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("tools");

  const existing = collection.fields.getByName("price_perception");
  if (existing) {
    if (existing.type === "select") {
      return; // field already exists with correct type, skip
    }
    collection.fields.removeByName("price_perception"); // exists with wrong type, remove first
  }

  collection.fields.add(new SelectField({
    name: "price_perception",
    required: false,
    values: ["Low", "Mid", "Premium"]
  }));

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("tools");
  collection.fields.removeByName("price_perception");
  return app.save(collection);
})