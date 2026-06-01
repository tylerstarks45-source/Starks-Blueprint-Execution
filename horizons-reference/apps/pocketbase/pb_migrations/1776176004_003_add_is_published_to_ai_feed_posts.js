/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("ai_feed_posts");

  const existing = collection.fields.getByName("is_published");
  if (existing) {
    if (existing.type === "bool") {
      return; // field already exists with correct type, skip
    }
    collection.fields.removeByName("is_published"); // exists with wrong type, remove first
  }

  collection.fields.add(new BoolField({
    name: "is_published",
    required: false
  }));

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("ai_feed_posts");
  collection.fields.removeByName("is_published");
  return app.save(collection);
})