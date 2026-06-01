/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collection = app.findCollectionByNameOrId("ai_feed_posts");

  const existing = collection.fields.getByName("post_type");
  if (existing) {
    if (existing.type === "select") {
      return; // field already exists with correct type, skip
    }
    collection.fields.removeByName("post_type"); // exists with wrong type, remove first
  }

  collection.fields.add(new SelectField({
    name: "post_type",
    required: true,
    values: ["system_drop", "tool_drop", "update", "insight"]
  }));

  return app.save(collection);
}, (app) => {
  const collection = app.findCollectionByNameOrId("ai_feed_posts");
  collection.fields.removeByName("post_type");
  return app.save(collection);
})