/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("ai_feed_posts");

  const existing = collection.fields.getByName("poll_options");
  if (existing) {
    if (existing.type === "json") {
      return; // field already exists with correct type, skip
    }
    collection.fields.removeByName("poll_options"); // exists with wrong type, remove first
  }

  collection.fields.add(new JSONField({
    name: "poll_options",
    required: false
  }));

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("ai_feed_posts");
  collection.fields.removeByName("poll_options");
  return app.save(collection);
})