/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("ai_feed_posts");

  const existing = collection.fields.getByName("views_count");
  if (existing) {
    if (existing.type === "number") {
      return; // field already exists with correct type, skip
    }
    collection.fields.removeByName("views_count"); // exists with wrong type, remove first
  }

  collection.fields.add(new NumberField({
    name: "views_count",
    required: false
  }));

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("ai_feed_posts");
  collection.fields.removeByName("views_count");
  return app.save(collection);
})