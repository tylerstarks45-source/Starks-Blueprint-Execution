/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("ai_feed_posts");

  const existing = collection.fields.getByName("secondary_cta_text");
  if (existing) {
    if (existing.type === "text") {
      return; // field already exists with correct type, skip
    }
    collection.fields.removeByName("secondary_cta_text"); // exists with wrong type, remove first
  }

  collection.fields.add(new TextField({
    name: "secondary_cta_text",
    required: false
  }));

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("ai_feed_posts");
  collection.fields.removeByName("secondary_cta_text");
  return app.save(collection);
})