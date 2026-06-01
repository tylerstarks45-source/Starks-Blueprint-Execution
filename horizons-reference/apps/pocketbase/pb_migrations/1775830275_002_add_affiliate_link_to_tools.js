/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("tools");

  const existing = collection.fields.getByName("affiliate_link");
  if (existing) {
    if (existing.type === "text") {
      return; // field already exists with correct type, skip
    }
    collection.fields.removeByName("affiliate_link"); // exists with wrong type, remove first
  }

  collection.fields.add(new TextField({
    name: "affiliate_link",
    required: false
  }));

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("tools");
  collection.fields.removeByName("affiliate_link");
  return app.save(collection);
})